// Core data entity types for the Infinite Pixel Canvas project

// User entity
export interface User {
  userId: string;
  nickname: string;
  color: string;
}

// Pixel entity (for database storage)
export interface Pixel {
  x: number;
  y: number;
  color: string;
  timestamp: Date;
  userId: string;
}

// Canvas state representation
export interface CanvasState {
  pixels: Map<string, Pixel>; // key: "x,y"
}

// Connection states
export enum ConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// Application state types
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