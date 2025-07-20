/**
 * Sound effect manager for pixel drawing using Web Audio API
 */

export interface SoundConfig {
  volume: number; // 0 to 1
  enabled: boolean;
  pixelPlaceFrequency: number; // Base frequency for pixel placement sound
  pixelPlaceGain: number; // Gain for pixel placement sound
  pixelPlaceDuration: number; // Duration of sound in milliseconds
}

export class PixelSoundManager {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private config: SoundConfig;

  constructor(config: Partial<SoundConfig> = {}) {
    this.config = {
      volume: 0.3,
      enabled: true,
      pixelPlaceFrequency: 800, // Higher pitched click sound
      pixelPlaceGain: 0.2,
      pixelPlaceDuration: 100, // Short 100ms sound
      ...config
    };

    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node for volume control
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.value = this.config.volume;

      // Handle audio context state
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 Audio context suspended - will resume on first user interaction');
      }

      console.log('✅ Pixel sound manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Resume audio context if suspended (call on user interaction)
   */
  public async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🔊 Audio context resumed');
      } catch (error) {
        console.error('❌ Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Play pixel placement sound effect
   */
  public playPixelPlaceSound(color?: string, isOwnPixel = true): void {
    if (!this.config.enabled || !this.audioContext || !this.masterGainNode) {
      console.log('🔊 Sound disabled or audio context not available');
      return;
    }

    try {
      // Ensure audio context is running
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 Audio context suspended, trying to resume...');
        this.resumeAudioContext();
        return; // Skip this sound, will work on next interaction
      }

      console.log('🔊 Playing pixel sound with color:', color);

      // Create oscillator for tone generation
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Connect audio nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Calculate frequency based on color and ownership
      let frequency = this.config.pixelPlaceFrequency;
      if (color) {
        frequency = this.getFrequencyFromColor(color);
      }
      
      // Different sound characteristics for own vs others' pixels
      let gainMultiplier = 1.0;
      let oscillatorType: OscillatorType = 'sine';
      
      if (isOwnPixel) {
        // Own pixels: brighter, more prominent sound
        gainMultiplier = 1.0;
        oscillatorType = 'sine';
      } else {
        // Others' pixels: softer, different timbre
        gainMultiplier = 0.6;
        oscillatorType = 'triangle';
        frequency *= 0.8; // Slightly lower pitch
      }

      // Configure oscillator
      oscillator.type = oscillatorType;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      // Configure gain envelope (quick attack, exponential decay)
      const currentTime = this.audioContext.currentTime;
      const duration = this.config.pixelPlaceDuration / 1000; // Convert to seconds
      const finalGain = this.config.pixelPlaceGain * gainMultiplier;
      
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(finalGain, currentTime + 0.005); // 5ms attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration); // Exponential decay

      // Start and stop oscillator
      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration);

      // Clean up nodes after sound completes
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };

    } catch (error) {
      console.error('❌ Failed to play pixel place sound:', error);
    }
  }

  /**
   * Convert color hex string to frequency for sound variation
   */
  private getFrequencyFromColor(color: string): number {
    // Remove # if present
    const hex = color.replace('#', '');
    
    // Extract RGB components
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Map RGB to frequency range (600-1200 Hz)
    const brightness = (r + g + b) / 3;
    const frequency = 600 + (brightness / 255) * 600;
    
    return frequency;
  }

  /**
   * Update sound configuration
   */
  public updateConfig(newConfig: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update master volume
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.config.volume;
    }
    
    console.log('⚙️ Sound config updated:', newConfig);
  }

  /**
   * Enable/disable sounds
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🔊 Sound effects ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set master volume
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.config.volume;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): SoundConfig {
    return { ...this.config };
  }

  /**
   * Check if audio is available and enabled
   */
  public isAvailable(): boolean {
    return this.config.enabled && this.audioContext !== null;
  }

  /**
   * Destroy the sound manager
   */
  public destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.masterGainNode = null;
    console.log('✅ Pixel sound manager destroyed');
  }
}