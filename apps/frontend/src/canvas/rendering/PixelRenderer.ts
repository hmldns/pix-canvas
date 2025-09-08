import * as PIXI from 'pixi.js';
import { PixelUpdateData } from '@libs/common-types';

export interface PixelGraphicsObject extends PIXI.Graphics {
  pixelData: {
    x: number;
    y: number;
    color: string;
    userId: string;
  };
}

export class PixelRenderer {
  private container: PIXI.Container;
  private pixelMap: Map<string, PixelGraphicsObject> = new Map();
  private pixelContainer: PIXI.Container;

  constructor(parentContainer: PIXI.Container) {
    this.container = parentContainer;

    // Create dedicated container for pixels
    this.pixelContainer = new PIXI.Container();
    this.pixelContainer.name = 'pixel-layer';
    this.pixelContainer.sortableChildren = false; // Optimize performance
    
    // Add pixel container after grid but before other layers
    const gridContainer = parentContainer.getChildByName('grid-container');
    if (gridContainer) {
      const gridIndex = parentContainer.getChildIndex(gridContainer);
      parentContainer.addChildAt(this.pixelContainer, gridIndex + 1);
    } else {
      parentContainer.addChild(this.pixelContainer);
    }

    console.log('✅ Pixel renderer initialized');
  }

  /**
   * Add or update a single pixel
   */
  public addPixel(pixelData: PixelUpdateData): void {
    const key = this.getPixelKey(pixelData.x, pixelData.y);
    
    // Remove existing pixel at this position
    this.removePixel(pixelData.x, pixelData.y);

    // Create new pixel graphics
    const pixelGraphics = this.createPixelGraphics(pixelData);
    
    // Add to container and tracking
    this.pixelContainer.addChild(pixelGraphics);
    this.pixelMap.set(key, pixelGraphics);

    // console.log(`🎨 Added pixel at (${pixelData.x}, ${pixelData.y}) color: ${pixelData.color}`);
  }

  /**
   * Add multiple pixels in batch (more efficient)
   */
  public addPixels(pixels: PixelUpdateData[]): void {
    console.log(`🎨 Adding ${pixels.length} pixels to renderer...`);

    // Process all pixels
    pixels.forEach(pixelData => {
      const key = this.getPixelKey(pixelData.x, pixelData.y);
      
      // Remove existing pixel at this position
      this.removePixel(pixelData.x, pixelData.y);

      // Create new pixel graphics
      const pixelGraphics = this.createPixelGraphics(pixelData);
      
      // Add to tracking (will batch add to container)
      this.pixelMap.set(key, pixelGraphics);
    });

    // Batch add all new pixels to container
    const newPixels = Array.from(this.pixelMap.values()).filter(
      pixel => !this.pixelContainer.children.includes(pixel)
    );
    
    newPixels.forEach(pixel => {
      this.pixelContainer.addChild(pixel);
    });

    console.log(`✅ Added ${pixels.length} pixels to canvas`);
  }

  /**
   * Remove a pixel at specific coordinates
   */
  public removePixel(x: number, y: number): boolean {
    const key = this.getPixelKey(x, y);
    const existingPixel = this.pixelMap.get(key);

    if (existingPixel) {
      this.pixelContainer.removeChild(existingPixel);
      existingPixel.destroy();
      this.pixelMap.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Clear all pixels
   */
  public clearAllPixels(): void {
    // Remove and destroy all pixel graphics
    this.pixelMap.forEach((pixel) => {
      this.pixelContainer.removeChild(pixel);
      pixel.destroy();
    });

    this.pixelMap.clear();
    console.log('🧹 All pixels cleared from renderer');
  }

  /**
   * Get pixel at coordinates
   */
  public getPixelAt(x: number, y: number): PixelGraphicsObject | null {
    const key = this.getPixelKey(x, y);
    return this.pixelMap.get(key) || null;
  }

  /**
   * Check if pixel exists at coordinates
   */
  public hasPixelAt(x: number, y: number): boolean {
    const key = this.getPixelKey(x, y);
    return this.pixelMap.has(key);
  }

  /**
   * Get all pixels
   */
  public getAllPixels(): PixelGraphicsObject[] {
    return Array.from(this.pixelMap.values());
  }

  /**
   * Get pixel count
   */
  public getPixelCount(): number {
    return this.pixelMap.size;
  }

  /**
   * Update pixel visibility based on zoom level (LOD optimization)
   */
  public updatePixelVisibility(zoomLevel: number): void {
    // For very low zoom levels, we might want to hide individual pixels
    // and show a simplified representation
    const showIndividualPixels = zoomLevel > 0.5;
    
    this.pixelContainer.visible = showIndividualPixels;
    
    if (!showIndividualPixels) {
      // Could implement simplified rendering here for performance
      console.log('🔍 Hiding individual pixels due to low zoom level');
    }
  }

  /**
   * Get pixels in a specific region (for culling/optimization)
   */
  public getPixelsInRegion(minX: number, minY: number, maxX: number, maxY: number): PixelGraphicsObject[] {
    const pixelsInRegion: PixelGraphicsObject[] = [];

    this.pixelMap.forEach((pixel) => {
      const { x, y } = pixel.pixelData;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        pixelsInRegion.push(pixel);
      }
    });

    return pixelsInRegion;
  }

  /**
   * Create PIXI graphics object for a pixel
   */
  private createPixelGraphics(pixelData: PixelUpdateData): PixelGraphicsObject {
    // Convert hex color to number
    const colorNumber = parseInt(pixelData.color.replace('#', ''), 16);
    
    // Create graphics object
    const graphics = new PIXI.Graphics() as PixelGraphicsObject;
    
    // Draw the pixel (1x1 rectangle)
    graphics.beginFill(colorNumber);
    graphics.drawRect(pixelData.x, pixelData.y, 1, 1);
    graphics.endFill();
    
    // Store pixel data for reference
    graphics.pixelData = {
      x: pixelData.x,
      y: pixelData.y,
      color: pixelData.color,
      userId: pixelData.userId,
    };
    
    // Set name for debugging
    graphics.name = `pixel-${pixelData.x}-${pixelData.y}`;
    
    // Optimize for performance
    graphics.cacheAsBitmap = false; // Don't cache individual pixels
    graphics.eventMode = 'none'; // Pixels don't need interaction
    
    return graphics;
  }

  /**
   * Generate unique key for pixel coordinates
   */
  private getPixelKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Get renderer statistics
   */
  public getStats(): {
    pixelCount: number;
    containerChildren: number;
    memoryUsage: number;
  } {
    return {
      pixelCount: this.pixelMap.size,
      containerChildren: this.pixelContainer.children.length,
      memoryUsage: this.pixelMap.size * 4, // Rough estimate
    };
  }

  /**
   * Destroy the pixel renderer
   */
  public destroy(): void {
    this.clearAllPixels();
    
    if (this.pixelContainer.parent) {
      this.pixelContainer.parent.removeChild(this.pixelContainer);
    }
    
    this.pixelContainer.destroy({ children: true });
    console.log('✅ Pixel renderer destroyed');
  }
}