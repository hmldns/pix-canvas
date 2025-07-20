import * as PIXI from 'pixi.js';
import { Grid } from './Grid';
import { PixelEffectManager } from '../animation/effects';
import { PixelSoundManager } from '../audio/sounds';

export interface CanvasRendererConfig {
  width: number;
  height: number;
  backgroundColor: number;
  antialias: boolean;
}

export class CanvasRenderer {
  private app: PIXI.Application;
  private viewport: HTMLElement | null = null;
  private isInitialized = false;
  private grid: Grid | null = null;
  private _effectManager: PixelEffectManager | null = null;
  private _soundManager: PixelSoundManager | null = null;

  constructor(config: Partial<CanvasRendererConfig> = {}) {
    const defaultConfig: CanvasRendererConfig = {
      width: 5000,
      height: 5000,
      backgroundColor: 0xf8fafc, // Light gray background
      antialias: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Initialize PixiJS Application
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: finalConfig.backgroundColor,
      antialias: finalConfig.antialias,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.setupApplication();
    console.log('✅ PixiJS Canvas Renderer initialized');
  }

  private setupApplication(): void {
    // Enable interaction
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Create the main container for the pixel canvas
    const canvasContainer = new PIXI.Container();
    canvasContainer.name = 'canvas-container';
    this.app.stage.addChild(canvasContainer);

    // Initialize the grid system
    this.initializeGrid(canvasContainer);

    // Initialize the effect manager
    this.initializeEffects(canvasContainer);

    // Initialize the sound manager
    this.initializeSounds();

    // Basic zoom and pan setup (very simple for now)
    this.setupViewportControls();
  }

  /**
   * Initialize the grid system using the dedicated Grid class
   */
  private initializeGrid(container: PIXI.Container): void {
    // Create grid instance
    this.grid = new Grid(container);
    
    // Set initial scale so 1 pixel coordinate = ~30 screen pixels
    const initialScale = 30;
    container.scale.set(initialScale);
    
    // Update grid for initial scale
    this.grid.update(initialScale);
    
    // Position so the center of valid canvas (2500, 2500) is at viewport center
    const canvasCenterX = 2500;
    const canvasCenterY = 2500;
    container.x = this.app.screen.width / 2 - canvasCenterX * initialScale;
    container.y = this.app.screen.height / 2 - canvasCenterY * initialScale;
    
    console.log('✅ Grid system initialized with Level-of-Detail rendering');
  }

  /**
   * Initialize the pixel effect system
   */
  private initializeEffects(container: PIXI.Container): void {
    this._effectManager = new PixelEffectManager(container);
    console.log('✅ Pixel effect system initialized');
  }

  /**
   * Initialize the sound effect system
   */
  private initializeSounds(): void {
    this._soundManager = new PixelSoundManager();
    console.log('✅ Pixel sound system initialized');
  }

  /**
   * Update grid based on current zoom level (delegates to Grid class)
   */
  public updateGrid(scale: number): void {
    if (this.grid) {
      this.grid.update(scale);
    }
  }

  private setupViewportControls(): void {
    let isDragging = false;
    let lastPosition = { x: 0, y: 0 };

    // Mouse/touch pan controls
    this.app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      isDragging = true;
      lastPosition.x = event.global.x;
      lastPosition.y = event.global.y;
      this.app.stage.cursor = 'grabbing';
    });

    this.app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
      if (isDragging) {
        const deltaX = event.global.x - lastPosition.x;
        const deltaY = event.global.y - lastPosition.y;
        
        const canvasContainer = this.app.stage.getChildByName('canvas-container');
        if (canvasContainer) {
          canvasContainer.x += deltaX;
          canvasContainer.y += deltaY;
        }
        
        lastPosition.x = event.global.x;
        lastPosition.y = event.global.y;
      }
    });

    this.app.stage.on('pointerup', () => {
      isDragging = false;
      this.app.stage.cursor = 'default';
    });

    this.app.stage.on('pointerupoutside', () => {
      isDragging = false;
      this.app.stage.cursor = 'default';
    });

    // Basic zoom controls (mouse wheel) with proper pivot point
    this.app.view.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      
      const canvasContainer = this.app.stage.getChildByName('canvas-container');
      if (!canvasContainer) return;

      // Get mouse position relative to the canvas
      const mousePos = { x: event.offsetX, y: event.offsetY };
      
      // Calculate zoom
      const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05; // Smoother zoom
      const currentScale = canvasContainer.scale.x;
      // Min zoom: 4px per pixel coordinate, Max zoom: 100px per pixel coordinate
      const minScale = 4;  // Maximum zoom out (pixels appear as 4px squares)
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
        this.updateGrid(newScale);
        
        console.log(`🔍 Zoom: ${newScale.toFixed(1)}x (${newScale.toFixed(1)}px per pixel)`);
      }
    });

    console.log('✅ Basic viewport controls enabled');
  }

  public mount(element: HTMLElement): void {
    if (this.isInitialized) {
      console.warn('⚠️ Canvas already mounted');
      return;
    }

    this.viewport = element;
    element.appendChild(this.app.view as any);
    this.isInitialized = true;
    
    // Handle resize
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log('✅ Canvas mounted to DOM');
  }

  public unmount(): void {
    if (!this.isInitialized || !this.viewport) {
      return;
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
    
    if (this.viewport.contains(this.app.view as any)) {
      this.viewport.removeChild(this.app.view as any);
    }
    
    this.viewport = null;
    this.isInitialized = false;
    
    console.log('✅ Canvas unmounted from DOM');
  }

  private handleResize(): void {
    if (!this.isInitialized) return;

    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    console.log(`📏 Canvas resized to ${window.innerWidth}x${window.innerHeight}`);
  }

  public destroy(): void {
    this.unmount();
    
    // Destroy grid
    if (this.grid) {
      this.grid.destroy();
      this.grid = null;
    }
    
    // Destroy effect manager
    if (this._effectManager) {
      this._effectManager.destroy();
      this._effectManager = null;
    }

    // Destroy sound manager
    if (this._soundManager) {
      this._soundManager.destroy();
      this._soundManager = null;
    }
    
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    console.log('✅ Canvas renderer destroyed');
  }

  // Getters for external access
  public get application(): PIXI.Application {
    return this.app;
  }

  public get stage(): PIXI.Container {
    return this.app.stage;
  }

  public get canvasContainer(): PIXI.Container | null {
    return this.app.stage.getChildByName('canvas-container') as PIXI.Container || null;
  }

  public get isReady(): boolean {
    return this.isInitialized;
  }

  public get gridRenderer(): Grid | null {
    return this.grid;
  }

  /**
   * Update the background color of the renderer
   */
  public updateBackgroundColor(color: number): void {
    this.app.renderer.backgroundColor = color;
    console.log(`🎨 Background color updated to 0x${color.toString(16)}`);
  }

  // Utility methods for pixel manipulation (to be expanded later)
  public addPixel(x: number, y: number, color: number): void {
    const canvasContainer = this.canvasContainer;
    if (!canvasContainer) return;

    const pixel = new PIXI.Graphics();
    pixel.beginFill(color);
    pixel.drawRect(x, y, 1, 1);
    pixel.endFill();
    
    canvasContainer.addChild(pixel);
    
    // Trigger particle effect and sound (default to own pixel for direct addPixel calls)
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
    this.triggerPixelEffect(x, y, colorHex, true);
    this.playPixelSound(colorHex, true);
    
    console.log(`🎨 Added pixel at (${x}, ${y}) with color 0x${color.toString(16)}`);
  }

  public clearCanvas(): void {
    const canvasContainer = this.canvasContainer;
    if (!canvasContainer) return;

    // Remove all children except the grid
    const children = canvasContainer.children.slice();
    children.forEach(child => {
      if (child.name !== 'grid-container') {
        canvasContainer.removeChild(child);
        child.destroy();
      }
    });
    
    console.log('🧹 Canvas cleared');
  }

  /**
   * Trigger a pixel drawing effect at the specified location
   */
  public triggerPixelEffect(x: number, y: number, color: string, isOwnPixel = true): void {
    if (this._effectManager) {
      this._effectManager.createPixelEffect(x, y, color, isOwnPixel);
    }
  }

  /**
   * Update effects (call this in the main render loop)
   */
  public updateEffects(deltaTime: number): void {
    if (this._effectManager) {
      this._effectManager.update(deltaTime);
    }
  }

  /**
   * Get the effect manager instance
   */
  public get effectManager(): PixelEffectManager | null {
    return this._effectManager;
  }

  /**
   * Clear all active effects
   */
  public clearEffects(): void {
    if (this._effectManager) {
      this._effectManager.clearAllEffects();
    }
  }

  /**
   * Play pixel placement sound effect
   */
  public playPixelSound(color?: string, isOwnPixel = true): void {
    if (this._soundManager) {
      this._soundManager.playPixelPlaceSound(color, isOwnPixel);
    }
  }

  /**
   * Resume audio context (call on user interaction)
   */
  public resumeAudio(): void {
    if (this._soundManager) {
      this._soundManager.resumeAudioContext();
    }
  }

  /**
   * Enable/disable sound effects
   */
  public setSoundsEnabled(enabled: boolean): void {
    if (this._soundManager) {
      this._soundManager.setEnabled(enabled);
    }
  }

  /**
   * Set sound volume (0 to 1)
   */
  public setSoundVolume(volume: number): void {
    if (this._soundManager) {
      this._soundManager.setVolume(volume);
    }
  }

  /**
   * Get the sound manager instance
   */
  public get soundManager(): PixelSoundManager | null {
    return this._soundManager;
  }
}