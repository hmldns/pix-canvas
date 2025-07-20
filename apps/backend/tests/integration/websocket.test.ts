import { createServer, Server } from 'http';
import WebSocket from 'ws';
import { AddressInfo } from 'net';
import { WebSocketService } from '../../src/ws/WebSocketService';
import { BroadcastService } from '../../src/ws/broadcast';
import { Pixel } from '../../src/models/pixel.model';
import { 
  DrawPixelMessage, 
  PixelUpdateMessage, 
  ClientMessage, 
  ServerMessage 
} from '@libs/common-types';

describe('WebSocket Integration Tests', () => {
  let server: Server;
  let wsService: WebSocketService;
  let serverPort: number;
  let serverUrl: string;

  beforeAll(async () => {
    // Create HTTP server for WebSocket testing
    server = createServer();
    
    // Initialize WebSocket service
    wsService = new WebSocketService(server);
    
    // Start server on random port
    server.listen(0);
    
    // Get the assigned port
    const address = server.address() as AddressInfo;
    serverPort = address.port;
    serverUrl = `ws://localhost:${serverPort}/ws`;
    
    console.log(`🧪 Test WebSocket server started on port ${serverPort}`);
  });

  afterAll(async () => {
    // Close WebSocket service
    wsService.close();
    
    // Close HTTP server
    server.close();
    
    console.log('🧪 Test WebSocket server stopped');
  });

  afterEach(async () => {
    // Clear any remaining pixels from database
    await Pixel.deleteMany({});
    
    // Flush broadcast queue to ensure clean state
    wsService.flushBroadcastQueue();
  });

  describe('Single Client Operations', () => {
    test('should connect and receive pixel updates', async () => {
      const client = new WebSocket(serverUrl);
      const messages: ServerMessage[] = [];

      // Collect messages
      client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as ServerMessage;
          messages.push(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      // Wait for connection
      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Send a pixel draw message
      const drawMessage: DrawPixelMessage = {
        type: 'DRAW_PIXEL',
        payload: {
          x: 100,
          y: 200,
          color: '#FF0000'
        }
      };

      client.send(JSON.stringify(drawMessage));

      // Wait for the batched response (should arrive within 100ms + processing time)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force flush to ensure all messages are sent
      wsService.flushBroadcastQueue();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive a PIXEL_UPDATE message
      expect(messages.length).toBeGreaterThan(0);
      
      const pixelUpdate = messages.find(msg => msg.type === 'PIXEL_UPDATE') as PixelUpdateMessage;
      expect(pixelUpdate).toBeDefined();
      expect(pixelUpdate.payload.pixels).toHaveLength(1);
      expect(pixelUpdate.payload.pixels[0]).toMatchObject({
        x: 100,
        y: 200,
        color: '#FF0000'
      });

      // Verify pixel was saved to database
      const savedPixels = await Pixel.find({});
      expect(savedPixels).toHaveLength(1);
      expect(savedPixels[0]).toMatchObject({
        x: 100,
        y: 200,
        color: '#FF0000'
      });

      client.close();
    });

    test('should reject invalid pixel coordinates', async () => {
      const client = new WebSocket(serverUrl);
      const messages: ServerMessage[] = [];

      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        messages.push(message);
      });

      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Send invalid coordinates (out of canvas bounds)
      const invalidMessage: DrawPixelMessage = {
        type: 'DRAW_PIXEL',
        payload: {
          x: -1,
          y: 10000,
          color: '#FF0000'
        }
      };

      client.send(JSON.stringify(invalidMessage));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should receive an error message
      const errorMessage = messages.find(msg => msg.type === 'ERROR');
      expect(errorMessage).toBeDefined();

      // Should not save to database
      const savedPixels = await Pixel.find({});
      expect(savedPixels).toHaveLength(0);

      client.close();
    });
  });

  describe('Multiple Concurrent Clients', () => {
    test('should handle multiple clients drawing simultaneously', async () => {
      const clientCount = 5;
      const pixelsPerClient = 3;
      const clients: WebSocket[] = [];
      const allMessages: ServerMessage[][] = [];

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = new WebSocket(serverUrl);
        const messages: ServerMessage[] = [];
        
        client.on('message', (data) => {
          const message = JSON.parse(data.toString()) as ServerMessage;
          messages.push(message);
        });

        clients.push(client);
        allMessages.push(messages);

        // Wait for connection
        await new Promise<void>((resolve) => {
          client.on('open', resolve);
        });
      }

      console.log(`🧪 ${clientCount} clients connected, starting concurrent drawing test`);

      // All clients draw pixels simultaneously
      const drawPromises = clients.map((client, clientIndex) => {
        const clientPromises = [];
        
        for (let pixelIndex = 0; pixelIndex < pixelsPerClient; pixelIndex++) {
          const drawMessage: DrawPixelMessage = {
            type: 'DRAW_PIXEL',
            payload: {
              x: clientIndex * 10 + pixelIndex,
              y: clientIndex * 10 + pixelIndex,
              color: `#${(clientIndex * 50 + pixelIndex * 10).toString(16).padStart(6, '0')}`
            }
          };

          clientPromises.push(
            new Promise<void>((resolve) => {
              client.send(JSON.stringify(drawMessage));
              setTimeout(resolve, 10); // Small delay between messages
            })
          );
        }
        
        return Promise.all(clientPromises);
      });

      // Wait for all draws to complete
      await Promise.all(drawPromises);

      // Wait for broadcast processing
      await new Promise(resolve => setTimeout(resolve, 300));
      wsService.flushBroadcastQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🧪 Verifying results...');

      // Verify all pixels were saved to database
      const savedPixels = await Pixel.find({}).sort({ x: 1, y: 1 });
      expect(savedPixels).toHaveLength(clientCount * pixelsPerClient);

      // Verify each client received updates for all pixels
      for (let clientIndex = 0; clientIndex < clientCount; clientIndex++) {
        const clientMessages = allMessages[clientIndex];
        const pixelUpdates = clientMessages.filter(msg => msg.type === 'PIXEL_UPDATE') as PixelUpdateMessage[];
        
        // Count total pixels received across all update messages
        const totalPixelsReceived = pixelUpdates.reduce((sum, update) => 
          sum + update.payload.pixels.length, 0
        );
        
        expect(totalPixelsReceived).toBe(clientCount * pixelsPerClient);
      }

      // Verify broadcast statistics
      const broadcastStats = wsService.getBroadcastStats();
      expect(broadcastStats.clientCount).toBe(clientCount);
      expect(broadcastStats.isRunning).toBe(true);
      expect(broadcastStats.intervalMs).toBe(100); // 10Hz

      // Close all clients
      clients.forEach(client => client.close());
    });

    test('should handle client disconnections during high activity', async () => {
      const clientCount = 4;
      const clients: WebSocket[] = [];
      const connectedMessages: ServerMessage[][] = [];

      // Connect all clients
      for (let i = 0; i < clientCount; i++) {
        const client = new WebSocket(serverUrl);
        const messages: ServerMessage[] = [];
        
        client.on('message', (data) => {
          const message = JSON.parse(data.toString()) as ServerMessage;
          messages.push(message);
        });

        clients.push(client);
        connectedMessages.push(messages);

        await new Promise<void>((resolve) => {
          client.on('open', resolve);
        });
      }

      // Start drawing with all clients
      const drawingPromises = clients.map((client, index) => {
        return new Promise<void>((resolve) => {
          const drawMessage: DrawPixelMessage = {
            type: 'DRAW_PIXEL',
            payload: {
              x: index * 5,
              y: index * 5,
              color: '#00FF00'
            }
          };
          client.send(JSON.stringify(drawMessage));
          resolve();
        });
      });

      await Promise.all(drawingPromises);

      // Disconnect half the clients while activity is happening
      const clientsToDisconnect = clients.slice(0, Math.floor(clientCount / 2));
      clientsToDisconnect.forEach(client => client.close());

      // Continue drawing with remaining clients
      const remainingClients = clients.slice(Math.floor(clientCount / 2));
      const continuedDrawing = remainingClients.map((client, index) => {
        return new Promise<void>((resolve) => {
          const drawMessage: DrawPixelMessage = {
            type: 'DRAW_PIXEL',
            payload: {
              x: 100 + index,
              y: 100 + index,
              color: '#0000FF'
            }
          };
          client.send(JSON.stringify(drawMessage));
          resolve();
        });
      });

      await Promise.all(continuedDrawing);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      wsService.flushBroadcastQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the system handled disconnections gracefully
      const broadcastStats = wsService.getBroadcastStats();
      expect(broadcastStats.clientCount).toBe(remainingClients.length);

      // Verify pixels were still saved correctly
      const savedPixels = await Pixel.find({});
      expect(savedPixels.length).toBeGreaterThan(0);

      // Close remaining clients
      remainingClients.forEach(client => client.close());
    });
  });

  describe('Rate Limiting and Batching', () => {
    test('should batch multiple rapid pixel updates', async () => {
      const client = new WebSocket(serverUrl);
      const messages: ServerMessage[] = [];

      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        messages.push(message);
      });

      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Send multiple pixels rapidly (faster than 10Hz)
      const rapidDraws = 10;
      for (let i = 0; i < rapidDraws; i++) {
        const drawMessage: DrawPixelMessage = {
          type: 'DRAW_PIXEL',
          payload: {
            x: i,
            y: i,
            color: '#FFFF00'
          }
        };
        client.send(JSON.stringify(drawMessage));
      }

      // Wait for batch processing (multiple 100ms intervals)
      await new Promise(resolve => setTimeout(resolve, 300));
      wsService.flushBroadcastQueue();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive batched updates (fewer messages than individual pixels)
      const pixelUpdates = messages.filter(msg => msg.type === 'PIXEL_UPDATE') as PixelUpdateMessage[];
      expect(pixelUpdates.length).toBeLessThan(rapidDraws);

      // But total pixels should match
      const totalPixelsReceived = pixelUpdates.reduce((sum, update) => 
        sum + update.payload.pixels.length, 0
      );
      expect(totalPixelsReceived).toBe(rapidDraws);

      // Verify all pixels saved to database
      const savedPixels = await Pixel.find({});
      expect(savedPixels).toHaveLength(rapidDraws);

      client.close();
    });

    test('should respect 10Hz broadcast rate', async () => {
      const client = new WebSocket(serverUrl);
      const messageTimestamps: number[] = [];

      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        if (message.type === 'PIXEL_UPDATE') {
          messageTimestamps.push(Date.now());
        }
      });

      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Send pixels continuously for 500ms
      const testDuration = 500;
      const startTime = Date.now();
      
      const drawInterval = setInterval(() => {
        if (Date.now() - startTime > testDuration) {
          clearInterval(drawInterval);
          return;
        }

        const drawMessage: DrawPixelMessage = {
          type: 'DRAW_PIXEL',
          payload: {
            x: Math.floor(Math.random() * 100),
            y: Math.floor(Math.random() * 100),
            color: '#FF00FF'
          }
        };
        client.send(JSON.stringify(drawMessage));
      }, 10); // Draw every 10ms (much faster than broadcast rate)

      // Wait for test to complete plus processing time
      await new Promise(resolve => setTimeout(resolve, testDuration + 200));
      wsService.flushBroadcastQueue();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify broadcast rate doesn't exceed 10Hz (100ms intervals)
      expect(messageTimestamps.length).toBeGreaterThan(1);
      
      // Check intervals between messages
      for (let i = 1; i < messageTimestamps.length; i++) {
        const interval = messageTimestamps[i] - messageTimestamps[i - 1];
        // Should be approximately 100ms (allow some tolerance)
        expect(interval).toBeGreaterThanOrEqual(80);
        expect(interval).toBeLessThan(200);
      }

      client.close();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle malformed messages gracefully', async () => {
      const client = new WebSocket(serverUrl);
      const messages: ServerMessage[] = [];

      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        messages.push(message);
      });

      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Send malformed JSON
      client.send('invalid json');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive error message
      const errorMessage = messages.find(msg => msg.type === 'ERROR');
      expect(errorMessage).toBeDefined();

      // Connection should still be alive for valid messages
      const validMessage: DrawPixelMessage = {
        type: 'DRAW_PIXEL',
        payload: {
          x: 50,
          y: 50,
          color: '#00FFFF'
        }
      };

      client.send(JSON.stringify(validMessage));
      await new Promise(resolve => setTimeout(resolve, 150));
      wsService.flushBroadcastQueue();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should receive pixel update
      const pixelUpdate = messages.find(msg => msg.type === 'PIXEL_UPDATE');
      expect(pixelUpdate).toBeDefined();

      client.close();
    });

    test('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the system doesn't crash with invalid data
      
      const client = new WebSocket(serverUrl);
      const messages: ServerMessage[] = [];

      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        messages.push(message);
      });

      await new Promise<void>((resolve) => {
        client.on('open', resolve);
      });

      // Send message with invalid color format
      const invalidColorMessage: DrawPixelMessage = {
        type: 'DRAW_PIXEL',
        payload: {
          x: 25,
          y: 25,
          color: 'not-a-color'
        }
      };

      client.send(JSON.stringify(invalidColorMessage));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should receive error message
      const errorMessage = messages.find(msg => msg.type === 'ERROR');
      expect(errorMessage).toBeDefined();

      // No pixel should be saved
      const savedPixels = await Pixel.find({});
      expect(savedPixels).toHaveLength(0);

      client.close();
    });
  });
});