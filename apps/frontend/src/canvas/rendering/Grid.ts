import * as PIXI from 'pixi.js';

/**
 * Grid Renderer - Level-of-Detail Grid System
 * 
 * Implements dynamic grid rendering based on zoom level to maintain clarity
 * and avoid visual clutter. Shows grid lines at 1, 10, 100, and 1000 pixel
 * intervals with progressively darker shades based on current zoom level.
 * 
 * Requirements: PRD-51, TRD-115
 */

export interface GridConfig {
  canvasSize: number;
  minCoord: number;
  maxCoord: number;
  outOfBoundsColor: number;
  outOfBoundsAlpha: number;
}

export interface GridLevel {
  interval: number;
  color: number;
  alpha: number;
  width: number;
  minScale: number; // Minimum scale at which this level becomes visible
}

export class Grid {
  private container: PIXI.Container;
  private graphics: PIXI.Graphics;
  private config: GridConfig;
  private currentScale: number = 1;

  // Grid levels with their visibility thresholds
  private gridLevels: GridLevel[] = [
    { interval: 1000, color: 0x6b7280, alpha: 0.8, width: 2, minScale: 0 },    // Always visible
    { interval: 100, color: 0x9ca3af, alpha: 0.6, width: 1.5, minScale: 0.5 }, // Visible at scale >= 0.5
    { interval: 10, color: 0xd1d5db, alpha: 0.4, width: 1, minScale: 2 },      // Visible at scale >= 2
    { interval: 1, color: 0xe5e7eb, alpha: 0.2, width: 0.5, minScale: 8 }      // Visible at scale >= 8
  ];

  constructor(parentContainer: PIXI.Container, config: Partial<GridConfig> = {}) {
    // Default configuration for 5000x5000 canvas (0,0 to 4999,4999)
    this.config = {
      canvasSize: 5000,
      minCoord: 0,
      maxCoord: 4999,
      outOfBoundsColor: 0xf5f5f5,
      outOfBoundsAlpha: 0.3,
      ...config
    };

    // Create dedicated container for grid
    this.container = new PIXI.Container();
    this.container.name = 'grid-container';
    parentContainer.addChild(this.container);

    // Create graphics object for drawing
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);

    console.log('✅ Grid renderer initialized');
  }

  /**
   * Update grid rendering based on current zoom level
   */
  public update(scale: number): void {
    if (this.currentScale === scale) return; // No change needed
    
    this.currentScale = scale;
    this.render();
  }

  /**
   * Render the complete grid system
   */
  private render(): void {
    // Clear existing graphics
    this.graphics.clear();

    // Render out-of-bounds areas first (behind grid)
    this.renderOutOfBoundsAreas();

    // Render grid levels from largest to smallest
    this.renderGridLevels();

    // Render canvas boundary
    this.renderCanvasBoundary();

    console.log(`🔄 Grid updated for scale ${this.currentScale.toFixed(1)}x - Levels: ${this.getVisibleLevels().join(', ')}`);
  }

  /**
   * Render gray areas outside the valid canvas region
   */
  private renderOutOfBoundsAreas(): void {
    const viewportSize = 10000; // Large enough to cover any reasonable viewport
    
    this.graphics.beginFill(this.config.outOfBoundsColor, this.config.outOfBoundsAlpha);
    
    // Left gray area (x < 0)
    this.graphics.drawRect(-viewportSize, -viewportSize, viewportSize, viewportSize * 2);
    
    // Right gray area (x >= canvasSize)
    this.graphics.drawRect(this.config.canvasSize, -viewportSize, viewportSize, viewportSize * 2);
    
    // Top gray area (y < 0)
    this.graphics.drawRect(this.config.minCoord, -viewportSize, this.config.canvasSize, viewportSize);
    
    // Bottom gray area (y >= canvasSize)
    this.graphics.drawRect(this.config.minCoord, this.config.canvasSize, this.config.canvasSize, viewportSize);
    
    this.graphics.endFill();
  }

  /**
   * Render grid lines based on current scale
   */
  private renderGridLevels(): void {
    this.gridLevels.forEach(level => {
      if (!this.shouldRenderLevel(level)) return;

      // Set line style - width should be constant in screen pixels
      const lineWidth = level.width / this.currentScale;
      this.graphics.lineStyle(lineWidth, level.color, level.alpha);

      // Draw vertical lines within valid canvas bounds only
      for (let x = Math.ceil(this.config.minCoord / level.interval) * level.interval; 
           x <= this.config.maxCoord; 
           x += level.interval) {
        this.graphics.moveTo(x, this.config.minCoord);
        this.graphics.lineTo(x, this.config.maxCoord);
      }

      // Draw horizontal lines within valid canvas bounds only
      for (let y = Math.ceil(this.config.minCoord / level.interval) * level.interval; 
           y <= this.config.maxCoord; 
           y += level.interval) {
        this.graphics.moveTo(this.config.minCoord, y);
        this.graphics.lineTo(this.config.maxCoord, y);
      }
    });
  }

  /**
   * Render red boundary around the valid canvas area
   */
  private renderCanvasBoundary(): void {
    this.graphics.lineStyle(3 / this.currentScale, 0xff4444, 1.0); // Red border, constant screen width
    this.graphics.drawRect(
      this.config.minCoord, 
      this.config.minCoord, 
      this.config.canvasSize, 
      this.config.canvasSize
    );
  }

  /**
   * Check if a grid level should be rendered at current scale
   */
  private shouldRenderLevel(level: GridLevel): boolean {
    return this.currentScale >= level.minScale;
  }

  /**
   * Get list of currently visible grid levels for logging
   */
  private getVisibleLevels(): string[] {
    return this.gridLevels
      .filter(level => this.shouldRenderLevel(level))
      .map(level => `${level.interval}px`);
  }

  /**
   * Show or hide the entire grid
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Check if grid is currently visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Toggle grid visibility
   */
  public toggle(): boolean {
    this.container.visible = !this.container.visible;
    console.log(`🔄 Grid ${this.container.visible ? 'shown' : 'hidden'}`);
    return this.container.visible;
  }

  /**
   * Get current scale
   */
  public getCurrentScale(): number {
    return this.currentScale;
  }

  /**
   * Update grid configuration
   */
  public updateConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.render(); // Re-render with new config
  }

  /**
   * Get grid statistics for debugging
   */
  public getStats(): {
    scale: number;
    visibleLevels: string[];
    isVisible: boolean;
    canvasSize: number;
  } {
    return {
      scale: this.currentScale,
      visibleLevels: this.getVisibleLevels(),
      isVisible: this.isVisible(),
      canvasSize: this.config.canvasSize
    };
  }

  /**
   * Destroy the grid and clean up resources
   */
  public destroy(): void {
    this.graphics.destroy();
    
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    
    this.container.destroy({ children: true });
    console.log('✅ Grid renderer destroyed');
  }
}