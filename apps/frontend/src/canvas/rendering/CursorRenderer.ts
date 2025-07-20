import * as PIXI from 'pixi.js';
import { CursorUpdateData } from '@libs/common-types';
import { CursorGraphicsPool, CursorTextPool } from '../state/objectPool';

export interface CursorDisplayObject {
  userId: string;
  container: PIXI.Container;
  graphics: PIXI.Graphics;
  label: PIXI.Text;
  lastUpdate: number;
}

export interface CursorRendererConfig {
  maxCursorAge: number; // Time in ms before cursor fades
  cursorSize: number;
  labelOffset: number;
  fadeOutDuration: number;
}

export class CursorRenderer {
  private cursors: Map<string, CursorDisplayObject> = new Map();
  private container: PIXI.Container;
  private graphicsPool: CursorGraphicsPool;
  private textPool: CursorTextPool;
  private config: CursorRendererConfig;
  private textStyle: PIXI.TextStyle;

  constructor(parentContainer: PIXI.Container, config: Partial<CursorRendererConfig> = {}) {
    this.config = {
      maxCursorAge: 5000, // 5 seconds
      cursorSize: 1.0, // 1x1 pixel frame
      labelOffset: 0.8, // Closer to pixel frame
      fadeOutDuration: 1000, // 1 second fade
      ...config
    };

    // Create text style for cursor labels
    this.textStyle = new PIXI.TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: 0.6, // Small size in canvas units
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 0.1,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 0.2,
      dropShadowDistance: 0.1,
      wordWrap: false,
      align: 'center'
    });

    // Create dedicated container for cursors
    this.container = new PIXI.Container();
    this.container.name = 'cursor-layer';
    this.container.zIndex = 1000; // Ensure cursors are on top
    parentContainer.addChild(this.container);

    // Initialize object pools
    this.graphicsPool = new CursorGraphicsPool(30);
    this.textPool = new CursorTextPool(this.textStyle, 30);

    // Pre-fill pools for better performance
    this.graphicsPool.preFill(10);
    this.textPool.preFill(10);

    console.log('✅ CursorRenderer initialized');
  }

  /**
   * Update or create a cursor for the given user
   */
  public updateCursor(data: CursorUpdateData): void {
    const { userId, x, y, nickname, color } = data;
    
    let cursor = this.cursors.get(userId);
    
    if (!cursor) {
      cursor = this.createCursor(userId, nickname, color);
      this.cursors.set(userId, cursor);
    }

    // Update cursor position
    cursor.container.position.set(x, y);
    cursor.lastUpdate = Date.now();

    // Update label if nickname changed
    if (cursor.label.text !== nickname) {
      cursor.label.text = nickname;
    }

    // Update cursor color if changed
    this.updateCursorColor(cursor, color);

    // Make sure cursor is visible and fully opaque
    cursor.container.visible = true;
    cursor.container.alpha = 1;

    console.log(`🖱️ Updated cursor for ${nickname} at (${x}, ${y})`);
  }

  /**
   * Remove a cursor for the given user
   */
  public removeCursor(userId: string): void {
    const cursor = this.cursors.get(userId);
    if (!cursor) return;

    this.destroyCursor(cursor);
    this.cursors.delete(userId);

    console.log(`🖱️ Removed cursor for user ${userId}`);
  }

  /**
   * Update all cursors (call this in your main loop)
   */
  public update(): void {
    const now = Date.now();
    const cursorsToRemove: string[] = [];

    for (const [userId, cursor] of this.cursors) {
      const age = now - cursor.lastUpdate;

      if (age > this.config.maxCursorAge + this.config.fadeOutDuration) {
        // Cursor is too old, remove it
        cursorsToRemove.push(userId);
      } else if (age > this.config.maxCursorAge) {
        // Start fading out
        const fadeProgress = (age - this.config.maxCursorAge) / this.config.fadeOutDuration;
        cursor.container.alpha = Math.max(0, 1 - fadeProgress);
      }
    }

    // Remove old cursors
    for (const userId of cursorsToRemove) {
      this.removeCursor(userId);
    }
  }

  /**
   * Create a new cursor display object
   */
  private createCursor(userId: string, nickname: string, color: string): CursorDisplayObject {
    // Get objects from pools
    const graphics = this.graphicsPool.acquire();
    const label = this.textPool.acquire();

    // Create container for this cursor
    const container = new PIXI.Container();
    container.name = `cursor-${userId}`;

    // Draw cursor shape
    this.drawCursor(graphics, color);

    // Setup label
    label.text = nickname;
    label.anchor.set(0.5, 1); // Center horizontally, bottom vertically
    label.position.set(0.5, -this.config.labelOffset); // Position above pixel frame center

    // Add to container
    container.addChild(graphics);
    container.addChild(label);

    // Add to cursor layer
    this.container.addChild(container);

    const cursor: CursorDisplayObject = {
      userId,
      container,
      graphics,
      label,
      lastUpdate: Date.now()
    };

    return cursor;
  }

  /**
   * Draw the cursor shape - a simple pixel frame
   */
  private drawCursor(graphics: PIXI.Graphics, color: string): void {
    graphics.clear();
    
    // Parse hex color
    const colorValue = parseInt(color.replace('#', ''), 16);
    
    // Draw a 1x1 pixel frame (outline only)
    // Position at (0,0) to (1,1) to align with pixel grid
    graphics.lineStyle(0.08, colorValue, 1); // Colored border
    graphics.drawRect(0, 0, 1, 1); // 1x1 pixel starting at cursor position
    
    // Add a subtle inner glow for visibility
    graphics.lineStyle(0.04, 0xFFFFFF, 0.6); // White inner border
    graphics.drawRect(0.02, 0.02, 0.96, 0.96);
  }

  /**
   * Update cursor color
   */
  private updateCursorColor(cursor: CursorDisplayObject, color: string): void {
    // Redraw the cursor with new color
    this.drawCursor(cursor.graphics, color);
  }

  /**
   * Destroy a cursor and return objects to pools
   */
  private destroyCursor(cursor: CursorDisplayObject): void {
    // Remove from display
    this.container.removeChild(cursor.container);

    // Return objects to pools
    this.graphicsPool.release(cursor.graphics);
    this.textPool.release(cursor.label);

    // Destroy the container
    cursor.container.destroy();
  }

  /**
   * Get the number of active cursors
   */
  public getActiveCursorCount(): number {
    return this.cursors.size;
  }

  /**
   * Get all active cursor user IDs
   */
  public getActiveCursorUsers(): string[] {
    return Array.from(this.cursors.keys());
  }

  /**
   * Hide all cursors
   */
  public hideAllCursors(): void {
    this.container.visible = false;
  }

  /**
   * Show all cursors
   */
  public showAllCursors(): void {
    this.container.visible = true;
  }

  /**
   * Clear all cursors
   */
  public clearAllCursors(): void {
    for (const userId of this.cursors.keys()) {
      this.removeCursor(userId);
    }
  }

  /**
   * Destroy the cursor renderer
   */
  public destroy(): void {
    this.clearAllCursors();
    
    // Clear pools
    this.graphicsPool.clear();
    this.textPool.clear();
    
    // Remove from parent
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    
    this.container.destroy();
    console.log('✅ CursorRenderer destroyed');
  }
}