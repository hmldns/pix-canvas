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
    
    const graphics = new PIXI.Graphics();
    
    // Draw a simple grid pattern
    graphics.lineStyle(1, 0xe5e7eb, 0.5); // Light gray lines
    
    const gridSize = 20; // 20 pixel grid
    const canvasWidth = 5000;
    const canvasHeight = 5000;
    
    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, canvasHeight);
    }
    
    // Horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(canvasWidth, y);
    }
    
    gridContainer.addChild(graphics);
    container.addChild(gridContainer);
    
    // Position grid at center of viewport initially
    container.x = -canvasWidth / 2 + this.app.screen.width / 2;
    container.y = -canvasHeight / 2 + this.app.screen.height / 2;
    
    console.log('✅ Background grid created');
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

    // Basic zoom controls (mouse wheel)
    this.app.view.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      
      const canvasContainer = this.app.stage.getChildByName('canvas-container');
      if (!canvasContainer) return;

      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, canvasContainer.scale.x * zoomFactor));
      
      canvasContainer.scale.set(newScale);
      
      console.log(`🔍 Zoom: ${Math.round(newScale * 100)}%`);
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