import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { PixelRenderer } from '../rendering/PixelRenderer';
import { PixelUpdateData } from '@libs/common-types';

/**
 * State Synchronization Module
 * 
 * This module bridges React's declarative state management with PixiJS's imperative API.
 * It implements a one-way data flow pattern: React state -> PixiJS rendering updates.
 * 
 * The pattern follows:
 * 1. React state changes (e.g., new pixels received via WebSocket)
 * 2. State sync functions are called with the new data
 * 3. These functions update the PixiJS scene imperatively
 * 4. PixiJS renders the visual changes
 */

export interface CanvasState {
  pixels: Map<string, PixelData>;
  selectedColor: string;
  zoomLevel: number;
  panPosition: { x: number; y: number };
  isLoading: boolean;
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
  userId: string;
  timestamp: Date;
}

export class StateSynchronizer {
  private renderer: CanvasRenderer;
  private pixelRenderer: PixelRenderer;
  private pixelMap: Map<string, PixelData> = new Map();

  constructor(renderer: CanvasRenderer) {
    this.renderer = renderer;
    this.pixelRenderer = new PixelRenderer(renderer.canvasContainer!);
    console.log('✅ State synchronizer initialized');
  }

  /**
   * Synchronize pixel updates from WebSocket or initial load
   */
  public syncPixelUpdates(pixels: PixelUpdateData[]): void {
    console.log(`🔄 Syncing ${pixels.length} pixel updates to canvas`);

    pixels.forEach(pixelData => {
      const key = `${pixelData.x},${pixelData.y}`;
      
      // Update internal state
      this.pixelMap.set(key, {
        ...pixelData,
        timestamp: new Date(),
      });

      // Use PixelRenderer to add/update the pixel
      this.pixelRenderer.addPixel(pixelData);

      console.log(`🎨 Synced pixel at (${pixelData.x}, ${pixelData.y}) color: ${pixelData.color}`);
    });
  }

  /**
   * Sync the entire canvas state (e.g., on initial load)
   */
  public syncCanvasState(pixels: PixelUpdateData[]): void {
    console.log(`🔄 Syncing full canvas state with ${pixels.length} pixels`);
    
    // Clear existing pixels
    this.clearAllPixels();
    
    // Add all pixels
    this.syncPixelUpdates(pixels);
    
    console.log('✅ Full canvas state synchronized');
  }

  /**
   * Clear all pixels from the canvas
   */
  public clearAllPixels(): void {
    // Use PixelRenderer to clear all pixels
    this.pixelRenderer.clearAllPixels();
    
    // Clear internal state
    this.pixelMap.clear();

    console.log('🧹 All pixels cleared from canvas');
  }

  /**
   * Sync zoom level changes
   */
  public syncZoomLevel(zoomLevel: number): void {
    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return;

    canvasContainer.scale.set(zoomLevel);
    console.log(`🔍 Synced zoom level: ${Math.round(zoomLevel * 100)}%`);
  }

  /**
   * Sync pan position changes
   */
  public syncPanPosition(x: number, y: number): void {
    const canvasContainer = this.renderer.canvasContainer;
    if (!canvasContainer) return;

    canvasContainer.x = x;
    canvasContainer.y = y;
    console.log(`📍 Synced pan position: (${x}, ${y})`);
  }

  /**
   * Get current canvas state for React components
   */
  public getCurrentState(): {
    pixelCount: number;
    zoomLevel: number;
    panPosition: { x: number; y: number };
  } {
    const canvasContainer = this.renderer.canvasContainer;
    
    return {
      pixelCount: this.pixelMap.size,
      zoomLevel: canvasContainer?.scale.x || 1,
      panPosition: {
        x: canvasContainer?.x || 0,
        y: canvasContainer?.y || 0,
      },
    };
  }


  /**
   * Check if a pixel exists at given coordinates
   */
  public hasPixelAt(x: number, y: number): boolean {
    return this.pixelMap.has(`${x},${y}`);
  }

  /**
   * Get pixel data at coordinates
   */
  public getPixelAt(x: number, y: number): PixelData | null {
    return this.pixelMap.get(`${x},${y}`) || null;
  }

  /**
   * Get all pixels as array
   */
  public getAllPixels(): PixelData[] {
    return Array.from(this.pixelMap.values());
  }

  /**
   * Destroy the synchronizer and clean up resources
   */
  public destroy(): void {
    this.clearAllPixels();
    this.pixelRenderer.destroy();
    console.log('✅ State synchronizer destroyed');
  }
}

// Utility function to create coordinate key
export function createCoordinateKey(x: number, y: number): string {
  return `${x},${y}`;
}

// Utility function to parse coordinate key
export function parseCoordinateKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}