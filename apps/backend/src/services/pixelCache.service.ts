import { Pixel } from '../models/pixel.model';

export interface PixelRecord {
  x: number;
  y: number;
  color: string;
  userId: string;
  timestamp: Date;
}

/**
 * PixelCacheService
 * - Maintains a thread-safe (event-loop safe) double-buffered in-memory cache
 * - Full reload from DB every 15 minutes (configurable)
 * - Atomic buffer swap; reads are always from the active buffer
 * - Writes are mirrored to memory (active buffer) and DB by repository
 */
export class PixelCacheService {
  private buffers: [Map<string, PixelRecord>, Map<string, PixelRecord>] = [
    new Map(),
    new Map(),
  ];
  private activeIndex = 0; // 0 or 1
  private reloadTimer: NodeJS.Timeout | null = null;
  private isLoading = false;
  private pendingSinceReload: PixelRecord[] = [];
  private reloadIntervalMs: number;

  constructor(reloadIntervalMs = 15 * 60 * 1000) {
    this.reloadIntervalMs = reloadIntervalMs;
  }

  public start(): void {
    // Kick initial load; fire and forget
    this.reloadFromDatabase().catch((e) => {
      console.error('❌ Initial pixel cache load failed:', e);
    });

    // Schedule periodic reloads
    this.reloadTimer = setInterval(() => {
      this.reloadFromDatabase().catch((e) => {
        console.error('❌ Scheduled pixel cache reload failed:', e);
      });
    }, this.reloadIntervalMs);
  }

  public stop(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
    }
  }

  /**
   * Apply latest pixel to the active buffer. If a reload is in-flight,
   * queue it to be replayed onto the new buffer before swap to prevent loss.
   */
  public applyUpdate(update: PixelRecord): void {
    const key = this.key(update.x, update.y);

    // Update active buffer
    const active = this.buffers[this.activeIndex];
    active.set(key, update);

    // If reloading, keep a record to replay onto the incoming buffer
    if (this.isLoading) {
      this.pendingSinceReload.push(update);
    }
  }

  public getAll(): PixelRecord[] {
    const active = this.buffers[this.activeIndex];
    return Array.from(active.values());
  }

  public getRegion(minX: number, minY: number, maxX: number, maxY: number): PixelRecord[] {
    const active = this.buffers[this.activeIndex];
    const result: PixelRecord[] = [];
    active.forEach((p) => {
      if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
        result.push(p);
      }
    });
    return result;
  }

  public getStats(): { count: number; activeIndex: number; isLoading: boolean } {
    return {
      count: this.buffers[this.activeIndex].size,
      activeIndex: this.activeIndex,
      isLoading: this.isLoading,
    };
  }

  /**
   * Full reload from DB with double-buffer swap and replay of in-flight updates.
   */
  public async reloadFromDatabase(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    console.log('🔄 Reloading pixel cache from database...');

    const standbyIndex = this.activeIndex ^ 1;
    const newBuffer = new Map<string, PixelRecord>();

    // Load latest per-coordinate pixels
    const rows = await (Pixel as any).getCurrentCanvasState();
    for (const row of rows as any[]) {
      const rec: PixelRecord = {
        x: row.x,
        y: row.y,
        color: row.color,
        userId: row.userId,
        timestamp: row.timestamp,
      };
      newBuffer.set(this.key(rec.x, rec.y), rec);
    }

    // Replay any updates that happened during load
    const pending = this.pendingSinceReload;
    this.pendingSinceReload = [];
    for (const upd of pending) {
      newBuffer.set(this.key(upd.x, upd.y), upd);
    }

    // Swap buffers atomically
    this.buffers[standbyIndex] = newBuffer;
    this.activeIndex = standbyIndex;
    this.isLoading = false;

    console.log(`✅ Pixel cache reloaded: ${newBuffer.size} pixels (replayed ${pending.length} updates)`);
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }
}

// Global singleton
let pixelCacheService: PixelCacheService | null = null;

export function initializePixelCacheService(): PixelCacheService {
  if (!pixelCacheService) {
    pixelCacheService = new PixelCacheService();
    pixelCacheService.start();
  }
  return pixelCacheService;
}

export function getPixelCacheService(): PixelCacheService {
  if (!pixelCacheService) {
    throw new Error('PixelCacheService not initialized');
  }
  return pixelCacheService;
}

