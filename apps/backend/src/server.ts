import http from 'http';
import app from './app';
import config from './config';
import { connectToDatabase } from './services/database.service';
import { initializeWebSocketServer } from './ws/WebSocketService';

async function startServer() {
  try {
    console.log('🚀 Starting Infinite Pixel Canvas Backend Server...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Database connected successfully');
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize WebSocket server
    initializeWebSocketServer(server);
    console.log('✅ WebSocket server initialized');
    
    // Start listening
    server.listen(config.port, () => {
      console.log(`✅ Backend server listening on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🔧 Debug mode: ${config.debug ? 'enabled' : 'disabled'}`);
      console.log(`📊 Health check available at: http://localhost:${config.port}/health`);
      
      if (config.sentryDsn) {
        console.log('📈 Sentry error tracking enabled');
      }
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };