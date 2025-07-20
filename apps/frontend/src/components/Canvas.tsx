import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasRenderer } from '@canvas/rendering/CanvasRenderer';
import { CursorRenderer } from '@canvas/rendering/CursorRenderer';
import { StateSynchronizer } from '@canvas/state/stateSync';
import { InputController } from '@canvas/interaction/inputController';
import { apiService } from '@services/api';
import { webSocketService, ConnectionStatus } from '@services/websocket';
import { webRTCService } from '@services/webrtc';
import { PixelUpdateData, CursorUpdateData, ChatMessageData } from '@libs/common-types';
import { useTheme } from '@contexts/ThemeContext';

interface CanvasProps {
  className?: string;
}

const Canvas: React.FC<CanvasProps> = ({ className = '' }) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const stateSyncRef = useRef<StateSynchronizer | null>(null);
  const inputControllerRef = useRef<InputController | null>(null);
  const cursorRendererRef = useRef<CursorRenderer | null>(null);

  // State for canvas data and connection
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [pixelCount, setPixelCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [webRTCConnected, setWebRTCConnected] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  /**
   * Initialize user session and fetch initial canvas data
   */
  const initializeCanvas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing canvas...');

      // Initialize user session
      const user = await apiService.initializeSession();
      console.log('👤 User session initialized:', user);

      // Set initial color from user
      setSelectedColor(user.color);

      // Fetch initial canvas state
      const pixels = await apiService.getCanvasPixels();
      console.log(`🎨 Loaded ${pixels.length} initial pixels`);

      // Update state synchronizer with initial pixels
      if (stateSyncRef.current) {
        const pixelUpdateData: PixelUpdateData[] = pixels.map(pixel => ({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          userId: 'unknown', // API response doesn't include userId for existing pixels
        }));
        
        stateSyncRef.current.syncCanvasState(pixelUpdateData);
        setPixelCount(pixels.length);
      }

      console.log('✅ Canvas initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize canvas:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize canvas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle incoming pixel updates from WebSocket
   */
  const handlePixelUpdate = useCallback((pixels: PixelUpdateData[]) => {
    console.log(`📥 Received ${pixels.length} pixel updates`);
    
    if (stateSyncRef.current) {
      stateSyncRef.current.syncPixelUpdates(pixels);
      setPixelCount(prev => prev + pixels.length);
    }
  }, []);

  /**
   * Handle canvas reload request
   */
  const handleCanvasReload = useCallback(async () => {
    console.log('🔄 Reloading canvas state...');
    await initializeCanvas();
  }, [initializeCanvas]);

  /**
   * Handle successful drawing
   */
  const handlePixelDraw = useCallback((x: number, y: number, color: string) => {
    console.log(`✏️ Drew pixel at (${x}, ${y}) with color ${color}`);
    // The pixel will be reflected back via WebSocket update
  }, []);

  /**
   * Handle connection status changes
   */
  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    console.log(`📡 Connection status: ${status}`);
  }, []);

  /**
   * Initialize PixiJS renderer and related systems
   */
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🎨 Initializing Canvas systems...');

    // Initialize PixiJS renderer with theme-aware background
    const backgroundColor = theme === 'dark' ? 0x1f2937 : 0xf8fafc; // Dark gray for dark mode, light gray for light mode
    const renderer = new CanvasRenderer({
      backgroundColor,
    });
    renderer.mount(containerRef.current);
    rendererRef.current = renderer;

    // Initialize state synchronizer
    const stateSync = new StateSynchronizer(renderer);
    stateSyncRef.current = stateSync;

    // Setup WebSocket event handlers
    webSocketService.updateHandlers({
      onPixelUpdate: handlePixelUpdate,
      onReloadCanvas: handleCanvasReload,
      onConnect: () => handleConnectionStatusChange(ConnectionStatus.CONNECTED),
      onDisconnect: () => handleConnectionStatusChange(ConnectionStatus.DISCONNECTED),
      onError: () => handleConnectionStatusChange(ConnectionStatus.ERROR),
      onReconnecting: () => handleConnectionStatusChange(ConnectionStatus.RECONNECTING),
    });

    // Initialize input controller
    const inputController = new InputController(
      renderer,
      webSocketService,
      { selectedColor },
      {
        onPixelDraw: handlePixelDraw,
        onError: (error) => setError(error),
      }
    );
    inputControllerRef.current = inputController;

    // Initialize cursor renderer
    const cursorRenderer = new CursorRenderer(renderer.canvasContainer!);
    cursorRendererRef.current = cursorRenderer;

    console.log('✅ Canvas systems initialized');

    // Cleanup function
    return () => {
      inputControllerRef.current?.destroy();
      cursorRendererRef.current?.destroy();
      stateSyncRef.current?.destroy();
      rendererRef.current?.destroy();
      
      rendererRef.current = null;
      stateSyncRef.current = null;
      inputControllerRef.current = null;
      cursorRendererRef.current = null;
      
      console.log('🎨 Canvas systems destroyed');
    };
  }, []); // Empty dependency array - only initialize once

  /**
   * Handle WebRTC events
   */
  const handleCursorUpdate = useCallback((data: CursorUpdateData) => {
    if (cursorRendererRef.current) {
      cursorRendererRef.current.updateCursor(data);
    }
  }, []);

  const handleChatMessage = useCallback((data: ChatMessageData) => {
    console.log('💬 Chat message received:', data);
    // TODO: Handle chat messages when chat widget is implemented
  }, []);

  const handlePeerConnected = useCallback((peerId: string) => {
    console.log('👥 Peer connected:', peerId);
    setConnectedPeers(prev => [...prev.filter(id => id !== peerId), peerId]);
  }, []);

  const handlePeerDisconnected = useCallback((peerId: string) => {
    console.log('👋 Peer disconnected:', peerId);
    setConnectedPeers(prev => prev.filter(id => id !== peerId));
    if (cursorRendererRef.current) {
      cursorRendererRef.current.removeCursor(peerId);
    }
  }, []);

  /**
   * Initialize WebRTC connection
   */
  const initializeWebRTC = useCallback(async () => {
    try {
      console.log('🔌 Initializing WebRTC connection...');
      
      // Generate a simple user ID for this session
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const nickname = `User${Math.floor(Math.random() * 1000)}`;
      
      await webRTCService.connect(
        {
          signalingUrl: 'http://localhost:3003',
          roomId: 'canvas-room',
          userId,
          nickname
        },
        {
          onPeerConnected: handlePeerConnected,
          onPeerDisconnected: handlePeerDisconnected,
          onCursorUpdate: handleCursorUpdate,
          onChatMessage: handleChatMessage,
          onConnectionStateChange: (state) => {
            console.log('🔗 WebRTC connection state:', state);
            setWebRTCConnected(state === 'connected');
          }
        }
      );
      
      console.log('✅ WebRTC connection established');
      
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
    }
  }, [handleCursorUpdate, handleChatMessage, handlePeerConnected, handlePeerDisconnected]);

  /**
   * Initialize canvas data and WebSocket connection
   */
  useEffect(() => {
    const initialize = async () => {
      // Initialize canvas data
      await initializeCanvas();
      
      // Connect WebSocket
      webSocketService.connect();
      
      // Initialize WebRTC after a short delay to ensure canvas is ready
      setTimeout(() => {
        initializeWebRTC();
      }, 1000);
    };

    initialize();

    // Cleanup WebSocket and WebRTC on unmount
    return () => {
      webSocketService.disconnect();
      webRTCService.disconnect();
    };
  }, [initializeCanvas, initializeWebRTC]);

  /**
   * Cursor renderer update loop
   */
  useEffect(() => {
    let animationFrame: number;

    const updateCursors = () => {
      if (cursorRendererRef.current) {
        cursorRendererRef.current.update();
      }
      animationFrame = requestAnimationFrame(updateCursors);
    };

    // Start the update loop
    animationFrame = requestAnimationFrame(updateCursors);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  /**
   * Update canvas background when theme changes
   */
  useEffect(() => {
    if (rendererRef.current) {
      const backgroundColor = theme === 'dark' ? 0x1f2937 : 0xf8fafc;
      rendererRef.current.updateBackgroundColor(backgroundColor);
      console.log(`🎨 Canvas background updated for ${theme} theme`);
    }
  }, [theme]);

  /**
   * Update input controller when selected color changes
   */
  useEffect(() => {
    if (inputControllerRef.current) {
      inputControllerRef.current.setSelectedColor(selectedColor);
    }
  }, [selectedColor]);

  return (
    <div className="relative w-full h-full">
      {/* Main canvas container */}
      <div 
        ref={containerRef}
        className={`canvas-container ${className}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="loading-spinner mb-4"></div>
            <div>Loading canvas...</div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg z-40">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-white hover:text-gray-200 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg z-30">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === ConnectionStatus.CONNECTED ? 'bg-green-500' :
              connectionStatus === ConnectionStatus.CONNECTING ? 'bg-yellow-500' :
              connectionStatus === ConnectionStatus.RECONNECTING ? 'bg-orange-500' :
              'bg-red-500'
            }`}></div>
            <span className="capitalize">{connectionStatus}</span>
          </div>
          <div>Pixels: {pixelCount.toLocaleString()}</div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${webRTCConnected ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
            <span>WebRTC: {webRTCConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div>Peers: {connectedPeers.length}</div>
          <div className="flex items-center space-x-2">
            <span>Color:</span>
            <div 
              className="w-4 h-4 rounded border border-gray-300" 
              style={{ backgroundColor: selectedColor }}
            ></div>
            <span className="font-mono text-xs">{selectedColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canvas;