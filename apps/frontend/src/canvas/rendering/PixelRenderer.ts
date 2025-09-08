import * as PIXI from 'pixi.js';
import { PixelUpdateData } from '@libs/common-types';

// Use Sprite-based pixels for better batching (vs Graphics per pixel)
export interface PixelSpriteObject extends PIXI.Sprite {
  pixelData: {
    x: number;
    y: number;
    color: string;
    userId: string;
  };
}

export class PixelRenderer {
  private container: PIXI.Container;
  private pixelMap: Map<string, PixelSpriteObject> = new Map();
  private pixelContainer: PIXI.ParticleContainer;
  private pixelTexture: PIXI.Texture;

  constructor(parentContainer: PIXI.Container) {
    this.container = parentContainer;

    // Create a shared 1x1 white texture for all pixels
    // Using PIXI.Texture.WHITE (10x10) is fine; we set width/height to 1 world unit
    this.pixelTexture = PIXI.Texture.WHITE;

    // Create ParticleContainer for highly batched sprite rendering
    this.pixelContainer = new PIXI.ParticleContainer(200000, {
      position: true,
      scale: true,
      rotation: false,
      uvs: false,
      alpha: false,
      tint: true,
    });
    this.pixelContainer.name = 'pixel-layer';
    
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

    // Create new pixel sprite
    const pixelSprite = this.createPixelSprite(pixelData);
    
    // Add to container and tracking
    this.pixelContainer.addChild(pixelSprite);
    this.pixelMap.set(key, pixelSprite);

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

      // Create new pixel sprite
      const pixelSprite = this.createPixelSprite(pixelData);
      
      // Add to tracking (will batch add to container)
      this.pixelMap.set(key, pixelSprite);
    });

    // Batch add all new pixels to container
    const newPixels = Array.from(this.pixelMap.values()).filter(
      (pixel) => !(this.pixelContainer.children as PIXI.DisplayObject[]).includes(pixel)
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
      // Keep shared texture alive
      existingPixel.destroy({ texture: false, baseTexture: false });
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
      pixel.destroy({ texture: false, baseTexture: false });
    });

    this.pixelMap.clear();
    console.log('🧹 All pixels cleared from renderer');
  }

  /**
   * Get pixel at coordinates
   */
  public getPixelAt(x: number, y: number): PixelSpriteObject | null {
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
  public getAllPixels(): PixelSpriteObject[] {
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
  public getPixelsInRegion(minX: number, minY: number, maxX: number, maxY: number): PixelSpriteObject[] {
    const pixelsInRegion: PixelSpriteObject[] = [];

    this.pixelMap.forEach((pixel) => {
      const { x, y } = pixel.pixelData;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        pixelsInRegion.push(pixel);
      }
    });

    return pixelsInRegion;
  }

  /**
   * Create PIXI sprite for a pixel
   */
  private createPixelSprite(pixelData: PixelUpdateData): PixelSpriteObject {
    // Convert hex color to number
    const colorNumber = parseInt(pixelData.color.replace('#', ''), 16);

    // Create sprite using shared 1x1 white texture
    const sprite = new PIXI.Sprite(this.pixelTexture) as PixelSpriteObject;

    // Position at world coordinates (1 unit = 1 canvas pixel)
    sprite.position.set(pixelData.x, pixelData.y);
    sprite.width = 1;
    sprite.height = 1;
    sprite.tint = colorNumber;

    // Store pixel data for reference
    sprite.pixelData = {
      x: pixelData.x,
      y: pixelData.y,
      color: pixelData.color,
      userId: pixelData.userId,
    };

    // Set name for debugging
    sprite.name = `pixel-${pixelData.x}-${pixelData.y}`;

    // Optimize for performance
    sprite.eventMode = 'none'; // Pixels don't need interaction

    return sprite;
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
