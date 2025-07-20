import * as PIXI from 'pixi.js';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { WebSocketService } from '../../services/websocket';
import { isValidCanvasCoordinate, isValidHexColor } from '@libs/utils';

export interface InputControllerConfig {
  selectedColor: string;
  gridSize: number;
  enableDrawing: boolean;
  enablePanning: boolean;
  enableZooming: boolean;
}

export interface InputControllerCallbacks {
  onPixelDraw?: (x: number, y: number, color: string) => void;
  onViewportChange?: (zoom: number, panX: number, panY: number) => void;
  onError?: (error: string) => void;
}

export class InputController {
  private renderer: CanvasRenderer;
  private webSocketService: WebSocketService;
  private config: InputControllerConfig;
  private callbacks: InputControllerCallbacks;

  // Panning state
  private isPanning = false;
  private lastPanPosition = { x: 0, y: 0 };
  private panStartPosition = { x: 0, y: 0 };

  // Drawing state
  private isDrawingMode = false;
  private lastDrawnPixel = { x: -1, y: -1 };

  constructor(
    renderer: CanvasRenderer,
    webSocketService: WebSocketService,
    config: Partial<InputControllerConfig> = {},
    callbacks: InputControllerCallbacks = {}
  ) {
    this.renderer = renderer;
    this.webSocketService = webSocketService;
    
    this.config = {
      selectedColor: '#FF0000',
      gridSize: 1,
      enableDrawing: true,
      enablePanning: true,
      enableZooming: true,
      ...config,
    };
    
    this.callbacks = callbacks;

    this.setupEventListeners();
    console.log('✅ Input controller initialized');
  }

  /**
   * Setup all input event listeners
   */
  private setupEventListeners(): void {
    const stage = this.renderer.stage;
    const canvas = this.renderer.application.view as HTMLCanvasElement;

    // Mouse/pointer events for drawing and panning
    stage.on('pointerdown', this.handlePointerDown.bind(this));
    stage.on('pointermove', this.handlePointerMove.bind(this));
    stage.on('pointerup', this.handlePointerUp.bind(this));
    stage.on('pointerupoutside', this.handlePointerUp.bind(this));

    // Mouse wheel for zooming
    if (this.config.enableZooming) {
      canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }

    // Keyboard events for mode switching
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    console.log('✅ Input event listeners setup complete');
  }

  /**
   * Handle pointer down (mouse/touch start)
   */
  private handlePointerDown(event: PIXI.FederatedPointerEvent): void {
    const globalPos = event.global;
    
    // Check if we should start panning (right click or space+click)
    if (event.button === 2 || this.isSpacePressed()) {
      this.startPanning(globalPos.x, globalPos.y);
      return;
    }

    // Check if we should draw (left click and drawing enabled)
    if (event.button === 0 && this.config.enableDrawing) {
      this.handleDrawAttempt(event);
    }
  }

  /**
   * Handle pointer move (mouse/touch move)
   */
  private handlePointerMove(event: PIXI.FederatedPointerEvent): void {
    const globalPos = event.global;

    if (this.isPanning && this.config.enablePanning) {
      this.updatePanning(globalPos.x, globalPos.y);
    }
  }

  /**
   * Handle pointer up (mouse/touch end)
   */
  private handlePointerUp(event: PIXI.FederatedPointerEvent): void {
    if (this.isPanning) {
      this.stopPanning();
    }

    this.isDrawingMode = false;
    this.lastDrawnPixel = { x: -1, y: -1 };
    this.renderer.stage.cursor = 'default';
  }

  /**
   * Handle mouse wheel for zooming
   */
  private handleWheel(event: WheelEvent): void {
    if (!this.config.enableZooming) return;

    event.preventDefault();

    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return;

    // Calculate zoom
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const currentScale = canvasContainer.scale.x;
    const newScale = Math.max(0.1, Math.min(10, currentScale * zoomFactor));

    // Apply zoom
    canvasContainer.scale.set(newScale);

    // Notify callbacks
    this.callbacks.onViewportChange?.(
      newScale,
      canvasContainer.x,
      canvasContainer.y
    );

    console.log(`🔍 Zoom changed to ${Math.round(newScale * 100)}%`);
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.renderer.stage.cursor = 'grab';
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        if (!this.isPanning) {
          this.renderer.stage.cursor = 'default';
        }
        break;
    }
  }

  /**
   * Start panning mode
   */
  private startPanning(x: number, y: number): void {
    this.isPanning = true;
    this.lastPanPosition = { x, y };
    this.panStartPosition = { x, y };
    this.renderer.stage.cursor = 'grabbing';
  }

  /**
   * Update panning position
   */
  private updatePanning(x: number, y: number): void {
    const deltaX = x - this.lastPanPosition.x;
    const deltaY = y - this.lastPanPosition.y;

    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return;

    canvasContainer.x += deltaX;
    canvasContainer.y += deltaY;

    this.lastPanPosition = { x, y };

    // Notify callbacks
    this.callbacks.onViewportChange?.(
      canvasContainer.scale.x,
      canvasContainer.x,
      canvasContainer.y
    );
  }

  /**
   * Stop panning mode
   */
  private stopPanning(): void {
    this.isPanning = false;
    this.renderer.stage.cursor = this.isSpacePressed() ? 'grab' : 'default';
  }

  /**
   * Handle drawing attempt
   */
  private handleDrawAttempt(event: PIXI.FederatedPointerEvent): void {
    try {
      // Convert screen coordinates to canvas coordinates
      const canvasCoords = this.screenToCanvasCoordinates(event.global.x, event.global.y);
      
      if (!canvasCoords) {
        this.callbacks.onError?.('Invalid coordinates for drawing');
        return;
      }

      const { x, y } = canvasCoords;

      // Validate coordinates
      if (!isValidCanvasCoordinate(x, y)) {
        this.callbacks.onError?.(`Coordinates (${x}, ${y}) are outside canvas bounds`);
        return;
      }

      // Validate color
      if (!isValidHexColor(this.config.selectedColor)) {
        this.callbacks.onError?.(`Invalid color: ${this.config.selectedColor}`);
        return;
      }

      // Prevent drawing the same pixel repeatedly
      if (this.lastDrawnPixel.x === x && this.lastDrawnPixel.y === y) {
        return;
      }

      // Send drawing command via WebSocket
      const success = this.webSocketService.drawPixel(x, y, this.config.selectedColor);
      
      if (success) {
        this.lastDrawnPixel = { x, y };
        this.callbacks.onPixelDraw?.(x, y, this.config.selectedColor);
        console.log(`🎨 Drew pixel at (${x}, ${y}) with color ${this.config.selectedColor}`);
      } else {
        this.callbacks.onError?.('Failed to send draw command');
      }

    } catch (error) {
      console.error('❌ Error handling draw attempt:', error);
      this.callbacks.onError?.('Failed to process drawing input');
    }
  }

  /**
   * Convert screen coordinates to canvas grid coordinates
   */
  private screenToCanvasCoordinates(screenX: number, screenY: number): { x: number; y: number } | null {
    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return null;

    // Convert screen coordinates to canvas coordinates
    const localPoint = canvasContainer.toLocal({ x: screenX, y: screenY });
    
    // Convert to grid coordinates (floor to get the pixel grid position)
    const gridX = Math.floor(localPoint.x / this.config.gridSize);
    const gridY = Math.floor(localPoint.y / this.config.gridSize);

    return { x: gridX, y: gridY };
  }

  /**
   * Check if space key is currently pressed
   */
  private isSpacePressed(): boolean {
    // Simple space key tracking (could be enhanced with proper key state tracking)
    return false; // For now, simplified
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<InputControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Input controller config updated:', newConfig);
  }

  /**
   * Set selected color for drawing
   */
  public setSelectedColor(color: string): void {
    if (isValidHexColor(color)) {
      this.config.selectedColor = color;
      console.log(`🎨 Selected color changed to: ${color}`);
    } else {
      console.warn(`⚠️ Invalid color format: ${color}`);
    }
  }

  /**
   * Enable or disable drawing mode
   */
  public setDrawingEnabled(enabled: boolean): void {
    this.config.enableDrawing = enabled;
    console.log(`✏️ Drawing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current configuration
   */
  public getConfig(): InputControllerConfig {
    return { ...this.config };
  }

  /**
   * Get current viewport state
   */
  public getViewportState(): { zoom: number; panX: number; panY: number } {
    const canvasContainer = this.renderer.canvasContainer;
    
    return {
      zoom: canvasContainer?.scale.x || 1,
      panX: canvasContainer?.x || 0,
      panY: canvasContainer?.y || 0,
    };
  }

  /**
   * Destroy the input controller
   */
  public destroy(): void {
    const canvas = this.renderer.application.view as HTMLCanvasElement;
    
    // Remove event listeners
    canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));

    // Remove PixiJS event listeners
    this.renderer.stage.removeAllListeners();

    console.log('✅ Input controller destroyed');
  }
}