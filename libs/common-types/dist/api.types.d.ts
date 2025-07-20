export interface CreateUserRequest {
}
export interface CreateUserResponse {
    userId: string;
    nickname: string;
    color: string;
}
export interface GetCurrentUserResponse {
    userId: string;
    nickname: string;
    color: string;
}
export interface GetPixelsRequest {
}
export interface PixelData {
    x: number;
    y: number;
    color: string;
}
export interface GetPixelsResponse {
    pixels: PixelData[];
}
export interface GetPixelsInRegionRequest {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface GetPixelsInRegionResponse {
    pixels: PixelData[];
}
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
    environment: string;
}
export interface ApiError {
    error: string;
    message: string;
    statusCode: number;
}
export interface ApiSuccess<T = any> {
    data: T;
    message?: string;
}
