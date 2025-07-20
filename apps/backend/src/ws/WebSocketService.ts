import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { Pixel } from '../models/pixel.model';
import { User } from '../models/user.model';
import { isValidCanvasCoordinate, isValidHexColor } from '@libs/utils';
import { 
  ClientMessage, 
  ServerMessage, 
  DrawPixelMessage, 
  PixelUpdateMessage,
  KeepalivePingMessage,
  WebSocketMessage 
} from '@libs/common-types';
import { BroadcastService, initializeBroadcastService, getBroadcastService } from './broadcast';
import { captureException, addBreadcrumb, setUserContext } from '../config/sentry';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface ConnectedClient {
  socket: ExtendedWebSocket;
  userId?: string;
  connectedAt: Date;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timer | null = null;
  private broadcastService: BroadcastService;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    // Initialize broadcast service
    this.broadcastService = initializeBroadcastService();

    this.setupWebSocketServer();
    this.startPingInterval();
    
    console.log('✅ WebSocket server initialized on /ws with rate-limited broadcasting');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: ExtendedWebSocket, request) => {
      this.handleNewConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
      captureException(error, { context: 'websocket_server' });
    });
  }

  private handleNewConnection(socket: ExtendedWebSocket, request: any): void {
    const clientId = this.generateClientId();
    socket.isAlive = true;

    // Store client connection
    this.clients.set(clientId, {
      socket,
      connectedAt: new Date(),
    });

    // Add client to broadcast service
    this.broadcastService.addClient(clientId, socket);

    console.log(`🔗 New WebSocket connection: ${clientId} (${this.clients.size} total clients)`);
    addBreadcrumb(
      `New WebSocket connection: ${clientId}`,
      'websocket',
      { clientId, totalClients: this.clients.size }
    );

    // Handle incoming messages
    socket.on('message', async (data: Buffer) => {
      try {
        await this.handleMessage(clientId, data);
      } catch (error) {
        console.error(`❌ Error handling message from ${clientId}:`, error);
        captureException(error as Error, { 
          context: 'websocket_message_handling',
          clientId,
          messageSize: data.length 
        });
        this.sendErrorMessage(socket, 'Invalid message format');
      }
    });

    // Handle client disconnect
    socket.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    // Handle pong responses for keepalive
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ WebSocket client error for ${clientId}:`, error);
      captureException(error, { 
        context: 'websocket_client_error',
        clientId 
      });
      this.handleDisconnection(clientId, 1006, Buffer.from('Connection error'));
    });
  }

  private async handleMessage(clientId: string, data: Buffer): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`⚠️ Message from unknown client: ${clientId}`);
      return;
    }

    let message: ClientMessage;
    try {
      message = JSON.parse(data.toString()) as ClientMessage;
    } catch (error) {
      console.error(`❌ Invalid JSON from client ${clientId}:`, error);
      this.sendErrorMessage(client.socket, 'Invalid JSON format');
      return;
    }

    console.log(`📨 Received message from ${clientId}:`, message.type);

    switch (message.type) {
      case 'DRAW_PIXEL':
        await this.handleDrawPixel(clientId, message as DrawPixelMessage);
        break;
      
      case 'KEEPALIVE_PONG':
        client.socket.isAlive = true;
        console.log(`💓 Keepalive pong from ${clientId}`);
        break;
      
      default:
        console.warn(`⚠️ Unknown message type from ${clientId}:`, message.type);
        this.sendErrorMessage(client.socket, `Unknown message type: ${message.type}`);
    }
  }

  private async handleDrawPixel(clientId: string, message: DrawPixelMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Validate payload
      const { x, y, color } = message.payload;
      
      if (!this.validateDrawPixelPayload(x, y, color)) {
        this.sendErrorMessage(client.socket, 'Invalid pixel data');
        return;
      }

      // For now, use a default user ID if client doesn't have one
      // In a future implementation, this would come from authentication
      let userId = client.userId;
      if (!userId) {
        userId = await this.getOrCreateDefaultUser();
        client.userId = userId;
      }

      console.log(`🎨 Processing DRAW_PIXEL from ${clientId}: (${x},${y}) ${color}`);
      addBreadcrumb(
        `Pixel drawn: (${x},${y}) ${color}`,
        'pixel',
        { clientId, x, y, color }
      );

      // Create and save pixel to database
      const pixel = new Pixel({
        x,
        y,
        color,
        userId,
        timestamp: new Date(),
      });

      await pixel.save();
      console.log(`✅ Pixel saved to database: (${x},${y}) ${color} by ${userId}`);

      // Queue pixel update for batched broadcasting
      this.broadcastService.queuePixelUpdate({
        x: pixel.x,
        y: pixel.y,
        color: pixel.color,
        userId: pixel.userId,
        timestamp: pixel.timestamp,
      });

    } catch (error) {
      console.error(`❌ Error processing DRAW_PIXEL from ${clientId}:`, error);
      captureException(error as Error, { 
        context: 'pixel_processing',
        clientId,
        pixelData: { x, y, color }
      });
      this.sendErrorMessage(client.socket, 'Failed to save pixel');
    }
  }

  private validateDrawPixelPayload(x: any, y: any, color: any): boolean {
    return (
      typeof x === 'number' &&
      typeof y === 'number' &&
      typeof color === 'string' &&
      isValidCanvasCoordinate(x, y) &&
      isValidHexColor(color)
    );
  }

  private async getOrCreateDefaultUser(): Promise<string> {
    // For now, return a default user ID
    // In a real implementation, this would be handled by authentication
    return 'anonymous-user';
  }


  private handleDisconnection(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (client) {
      const duration = Date.now() - client.connectedAt.getTime();
      console.log(`🔌 Client ${clientId} disconnected (code: ${code}, duration: ${duration}ms, remaining: ${this.clients.size - 1})`);
      
      // Remove from broadcast service
      this.broadcastService.removeClient(clientId);
      
      this.clients.delete(clientId);
    }
  }

  private sendErrorMessage(socket: WebSocket, message: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'ERROR',
        payload: { message },
      }));
    }
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPingInterval(): void {
    // Send ping every 30 seconds to detect dead connections
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.socket.isAlive) {
          console.log(`💀 Terminating dead connection: ${clientId}`);
          client.socket.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.socket.isAlive = false;
        
        if (client.socket.readyState === WebSocket.OPEN) {
          const pingMessage: KeepalivePingMessage = {
            type: 'KEEPALIVE_PING',
          };
          client.socket.send(JSON.stringify(pingMessage));
        }
      });
    }, 30000);
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public getConnectedClients(): Array<{ clientId: string; userId?: string; connectedAt: Date }> {
    const result: Array<{ clientId: string; userId?: string; connectedAt: Date }> = [];
    this.clients.forEach((client, clientId) => {
      result.push({
        clientId,
        userId: client.userId,
        connectedAt: client.connectedAt,
      });
    });
    return result;
  }

  /**
   * Get broadcast service statistics
   */
  public getBroadcastStats(): {
    queueSize: number;
    clientCount: number;
    isRunning: boolean;
    intervalMs: number;
  } {
    return this.broadcastService.getStats();
  }

  /**
   * Force flush the broadcast queue (for testing)
   */
  public flushBroadcastQueue(): void {
    this.broadcastService.flushQueue();
  }

  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Stop broadcast service
    this.broadcastService.stop();

    this.clients.forEach((client) => {
      client.socket.close();
    });
    
    this.wss.close();
    console.log('🔌 WebSocket server closed');
  }
}

// Global WebSocket service instance
let wsService: WebSocketService | null = null;

export function initializeWebSocketServer(server: Server): WebSocketService {
  if (wsService) {
    console.warn('⚠️ WebSocket server already initialized');
    return wsService;
  }

  wsService = new WebSocketService(server);
  return wsService;
}

export function getWebSocketService(): WebSocketService | null {
  return wsService;
}