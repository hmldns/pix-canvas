export interface WebSocketMessage<T = any> {
    type: string;
    payload?: T;
}
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
export type ClientMessage = DrawPixelMessage | KeepalivePongMessage;
export type ServerMessage = PixelUpdateMessage | ReloadCanvasMessage | KeepalivePingMessage;
