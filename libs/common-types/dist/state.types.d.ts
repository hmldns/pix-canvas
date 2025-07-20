export interface User {
    userId: string;
    nickname: string;
    color: string;
}
export interface Pixel {
    x: number;
    y: number;
    color: string;
    timestamp: Date;
    userId: string;
}
export interface CanvasState {
    pixels: Map<string, Pixel>;
}
export declare enum ConnectionStatus {
    CONNECTED = "connected",
    CONNECTING = "connecting",
    DISCONNECTED = "disconnected",
    ERROR = "error"
}
export interface AppState {
    user: User | null;
    canvasState: CanvasState;
    connectionStatus: {
        websocket: ConnectionStatus;
        webrtc: ConnectionStatus;
    };
    activeUsers: User[];
    selectedColor: string;
    isDebugMode: boolean;
}
