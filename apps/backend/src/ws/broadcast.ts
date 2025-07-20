import { WebSocket } from 'ws';
import { PixelUpdateMessage } from '@libs/common-types';

/**
 * Pixel update data for batching
 */
export interface PixelUpdate {
  x: number;
  y: number;
  color: string;
  userId: string;
  timestamp: Date;
}

/**
 * Connected client interface for broadcasting
 */
export interface BroadcastClient {
  socket: WebSocket;
  clientId: string;
  userId?: string;
}

/**
 * WebSocket Broadcasting Service with Rate-Limiting and Batching
 * 
 * This service implements a queue-based broadcasting system that batches
 * pixel updates and sends them at a maximum rate of 10Hz to prevent
 * flooding clients during high activity periods.
 */
export class BroadcastService {
  private updateQueue: PixelUpdate[] = [];
  private clients: Map<string, BroadcastClient> = new Map();
  private broadcastInterval: NodeJS.Timer | null = null;
  private isRunning = false;
  
  // Rate limiting: 10Hz = 100ms intervals
  private readonly BROADCAST_INTERVAL_MS = 100;
  
  constructor() {
    console.log('✅ Broadcast service initialized with 10Hz rate limiting');
  }

  /**
   * Start the broadcasting service
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Broadcast service already running');
      return;
    }

    this.isRunning = true;
    this.broadcastInterval = setInterval(() => {
      this.processBroadcastQueue();
    }, this.BROADCAST_INTERVAL_MS);

    console.log(`🚀 Broadcast service started with ${this.BROADCAST_INTERVAL_MS}ms intervals (10Hz)`);
  }

  /**
   * Stop the broadcasting service
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    // Process any remaining items in the queue
    this.processBroadcastQueue();
    
    console.log('🛑 Broadcast service stopped');
  }

  /**
   * Add a client to the broadcast list
   */
  public addClient(clientId: string, socket: WebSocket, userId?: string): void {
    this.clients.set(clientId, {
      socket,
      clientId,
      userId
    });
    
    console.log(`👥 Added client ${clientId} to broadcast list (${this.clients.size} total clients)`);
  }

  /**
   * Remove a client from the broadcast list
   */
  public removeClient(clientId: string): void {
    const removed = this.clients.delete(clientId);
    if (removed) {
      console.log(`👋 Removed client ${clientId} from broadcast list (${this.clients.size} remaining clients)`);
    }
  }

  /**
   * Queue a pixel update for batched broadcasting
   */
  public queuePixelUpdate(pixelUpdate: PixelUpdate): void {
    this.updateQueue.push(pixelUpdate);
    
    console.log(`📥 Queued pixel update: (${pixelUpdate.x},${pixelUpdate.y}) ${pixelUpdate.color} by ${pixelUpdate.userId} (queue size: ${this.updateQueue.length})`);
  }

  /**
   * Get current queue size for monitoring
   */
  public getQueueSize(): number {
    return this.updateQueue.length;
  }

  /**
   * Get number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get broadcasting statistics
   */
  public getStats(): {
    queueSize: number;
    clientCount: number;
    isRunning: boolean;
    intervalMs: number;
  } {
    return {
      queueSize: this.updateQueue.length,
      clientCount: this.clients.size,
      isRunning: this.isRunning,
      intervalMs: this.BROADCAST_INTERVAL_MS
    };
  }

  /**
   * Process the broadcast queue and send batched updates
   * This method runs every 100ms (10Hz) via setInterval
   */
  private processBroadcastQueue(): void {
    if (this.updateQueue.length === 0) {
      // No updates to broadcast
      return;
    }

    // Extract all queued updates and clear the queue
    const updatesToSend = [...this.updateQueue];
    this.updateQueue = [];

    // Create batched message
    const batchedMessage: PixelUpdateMessage = {
      type: 'PIXEL_UPDATE',
      payload: {
        pixels: updatesToSend.map(update => ({
          x: update.x,
          y: update.y,
          color: update.color,
          userId: update.userId
        }))
      }
    };

    const messageString = JSON.stringify(batchedMessage);
    let sentCount = 0;
    let failedCount = 0;

    // Broadcast to all connected clients
    this.clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(messageString);
          sentCount++;
        } catch (error) {
          console.error(`❌ Failed to send message to client ${clientId}:`, error);
          failedCount++;
          // Remove failed client
          this.removeClient(clientId);
        }
      } else {
        // Remove disconnected client
        this.removeClient(clientId);
        failedCount++;
      }
    });

    if (sentCount > 0 || failedCount > 0) {
      console.log(`📡 Broadcasted batch of ${updatesToSend.length} pixel updates to ${sentCount} clients (${failedCount} failed)`);
    }
  }

  /**
   * Force immediate broadcast of queued updates (for testing or emergency)
   */
  public flushQueue(): void {
    console.log('🚨 Force flushing broadcast queue');
    this.processBroadcastQueue();
  }

  /**
   * Clear the queue without broadcasting (for testing)
   */
  public clearQueue(): void {
    const clearedCount = this.updateQueue.length;
    this.updateQueue = [];
    console.log(`🗑️ Cleared ${clearedCount} updates from broadcast queue`);
  }
}

// Global broadcast service instance
let broadcastService: BroadcastService | null = null;

/**
 * Initialize the global broadcast service
 */
export function initializeBroadcastService(): BroadcastService {
  if (broadcastService) {
    console.warn('⚠️ Broadcast service already initialized');
    return broadcastService;
  }

  broadcastService = new BroadcastService();
  broadcastService.start();
  return broadcastService;
}

/**
 * Get the global broadcast service instance
 */
export function getBroadcastService(): BroadcastService | null {
  return broadcastService;
}

/**
 * Shutdown the global broadcast service
 */
export function shutdownBroadcastService(): void {
  if (broadcastService) {
    broadcastService.stop();
    broadcastService = null;
    console.log('🔌 Broadcast service shutdown complete');
  }
}