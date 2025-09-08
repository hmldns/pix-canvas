import {
  CreateUserResponse,
  GetPixelsResponse,
  GetCurrentUserResponse,
  ApiError,
  PixelData,
} from '@libs/common-types';
import { config as appConfig } from '@/config/config';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export class ApiService {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    // Priority: 1) Explicit config, 2) Window object, 3) Smart runtime detection
    let baseUrl = appConfig.api.baseUrl;
    
    if (!baseUrl) {
      // Fallback to runtime detection if no environment variable is set
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      baseUrl = isLocalhost ? 'http://localhost:3001' : '/api';
    }
    
    this.config = {
      baseUrl,
      timeout: 10000,
      ...config,
    };

    console.log('✅ API Service initialized with base URL:', this.config.baseUrl);
  }

  /**
   * Create a new user session
   */
  public async createUser(): Promise<CreateUserResponse> {
    console.log('👤 Creating new user session...');

    try {
      const response = await this.fetchWithTimeout('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const userData: CreateUserResponse = await response.json();
      console.log('✅ User created successfully:', userData);
      
      // Store user info in localStorage for persistence
      localStorage.setItem('pixelCanvasUser', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Get current user information
   */
  public async getCurrentUser(): Promise<GetCurrentUserResponse> {
    console.log('👤 Fetching current user...');

    try {
      const response = await this.fetchWithTimeout('/api/users/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const userData: GetCurrentUserResponse = await response.json();
      console.log('✅ Current user fetched:', userData);
      
      // Update localStorage
      localStorage.setItem('pixelCanvasUser', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('❌ Failed to fetch current user:', error);
      throw error;
    }
  }

  /**
   * Fetch the current state of the entire canvas
   */
  public async getCanvasPixels(): Promise<PixelData[]> {
    console.log('🎨 Fetching canvas pixels...');

    try {
      const response = await this.fetchWithTimeout('/api/pixels', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data: GetPixelsResponse = await response.json();
      console.log(`✅ Fetched ${data.pixels.length} pixels from canvas`);
      
      return data.pixels;
    } catch (error) {
      console.error('❌ Failed to fetch canvas pixels:', error);
      throw error;
    }
  }

  /**
   * Fetch the current state of the entire canvas in binary format
   */
  public async getCanvasPixelsBinary(): Promise<PixelData[]> {
    console.log('🎨 Fetching canvas pixels (binary format)...');

    try {
      const response = await this.fetchWithTimeout('/api/pixels/binary', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      // Get pixel count from header
      const pixelCount = parseInt(response.headers.get('X-Pixel-Count') || '0', 10);
      
      // Get binary data
      const buffer = await response.arrayBuffer();
      const view = new DataView(buffer);
      const pixels: PixelData[] = [];
      
      // Parse 8-byte aligned pixel data
      for (let i = 0; i < buffer.byteLength; i += 8) {
        const x = view.getUint16(i, true); // little-endian
        const y = view.getUint16(i + 2, true); // little-endian
        const r = view.getUint8(i + 4);
        const g = view.getUint8(i + 5);
        const b = view.getUint8(i + 6);
        // Skip padding byte at i + 7
        
        // Convert RGB back to hex color
        const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        pixels.push({ x, y, color });
      }
      
      console.log(`✅ Fetched ${pixels.length} pixels from canvas (binary: ${buffer.byteLength} bytes)`);
      
      return pixels;
    } catch (error) {
      console.error('❌ Failed to fetch canvas pixels (binary):', error);
      throw error;
    }
  }

  /**
   * Fetch pixels in a specific region (for optimization in future)
   */
  public async getPixelsInRegion(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Promise<PixelData[]> {
    console.log(`🎨 Fetching pixels in region (${minX},${minY}) to (${maxX},${maxY})...`);

    try {
      const params = new URLSearchParams({
        minX: minX.toString(),
        minY: minY.toString(),
        maxX: maxX.toString(),
        maxY: maxY.toString(),
      });

      const response = await this.fetchWithTimeout(`/api/pixels/region?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      const data: GetPixelsResponse = await response.json();
      console.log(`✅ Fetched ${data.pixels.length} pixels from region`);
      
      return data.pixels;
    } catch (error) {
      console.error('❌ Failed to fetch region pixels:', error);
      throw error;
    }
  }

  /**
   * Initialize user session (create new user or fetch existing)
   */
  public async initializeSession(): Promise<CreateUserResponse> {
    console.log('🔑 Initializing user session...');

    try {
      // Try to get current user first (if session exists)
      const currentUser = await this.getCurrentUser();
      return currentUser;
    } catch (error) {
      // If no session exists, create a new user
      console.log('📝 No existing session, creating new user...');
      return await this.createUser();
    }
  }

  /**
   * Get cached user from localStorage
   */
  public getCachedUser(): CreateUserResponse | null {
    try {
      const cached = localStorage.getItem('pixelCanvasUser');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('⚠️ Failed to parse cached user data:', error);
      return null;
    }
  }

  /**
   * Clear cached user data
   */
  public clearCachedUser(): void {
    localStorage.removeItem('pixelCanvasUser');
    console.log('🗑️ Cached user data cleared');
  }

  /**
   * Check API health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout('/health', {
        method: 'GET',
      });
      
      const isHealthy = response.ok;
      console.log(`💚 API health check: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      return isHealthy;
    } catch (error) {
      console.error('❌ API health check failed:', error);
      return false;
    }
  }

  /**
   * Private helper: Fetch with timeout
   */
  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Private helper: Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    try {
      const errorData: ApiError = await response.json();
      return new Error(`API Error ${errorData.statusCode}: ${errorData.message}`);
    } catch (parseError) {
      return new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for custom instances if needed
export default ApiService;