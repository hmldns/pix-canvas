import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { SignalingService } from './ws/SignalingService';

export class SignalingApp {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private signalingService: SignalingService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.signalingService = new SignalingService(this.server);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all origins (adjust in production)
    this.app.use(cors({
      origin: '*',
      credentials: true
    }));

    // Parse JSON requests
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        service: 'signaling-server',
        timestamp: new Date().toISOString(),
        connectedClients: this.signalingService.getConnectedClientsCount()
      });
    });

    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'Pixel Canvas Signaling Service',
        version: '1.0.0',
        description: 'WebRTC signaling service for peer-to-peer communication',
        endpoints: {
          health: '/health',
          websocket: '/ws'
        }
      });
    });

    // Default route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Pixel Canvas Signaling Service',
        websocket: '/ws'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`
      });
    });
  }

  public getServer() {
    return this.server;
  }

  public getApp() {
    return this.app;
  }

  public getSignalingService() {
    return this.signalingService;
  }
}