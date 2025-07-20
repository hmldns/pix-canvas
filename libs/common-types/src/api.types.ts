// REST API types for the Infinite Pixel Canvas project

// User creation endpoint types
export interface CreateUserRequest {
  // No body needed - user is created automatically
}

export interface CreateUserResponse {
  userId: string;
  nickname: string;
  color: string;
}

// Current user endpoint types
export interface GetCurrentUserResponse {
  userId: string;
  nickname: string;
  color: string;
}

// Pixel fetch endpoint types
export interface GetPixelsRequest {
  // No body needed - fetches entire canvas
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
}

export interface GetPixelsResponse {
  pixels: PixelData[];
}

// Pixel region fetch endpoint types
export interface GetPixelsInRegionRequest {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GetPixelsInRegionResponse {
  pixels: PixelData[];
}

// Health check endpoint types
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  environment: string;
}

// Common API error response
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Success response wrapper
export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
}