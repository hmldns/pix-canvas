import * as PIXI from 'pixi.js';

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

    // Add a background grid for visual reference
    this.createBackgroundGrid(canvasContainer);

    // Basic zoom and pan setup (very simple for now)
    this.setupViewportControls();
  }

  private createBackgroundGrid(container: PIXI.Container): void {
    const gridContainer = new PIXI.Container();
    gridContainer.name = 'grid-container';
    
    // Create dynamic grid that covers the entire 5000x5000 canvas
    this.updateGrid(gridContainer, 30); // Initial scale
    
    container.addChild(gridContainer);
    
    // Set initial scale so 1 pixel coordinate = ~30 screen pixels
    const initialScale = 30;
    container.scale.set(initialScale);
    
    // Position so the center of valid canvas (2500, 2500) is at viewport center
    const canvasCenterX = 2500;
    const canvasCenterY = 2500;
    container.x = this.app.screen.width / 2 - canvasCenterX * initialScale;
    container.y = this.app.screen.height / 2 - canvasCenterY * initialScale;
    
    console.log('✅ Dynamic Level-of-Detail grid created for 5000x5000 canvas');
  }

  /**
   * Update grid based on current zoom level (Level of Detail)
   * Grid lines at 1, 10, 100, 1000 pixel intervals with different shades
   */
  public updateGrid(gridContainer: PIXI.Container, scale: number): void {
    // Clear existing grid
    gridContainer.removeChildren();
    
    const graphics = new PIXI.Graphics();
    
    // Canvas bounds: 5000x5000 from (0,0) to (4999,4999)
    const canvasSize = 5000;
    const minCoord = 0;
    const maxCoord = canvasSize - 1; // 4999
    
    // Calculate which grid levels to show based on zoom
    const pixelsPerScreenPixel = 1 / scale;
    const shouldShow1px = scale >= 8;   // Show 1px grid when zoomed in enough
    const shouldShow10px = scale >= 2;  // Show 10px grid at medium zoom
    const shouldShow100px = scale >= 0.5; // Show 100px grid at low zoom
    const shouldShow1000px = true;      // Always show 1000px grid
    
    // Define grid colors and line widths (in screen pixels)
    const gridLevels = [
      { interval: 1000, color: 0x6b7280, alpha: 0.8, width: 2 }, // Dark gray
      { interval: 100, color: 0x9ca3af, alpha: 0.6, width: 1.5 }, // Medium gray
      { interval: 10, color: 0xd1d5db, alpha: 0.4, width: 1 },   // Light gray
      { interval: 1, color: 0xe5e7eb, alpha: 0.2, width: 0.5 }   // Very light gray
    ];
    
    // Render grid levels from largest to smallest
    gridLevels.forEach(level => {
      let shouldRender = false;
      
      switch (level.interval) {
        case 1: shouldRender = shouldShow1px; break;
        case 10: shouldRender = shouldShow10px; break;
        case 100: shouldRender = shouldShow100px; break;
        case 1000: shouldRender = shouldShow1000px; break;
      }
      
      if (!shouldRender) return;
      
      // Set line style - width should be constant in screen pixels
      const lineWidth = level.width / scale;
      graphics.lineStyle(lineWidth, level.color, level.alpha);
      
      // Draw vertical lines within valid canvas bounds only
      for (let x = Math.ceil(minCoord / level.interval) * level.interval; x <= maxCoord; x += level.interval) {
        graphics.moveTo(x, minCoord);
        graphics.lineTo(x, maxCoord);
      }
      
      // Draw horizontal lines within valid canvas bounds only
      for (let y = Math.ceil(minCoord / level.interval) * level.interval; y <= maxCoord; y += level.interval) {
        graphics.moveTo(minCoord, y);
        graphics.lineTo(maxCoord, y);
      }
    });
    
    // Add out-of-bounds gray areas (no grid, just gray fill)
    const viewportSize = 10000; // Large enough to cover any reasonable viewport
    
    graphics.beginFill(0xf5f5f5, 0.3); // Light gray, semi-transparent
    
    // Left gray area (x < 0)
    graphics.drawRect(-viewportSize, -viewportSize, viewportSize, viewportSize * 2);
    
    // Right gray area (x >= 5000)
    graphics.drawRect(canvasSize, -viewportSize, viewportSize, viewportSize * 2);
    
    // Top gray area (y < 0)
    graphics.drawRect(minCoord, -viewportSize, canvasSize, viewportSize);
    
    // Bottom gray area (y >= 5000)
    graphics.drawRect(minCoord, canvasSize, canvasSize, viewportSize);
    
    graphics.endFill();
    
    // Add canvas boundary - distinct red border to mark the allowed region
    graphics.lineStyle(3 / scale, 0xff4444, 1.0); // Red border, constant screen width
    graphics.drawRect(minCoord, minCoord, canvasSize, canvasSize);
    
    gridContainer.addChild(graphics);
    
    console.log(`🔄 Grid updated for scale ${scale.toFixed(1)}x - Levels: ${[
      shouldShow1px && '1px',
      shouldShow10px && '10px', 
      shouldShow100px && '100px',
      shouldShow1000px && '1000px'
    ].filter(Boolean).join(', ')} + boundary`);
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
        const gridContainer = canvasContainer.getChildByName('grid-container') as PIXI.Container;
        if (gridContainer) {
          this.updateGrid(gridContainer, newScale);
        }
        
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

  // Utility methods for pixel manipulation (to be expanded later)
  public addPixel(x: number, y: number, color: number): void {
    const canvasContainer = this.canvasContainer;
    if (!canvasContainer) return;

    const pixel = new PIXI.Graphics();
    pixel.beginFill(color);
    pixel.drawRect(x, y, 1, 1);
    pixel.endFill();
    
    canvasContainer.addChild(pixel);
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
}