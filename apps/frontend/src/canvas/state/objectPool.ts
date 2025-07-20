/**
 * Generic object pool for efficient memory management
 * Reuses objects instead of constantly creating and destroying them
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFunction: () => T,
    resetFunction?: (obj: T) => void,
    maxPoolSize: number = 100
  ) {
    this.createFn = createFunction;
    this.resetFn = resetFunction;
    this.maxSize = maxPoolSize;
  }

  /**
   * Get an object from the pool or create a new one
   */
  public acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      return obj;
    }
    
    return this.createFn();
  }

  /**
   * Return an object to the pool for reuse
   */
  public release(obj: T): void {
    if (this.pool.length >= this.maxSize) {
      // Pool is full, don't store the object
      return;
    }

    // Reset the object if a reset function is provided
    if (this.resetFn) {
      this.resetFn(obj);
    }

    this.pool.push(obj);
  }

  /**
   * Get the current size of the pool
   */
  public getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Clear the entire pool
   */
  public clear(): void {
    this.pool.length = 0;
  }

  /**
   * Pre-fill the pool with objects
   */
  public preFill(count: number): void {
    for (let i = 0; i < count && this.pool.length < this.maxSize; i++) {
      this.pool.push(this.createFn());
    }
  }
}

/**
 * Specialized pool for PIXI Graphics objects used for cursors
 */
import * as PIXI from 'pixi.js';

export class CursorGraphicsPool extends ObjectPool<PIXI.Graphics> {
  constructor(maxPoolSize: number = 50) {
    super(
      // Create function
      () => new PIXI.Graphics(),
      // Reset function
      (graphics: PIXI.Graphics) => {
        graphics.clear();
        graphics.visible = false;
        graphics.alpha = 1;
        graphics.position.set(0, 0);
        graphics.scale.set(1, 1);
        graphics.rotation = 0;
        
        // Remove from parent if attached
        if (graphics.parent) {
          graphics.parent.removeChild(graphics);
        }
      },
      maxPoolSize
    );
  }
}

/**
 * Specialized pool for PIXI Text objects used for cursor labels
 */
export class CursorTextPool extends ObjectPool<PIXI.Text> {
  private textStyle: PIXI.TextStyle;

  constructor(textStyle: PIXI.TextStyle, maxPoolSize: number = 50) {
    super(
      // Create function
      () => new PIXI.Text('', textStyle),
      // Reset function
      (text: PIXI.Text) => {
        text.text = '';
        text.visible = false;
        text.alpha = 1;
        text.position.set(0, 0);
        text.scale.set(1, 1);
        text.rotation = 0;
        
        // Remove from parent if attached
        if (text.parent) {
          text.parent.removeChild(text);
        }
      },
      maxPoolSize
    );
    
    this.textStyle = textStyle;
  }

  public getTextStyle(): PIXI.TextStyle {
    return this.textStyle;
  }
}