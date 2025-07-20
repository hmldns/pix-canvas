import { SignalingApp } from './app';

// Configuration
const PORT = process.env.SIGNALING_PORT || 3003;
const HOST = process.env.SIGNALING_HOST || 'localhost';

// Create and start the signaling server
async function startServer() {
  try {
    console.log('🚀 Starting Pixel Canvas Signaling Service...');
    
    // Create the signaling app
    const signalingApp = new SignalingApp();
    const server = signalingApp.getServer();
    
    // Start listening
    server.listen(PORT, () => {
      console.log(`✅ Signaling service listening on ${HOST}:${PORT}`);
      console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
      console.log(`🔍 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📋 API info: http://${HOST}:${PORT}/api/info`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📥 SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📥 SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start signaling service:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();