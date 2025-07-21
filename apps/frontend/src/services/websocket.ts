import {
  ClientMessage,
  ServerMessage,
  DrawPixelMessage,
  PixelUpdateMessage,
  ReloadCanvasMessage,
  KeepalivePingMessage,
  PixelUpdateData,
} from '@libs/common-types';
import { captureException, addBreadcrumb } from '../config/sentry';
import { config as appConfig } from '@/config/config';

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
}

export interface WebSocketEventHandlers {
  onPixelUpdate?: (pixels: PixelUpdateData[]) => void;
  onReloadCanvas?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onReconnecting?: (attempt: number) => void;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export class WebSocketService {
  private config: WebSocketConfig;
  private handlers: WebSocketEventHandlers = {};
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private lastPingTime = 0;

  constructor(config: Partial<WebSocketConfig> = {}, handlers: WebSocketEventHandlers = {}) {
    // Priority: 1) Explicit config, 2) Window object, 3) Environment variable
    let wsUrl = appConfig.websocket.url;

    // If the URL is not absolute, build it from the current page's location
    if (wsUrl && !wsUrl.startsWith('ws:') && !wsUrl.startsWith('wss:')) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}${wsUrl}`;
    } else if (!wsUrl) {
      // Fallback for local development if no variable is set
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;
    }
    
    this.config = {
      url: wsUrl,
      reconnectAttempts: 5,
      reconnectDelay: 3000,
      heartbeatInterval: 30000,
      ...config,
    };

    this.handlers = handlers;
    console.log('✅ WebSocket service initialized with URL:', this.config.url);
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.status === ConnectionStatus.CONNECTED || this.status === ConnectionStatus.CONNECTING) {
      console.warn('⚠️ WebSocket already connected or connecting');
      return;
    }

    this.setStatus(ConnectionStatus.CONNECTING);
    console.log('🔌 Connecting to WebSocket server...');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.setStatus(ConnectionStatus.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    console.log('🔌 Disconnecting from WebSocket server...');

    this.clearTimers();
    this.reconnectAttempt = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  /**
   * Send a DRAW_PIXEL message
   */
  public drawPixel(x: number, y: number, color: string): boolean {
    if (!this.isConnected()) {
      console.error('❌ Cannot draw pixel: WebSocket not connected');
      return false;
    }

    const message: DrawPixelMessage = {
      type: 'DRAW_PIXEL',
      payload: { x, y, color },
    };

    return this.sendMessage(message);
  }

  /**
   * Send a generic message
   */
  public sendMessage(message: ClientMessage): boolean {
    if (!this.isConnected() || !this.ws) {
      console.error('❌ Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
      console.log('📤 Sent message:', message.type);
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      captureException(error as Error, {
        websocket_send: {
          messageType: message.type,
          url: this.config.url,
          status: this.status
        }
      });
      return false;
    }
  }

  /**
   * Update event handlers
   */
  public updateHandlers(newHandlers: Partial<WebSocketEventHandlers>): void {
    this.handlers = { ...this.handlers, ...newHandlers };
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    status: ConnectionStatus;
    reconnectAttempt: number;
    lastPingTime: number;
    url: string;
  } {
    return {
      status: this.status,
      reconnectAttempt: this.reconnectAttempt,
      lastPingTime: this.lastPingTime,
      url: this.config.url,
    };
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      addBreadcrumb('WebSocket connected', 'websocket', {
        url: this.config.url,
        attempt: this.reconnectAttempt
      });
      this.setStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      this.handlers.onConnect?.();
    };

    this.ws.onclose = (event) => {
      console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
      this.clearTimers();
      
      if (event.code !== 1000) { // Not a normal close
        this.setStatus(ConnectionStatus.ERROR);
        this.scheduleReconnect();
      } else {
        this.setStatus(ConnectionStatus.DISCONNECTED);
      }
      
      this.handlers.onDisconnect?.();
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      captureException(new Error('WebSocket connection error'), {
        websocket: {
          url: this.config.url,
          status: this.status,
          reconnectAttempt: this.reconnectAttempt
        }
      });
      this.setStatus(ConnectionStatus.ERROR);
      this.handlers.onError?.(error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: ServerMessage = JSON.parse(data);
      console.log('📥 Received message:', message.type);

      switch (message.type) {
        case 'PIXEL_UPDATE':
          this.handlePixelUpdate(message as PixelUpdateMessage);
          break;

        case 'RELOAD_CANVAS':
          this.handleReloadCanvas(message as ReloadCanvasMessage);
          break;

        case 'KEEPALIVE_PING':
          this.handleKeepalivePing(message as KeepalivePingMessage);
          break;

        default:
          console.warn('⚠️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle PIXEL_UPDATE messages
   */
  private handlePixelUpdate(message: PixelUpdateMessage): void {
    const pixels = message.payload.pixels;
    console.log(`🎨 Received pixel update: ${pixels.length} pixels`);
    this.handlers.onPixelUpdate?.(pixels);
  }

  /**
   * Handle RELOAD_CANVAS messages
   */
  private handleReloadCanvas(message: ReloadCanvasMessage): void {
    console.log('🔄 Received canvas reload request');
    this.handlers.onReloadCanvas?.();
  }

  /**
   * Handle KEEPALIVE_PING messages
   */
  private handleKeepalivePing(message: KeepalivePingMessage): void {
    this.lastPingTime = Date.now();
    console.log('💓 Received keepalive ping, sending pong');
    
    // Send pong response
    this.sendMessage({
      type: 'KEEPALIVE_PONG',
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      const timeSinceLastPing = Date.now() - this.lastPingTime;
      
      if (timeSinceLastPing > this.config.heartbeatInterval * 2) {
        console.warn('⚠️ No heartbeat received, connection may be dead');
        this.disconnect();
        this.scheduleReconnect();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.config.reconnectAttempts) {
      console.error('❌ Maximum reconnection attempts reached');
      this.setStatus(ConnectionStatus.ERROR);
      return;
    }

    this.reconnectAttempt++;
    this.setStatus(ConnectionStatus.RECONNECTING);
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts} in ${this.config.reconnectDelay}ms`);
    
    this.handlers.onReconnecting?.(this.reconnectAttempt);

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts}`);
      this.connect();
    }, this.config.reconnectDelay);
  }

  /**
   * Set connection status and notify handlers
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      console.log(`📡 WebSocket status changed to: ${status}`);
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Destroy the WebSocket service
   */
  public destroy(): void {
    console.log('🗑️ Destroying WebSocket service');
    this.disconnect();
    this.handlers = {};
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

// Export class for custom instances if needed
export default WebSocketService;