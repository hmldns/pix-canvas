import * as PIXI from 'pixi.js';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { WebSocketService } from '../../services/websocket';
import { webRTCService } from '../../services/webrtc';
import { isValidCanvasCoordinate, isValidHexColor } from '@libs/utils';

export interface InputControllerConfig {
  selectedColor: string;
  userColor?: string; // User's assigned color for cursor sharing
  gridSize: number;
  enableDrawing: boolean;
  enablePanning: boolean;
  enableZooming: boolean;
  enableCursorSharing: boolean;
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

  // Cursor sharing state
  private lastCursorPosition = { x: 0, y: 0 };
  private hasValidCursorPosition = false;

  // Touch/pinch zoom state
  private activeTouches = new Map<number, { x: number; y: number }>();
  private lastPinchDistance = 0;
  private lastPinchCenter = { x: 0, y: 0 };
  private isPinching = false;

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
      enableCursorSharing: true,
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

    // Touch events for mobile pinch zoom
    if (this.config.enableZooming) {
      canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
      canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    }

    // Keyboard events for mode switching
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Window focus/blur events for cursor sharing
    if (this.config.enableCursorSharing) {
      window.addEventListener('focus', this.handleWindowFocus.bind(this));
      window.addEventListener('blur', this.handleWindowBlur.bind(this));
    }

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

    // Share cursor position via WebRTC if enabled
    if (this.config.enableCursorSharing) {
      this.shareCursorPosition(globalPos.x, globalPos.y);
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

    // Get mouse position relative to the canvas
    const mousePos = { x: event.offsetX, y: event.offsetY };

    // Calculate zoom
    const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05; // Smoother zoom
    const currentScale = canvasContainer.scale.x;
    // Min zoom: 4px per pixel coordinate, Max zoom: 100px per pixel coordinate
    const minScale = 0.25;  // Maximum zoom out (pixels appear as 4px squares)
    const maxScale = 100; // Maximum zoom in (pixels appear as 100px squares)
    const newScale = Math.max(minScale, Math.min(maxScale, currentScale * zoomFactor));

    if (newScale !== currentScale) {
      // Calculate world position before zoom
      const worldPosBeforeZoom = {
        x: (mousePos.x - canvasContainer.x) / currentScale,
        y: (mousePos.y - canvasContainer.y) / currentScale
      };
      
      // Apply new scale
      canvasContainer.scale.set(newScale);
      
      // Calculate new position to keep the mouse point stable
      canvasContainer.x = mousePos.x - worldPosBeforeZoom.x * newScale;
      canvasContainer.y = mousePos.y - worldPosBeforeZoom.y * newScale;

      // Update grid for new scale
      this.renderer.updateGrid(newScale);

      // Notify callbacks
      this.callbacks.onViewportChange?.(
        newScale,
        canvasContainer.x,
        canvasContainer.y
      );

      console.log(`🔍 Zoom: ${newScale.toFixed(1)}x (${newScale.toFixed(1)}px per pixel)`);
    }
  }

  /**
   * Handle touch start for mobile pinch zoom
   */
  private handleTouchStart(event: TouchEvent): void {
    // Update active touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY
      });
    }

    // If we have exactly 2 touches, start pinch zoom
    if (this.activeTouches.size === 2) {
      event.preventDefault(); // Prevent default pinch behavior
      
      const touches = Array.from(this.activeTouches.values());
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      // Calculate initial pinch distance and center
      this.lastPinchDistance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
      );
      this.lastPinchCenter = {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2
      };
      
      this.isPinching = true;
      console.log('📱 Pinch zoom started');
    }
  }

  /**
   * Handle touch move for mobile pinch zoom
   */
  private handleTouchMove(event: TouchEvent): void {
    // Update active touches
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.activeTouches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY
      });
    }

    // Handle pinch zoom with exactly 2 touches
    if (this.activeTouches.size === 2 && this.isPinching && this.lastPinchDistance > 0) {
      event.preventDefault(); // Prevent default pinch behavior
      
      const touches = Array.from(this.activeTouches.values());
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      // Calculate current pinch distance and center
      const currentDistance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
      );
      const currentCenter = {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2
      };
      
      // Calculate scale factor based on distance change (simple approach)
      const scaleFactor = currentDistance / this.lastPinchDistance;
      
      // Only proceed if scale factor is reasonable (avoid extreme jumps)
      if (scaleFactor > 0.5 && scaleFactor < 2.0) {
        this.handlePinchZoom(scaleFactor, currentCenter);
      }
      
      // Update tracking values
      this.lastPinchDistance = currentDistance;
      this.lastPinchCenter = currentCenter;
    }
  }

  /**
   * Handle touch end/cancel for mobile pinch zoom
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Remove ended touches
    const currentTouchIds = new Set();
    for (let i = 0; i < event.touches.length; i++) {
      currentTouchIds.add(event.touches[i].identifier);
    }
    
    // Remove touches that are no longer active
    for (const touchId of this.activeTouches.keys()) {
      if (!currentTouchIds.has(touchId)) {
        this.activeTouches.delete(touchId);
      }
    }
    
    // Reset pinch state if we don't have 2 touches anymore
    if (this.activeTouches.size < 2) {
      this.lastPinchDistance = 0;
      this.isPinching = false;
      console.log('📱 Pinch zoom ended');
    }
  }

  /**
   * Handle pinch zoom with scale factor and center point
   */
  private handlePinchZoom(scaleFactor: number, centerPoint: { x: number; y: number }): void {
    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return;

    const currentScale = canvasContainer.scale.x;
    const minScale = 0.25;  // Maximum zoom out
    const maxScale = 100;   // Maximum zoom in
    
    // Calculate new scale (simple multiplication)
    const newScale = Math.max(minScale, Math.min(maxScale, currentScale * scaleFactor));

    if (newScale !== currentScale) {
      // Get canvas element bounds for proper coordinate conversion
      const canvas = this.renderer.application.view as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      
      // Convert center point to canvas coordinates
      const canvasCenter = {
        x: centerPoint.x - rect.left,
        y: centerPoint.y - rect.top
      };
      
      // Calculate world position before zoom
      const worldPosBeforeZoom = {
        x: (canvasCenter.x - canvasContainer.x) / currentScale,
        y: (canvasCenter.y - canvasContainer.y) / currentScale
      };
      
      // Apply new scale
      canvasContainer.scale.set(newScale);
      
      // Calculate new position to keep the center point stable
      canvasContainer.x = canvasCenter.x - worldPosBeforeZoom.x * newScale;
      canvasContainer.y = canvasCenter.y - worldPosBeforeZoom.y * newScale;

      // Update grid for new scale
      this.renderer.updateGrid(newScale);

      // Notify callbacks
      this.callbacks.onViewportChange?.(
        newScale,
        canvasContainer.x,
        canvasContainer.y
      );
    }
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
      case 'KeyR':
        // Reset view to center and default zoom
        this.resetView();
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
   * Share cursor position with other peers via WebRTC
   */
  private shareCursorPosition(screenX: number, screenY: number): void {
    try {
      // Convert screen coordinates to canvas coordinates for sharing
      const canvasCoords = this.screenToCanvasCoordinates(screenX, screenY);
      
      if (!canvasCoords) {
        return; // Invalid coordinates, skip sharing
      }

      // Only share if coordinates are within valid canvas bounds
      if (!isValidCanvasCoordinate(canvasCoords.x, canvasCoords.y)) {
        return; // Outside valid canvas area, skip sharing
      }

      // Store last valid cursor position
      this.lastCursorPosition = { x: canvasCoords.x, y: canvasCoords.y };
      this.hasValidCursorPosition = true;

      // Send cursor position via WebRTC (throttled automatically by data channel)
      webRTCService.sendCursorUpdate(canvasCoords.x, canvasCoords.y, this.config.userColor);

    } catch (error) {
      console.error('❌ Error sharing cursor position:', error);
    }
  }

  /**
   * Check if space key is currently pressed
   */
  private isSpacePressed(): boolean {
    // Simple space key tracking (could be enhanced with proper key state tracking)
    return false; // For now, simplified
  }

  /**
   * Reset view to center and default zoom
   */
  public resetView(): void {
    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return;

    const app = this.renderer.application;
    
    // Reset scale to default (30px per pixel)
    const defaultScale = 30;
    canvasContainer.scale.set(defaultScale);
    
    // Center the view at the center of valid canvas (2500, 2500)
    const canvasCenterX = 2500;
    const canvasCenterY = 2500;
    canvasContainer.x = app.screen.width / 2 - canvasCenterX * defaultScale;
    canvasContainer.y = app.screen.height / 2 - canvasCenterY * defaultScale;
    
    console.log('🎯 View reset to center with default zoom');
    
    // Notify callbacks
    this.callbacks.onViewportChange?.(
      defaultScale,
      canvasContainer.x,
      canvasContainer.y
    );
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
   * Set user color for cursor sharing
   */
  public setUserColor(color: string): void {
    if (isValidHexColor(color)) {
      this.config.userColor = color;
      console.log(`👤 User color set to: ${color}`);
    } else {
      console.warn(`⚠️ Invalid user color format: ${color}`);
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
   * Handle window focus event - re-send last cursor position
   */
  private handleWindowFocus(): void {
    if (this.hasValidCursorPosition && this.config.enableCursorSharing) {
      // Re-send the last known cursor position when window regains focus
      webRTCService.sendCursorUpdate(this.lastCursorPosition.x, this.lastCursorPosition.y, this.config.userColor);
      console.log('🔄 Re-sent cursor position on window focus:', this.lastCursorPosition);
    }
  }

  /**
   * Handle window blur event - cursors will naturally fade out on other clients
   */
  private handleWindowBlur(): void {
    // When window loses focus, cursors will naturally fade out after maxCursorAge
    // We don't need to explicitly send a "hide cursor" message
    console.log('👁️ Window lost focus, cursor will fade on other clients');
  }

  /**
   * Destroy the input controller
   */
  public destroy(): void {
    const canvas = this.renderer.application.view as HTMLCanvasElement;
    
    // Remove event listeners
    canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    
    // Remove touch event listeners
    canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
    
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Remove window focus/blur listeners if cursor sharing was enabled
    if (this.config.enableCursorSharing) {
      window.removeEventListener('focus', this.handleWindowFocus.bind(this));
      window.removeEventListener('blur', this.handleWindowBlur.bind(this));
    }

    // Clear active touches
    this.activeTouches.clear();

    // Remove PixiJS event listeners
    this.renderer.stage.removeAllListeners();

    console.log('✅ Input controller destroyed');
  }
}