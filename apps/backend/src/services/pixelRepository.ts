import { Pixel } from '../models/pixel.model';
import { getPixelCacheService, initializePixelCacheService } from './pixelCache.service';

export class PixelRepository {
  constructor() {
    // Ensure cache service is initialized
    initializePixelCacheService();
  }

  /**
   * Record a pixel update to DB and mirror to in-memory cache.
   */
  public async recordPixel(x: number, y: number, color: string, userId: string, timestamp: Date = new Date()): Promise<void> {
    // Persist event (append-only log)
    const pixel = new Pixel({ x, y, color, userId, timestamp });
    await pixel.save();

    // Mirror to memory cache (last-write-wins)
    getPixelCacheService().applyUpdate({ x, y, color, userId, timestamp });
  }

  /**
   * Get latest canvas state from memory cache (fast path)
   */
  public getCanvasState(): Array<{ x: number; y: number; color: string; userId: string; timestamp: Date }> {
    return getPixelCacheService().getAll();
  }

  public getPixelsInRegion(minX: number, minY: number, maxX: number, maxY: number) {
    return getPixelCacheService().getRegion(minX, minY, maxX, maxY);
  }

  public getStats() {
    return getPixelCacheService().getStats();
  }
}

// Singleton accessors
let pixelRepository: PixelRepository | null = null;

export function initializePixelRepository(): PixelRepository {
  if (!pixelRepository) {
    pixelRepository = new PixelRepository();
  }
  return pixelRepository;
}

export function getPixelRepository(): PixelRepository {
  if (!pixelRepository) {
    throw new Error('PixelRepository not initialized');
  }
  return pixelRepository;
}

