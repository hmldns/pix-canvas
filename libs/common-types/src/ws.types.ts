// WebSocket message types for the Backend Service

// Base message structure
export interface WebSocketMessage<T = any> {
  type: string;
  payload?: T;
}

// Client-to-Server message types
export interface DrawPixelPayload {
  x: number;
  y: number;
  color: string;
}

export interface DrawPixelMessage extends WebSocketMessage<DrawPixelPayload> {
  type: 'DRAW_PIXEL';
  payload: DrawPixelPayload;
}

export interface KeepalivePongMessage extends WebSocketMessage {
  type: 'KEEPALIVE_PONG';
}

// Server-to-Client message types
export interface PixelUpdateData {
  x: number;
  y: number;
  color: string;
  userId: string;
}

export interface PixelUpdatePayload {
  pixels: PixelUpdateData[];
}

export interface PixelUpdateMessage extends WebSocketMessage<PixelUpdatePayload> {
  type: 'PIXEL_UPDATE';
  payload: PixelUpdatePayload;
}

export interface ReloadCanvasMessage extends WebSocketMessage {
  type: 'RELOAD_CANVAS';
}

export interface KeepalivePingMessage extends WebSocketMessage {
  type: 'KEEPALIVE_PING';
}

// Union types for type safety
export type ClientMessage = DrawPixelMessage | KeepalivePongMessage;
export type ServerMessage = PixelUpdateMessage | ReloadCanvasMessage | KeepalivePingMessage;