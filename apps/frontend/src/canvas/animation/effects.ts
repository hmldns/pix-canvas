import * as PIXI from 'pixi.js';

/**
 * Configuration for pixel drawing particle effects
 */
export interface PixelEffectConfig {
  particleCount: number;
  duration: number; // Duration in milliseconds
  particleSize: number;
  particleSpeed: number;
  gravity: number;
  fadeSpeed: number;
}

/**
 * Individual particle for the pixel effect
 */
interface Particle {
  sprite: PIXI.Graphics;
  velocityX: number;
  velocityY: number;
  life: number; // 0 to 1, where 1 is fully alive
  maxLife: number;
  baseAlpha: number;
}

/**
 * Pixel drawing effect instance
 */
interface PixelEffect {
  particles: Particle[];
  container: PIXI.Container;
  startTime: number;
  duration: number;
  isComplete: boolean;
}

/**
 * Effect manager for pixel drawing animations
 */
export class PixelEffectManager {
  private parentContainer: PIXI.Container;
  private activeEffects: PixelEffect[] = [];
  private config: PixelEffectConfig;
  private particlePool: PIXI.Graphics[] = [];

  constructor(parentContainer: PIXI.Container, config: Partial<PixelEffectConfig> = {}) {
    this.parentContainer = parentContainer;
    this.config = {
      particleCount: 16, // More particles for denser effect
      duration: 500, // 0.5 seconds as specified
      particleSize: 0.08, // Smaller particles
      particleSpeed: 1.2, // Slower speed for tighter spread
      gravity: 0.1, // Less gravity for tighter effect
      fadeSpeed: 0.002,
      ...config
    };

    // Pre-fill particle pool
    this.initializeParticlePool();
    
    console.log('✅ PixelEffectManager initialized');
  }

  /**
   * Create a particle effect at the specified pixel location
   */
  public createPixelEffect(x: number, y: number, color: string, isOwnPixel = true): void {
    const effect: PixelEffect = {
      particles: [],
      container: new PIXI.Container(),
      startTime: Date.now(),
      duration: this.config.duration,
      isComplete: false
    };

    // Position the effect container at the pixel center
    effect.container.position.set(x + 0.5, y + 0.5);
    this.parentContainer.addChild(effect.container);

    // Create particles for this effect
    this.createParticles(effect, color, isOwnPixel);
    
    this.activeEffects.push(effect);
    
    console.log(`✨ Created pixel effect at (${x}, ${y}) with color ${color}`);
  }

  /**
   * Update all active effects (call this in the main render loop)
   */
  public update(deltaTime: number): void {
    const currentTime = Date.now();
    const effectsToRemove: number[] = [];

    for (let i = 0; i < this.activeEffects.length; i++) {
      const effect = this.activeEffects[i];
      const elapsed = currentTime - effect.startTime;
      const progress = Math.min(elapsed / effect.duration, 1);

      if (progress >= 1 || effect.isComplete) {
        // Effect is complete, mark for removal
        this.completeEffect(effect);
        effectsToRemove.push(i);
        continue;
      }

      // Update particles in this effect
      this.updateEffectParticles(effect, deltaTime);
    }

    // Remove completed effects (in reverse order to maintain indices)
    for (let i = effectsToRemove.length - 1; i >= 0; i--) {
      this.activeEffects.splice(effectsToRemove[i], 1);
    }
  }

  /**
   * Clear all active effects
   */
  public clearAllEffects(): void {
    for (const effect of this.activeEffects) {
      this.completeEffect(effect);
    }
    this.activeEffects = [];
  }

  /**
   * Destroy the effect manager
   */
  public destroy(): void {
    this.clearAllEffects();
    this.clearParticlePool();
    console.log('✅ PixelEffectManager destroyed');
  }

  /**
   * Initialize pool of reusable particle graphics
   */
  private initializeParticlePool(): void {
    const poolSize = this.config.particleCount * 10; // Pool for multiple simultaneous effects
    
    for (let i = 0; i < poolSize; i++) {
      const particle = new PIXI.Graphics();
      particle.visible = false;
      this.particlePool.push(particle);
    }
  }

  /**
   * Get a particle from the pool or create a new one
   */
  private acquireParticle(): PIXI.Graphics {
    const particle = this.particlePool.pop();
    if (particle) {
      particle.visible = true;
      particle.clear();
      return particle;
    }
    
    // Pool exhausted, create new particle
    return new PIXI.Graphics();
  }

  /**
   * Return a particle to the pool
   */
  private releaseParticle(particle: PIXI.Graphics): void {
    particle.visible = false;
    particle.clear();
    if (particle.parent) {
      particle.parent.removeChild(particle);
    }
    this.particlePool.push(particle);
  }

  /**
   * Create particles for a pixel effect
   */
  private createParticles(effect: PixelEffect, color: string, isOwnPixel = true): void {
    const colorValue = parseInt(color.replace('#', ''), 16);
    
    // Adjust particle count and intensity based on whether it's own pixel
    const particleCount = isOwnPixel ? this.config.particleCount : Math.floor(this.config.particleCount * 0.6);
    const particleSize = isOwnPixel ? this.config.particleSize : this.config.particleSize * 0.7;
    const speedMultiplier = isOwnPixel ? 1.0 : 0.8;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.acquireParticle();
      
      // Draw the particle (small square)
      particle.beginFill(colorValue, 1);
      particle.drawRect(-particleSize / 2, -particleSize / 2, particleSize, particleSize);
      particle.endFill();

      // Random velocity direction with tighter spread
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const speed = this.config.particleSpeed * speedMultiplier * (0.7 + Math.random() * 0.3);
      
      const particleData: Particle = {
        sprite: particle,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        baseAlpha: 0.8 + Math.random() * 0.2
      };

      effect.particles.push(particleData);
      effect.container.addChild(particle);
    }
  }

  /**
   * Update particles in an effect
   */
  private updateEffectParticles(effect: PixelEffect, deltaTime: number): void {
    const dt = Math.min(deltaTime, 50); // Cap delta time to prevent large jumps
    
    for (const particle of effect.particles) {
      // Apply gravity
      particle.velocityY += this.config.gravity * dt * 0.016; // Normalize to ~16ms frame time
      
      // Update position
      particle.sprite.x += particle.velocityX * dt * 0.016;
      particle.sprite.y += particle.velocityY * dt * 0.016;
      
      // Update life and alpha
      particle.life -= this.config.fadeSpeed * dt;
      particle.life = Math.max(0, particle.life);
      
      const alpha = particle.life * particle.baseAlpha;
      particle.sprite.alpha = alpha;
      
      // Scale based on life (particles get smaller as they fade)
      const scale = 0.5 + (particle.life * 0.5);
      particle.sprite.scale.set(scale);
    }
  }

  /**
   * Complete and clean up an effect
   */
  private completeEffect(effect: PixelEffect): void {
    // Return particles to pool
    for (const particle of effect.particles) {
      this.releaseParticle(particle.sprite);
    }
    
    // Remove container from parent
    if (effect.container.parent) {
      effect.container.parent.removeChild(effect.container);
    }
    
    effect.container.destroy();
    effect.isComplete = true;
  }

  /**
   * Clear the particle pool
   */
  private clearParticlePool(): void {
    for (const particle of this.particlePool) {
      particle.destroy();
    }
    this.particlePool = [];
  }

  /**
   * Get current number of active effects
   */
  public getActiveEffectCount(): number {
    return this.activeEffects.length;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PixelEffectConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ PixelEffectManager config updated:', newConfig);
  }
}