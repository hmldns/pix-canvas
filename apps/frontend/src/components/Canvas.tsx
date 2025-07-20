import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { CanvasRenderer } from '@canvas/rendering/CanvasRenderer';
import { CursorRenderer } from '@canvas/rendering/CursorRenderer';
import { StateSynchronizer } from '@canvas/state/stateSync';
import { InputController } from '@canvas/interaction/inputController';
import { apiService } from '@services/api';
import { webSocketService, ConnectionStatus } from '@services/websocket';
import { webRTCService } from '@services/webrtc';
import { PixelUpdateData, CursorUpdateData, ChatMessageData } from '@libs/common-types';
import { useTheme } from '@contexts/ThemeContext';
import { useChatContext } from '@contexts/ChatContext';
import { useUserContext } from '@contexts/UserContext';
import { useColorContext } from '@contexts/ColorContext';

interface CanvasProps {
  className?: string;
}

export interface CanvasRef {
  setSoundVolume: (volume: number) => void;
  setSoundsEnabled: (enabled: boolean) => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ className = '' }, ref) => {
  const { theme } = useTheme();
  const { addMessage } = useChatContext();
  const { addUser, removeUser, setCurrentUser } = useUserContext();
  const { selectedColor } = useColorContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const stateSyncRef = useRef<StateSynchronizer | null>(null);
  const inputControllerRef = useRef<InputController | null>(null);
  const cursorRendererRef = useRef<CursorRenderer | null>(null);

  // State for canvas data and connection
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [pixelCount, setPixelCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [webRTCConnected, setWebRTCConnected] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  
  // Prevent multiple initializations
  const initializationRef = useRef({ canvas: false, webrtc: false });

  // Expose sound control methods to parent component
  useImperativeHandle(ref, () => ({
    setSoundVolume: (volume: number) => {
      if (rendererRef.current) {
        rendererRef.current.setSoundVolume(volume);
      }
    },
    setSoundsEnabled: (enabled: boolean) => {
      if (rendererRef.current) {
        rendererRef.current.setSoundsEnabled(enabled);
      }
    },
  }));

  /**
   * Initialize user session and fetch initial canvas data
   */
  const initializeCanvas = useCallback(async () => {
    if (initializationRef.current.canvas) {
      console.log('⚠️ Canvas already initialized, skipping...');
      return;
    }
    
    try {
      initializationRef.current.canvas = true;
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing canvas...');

      // Initialize user session
      const user = await apiService.initializeSession();
      console.log('👤 User session initialized:', user);

      // Set current user with real backend data
      setCurrentUser({
        id: user.userId,
        nickname: user.nickname,
        color: user.color,
        lastSeen: new Date(),
        isOnline: true,
        isLocal: true
      });

      // Update input controller with user color for cursor sharing
      if (inputControllerRef.current) {
        inputControllerRef.current.setUserColor(user.color);
      }

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
    console.log('🔄 Canvas reload requested...');
    // Reset the initialization flag to allow reload
    initializationRef.current.canvas = false;
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

    // Note: WebSocket handlers are now set up in a separate effect

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
    
    // Add/update user in context from cursor data
    addUser({
      id: data.userId,
      nickname: data.nickname,
      color: data.color,
    });
  }, [addUser]);

  const handleChatMessage = useCallback((data: ChatMessageData) => {
    console.log('💬 Chat message received:', data);
    addMessage(data);
    
    // Ensure user is in context from chat data (might not have seen cursor yet)
    const cachedUser = apiService.getCachedUser();
    if (cachedUser && data.userId !== cachedUser.userId) {
      // This is a remote user - add them if not already added
      addUser({
        id: data.userId,
        nickname: data.nickname,
        color: data.color || '', // Use color from chat data, or auto-generate if not available
      });
    }
  }, [addMessage, addUser]);

  const handlePeerConnected = useCallback((peerId: string) => {
    console.log('👥 Peer connected:', peerId);
    setConnectedPeers(prev => [...prev.filter(id => id !== peerId), peerId]);
    
    // Don't add user to context immediately - wait for cursor updates
    // to get their real nickname and color from WebRTC data
    console.log('ℹ️ Waiting for cursor update to get peer user info...');
  }, []);

  const handlePeerDisconnected = useCallback((peerId: string) => {
    console.log('👋 Peer disconnected:', peerId);
    setConnectedPeers(prev => prev.filter(id => id !== peerId));
    if (cursorRendererRef.current) {
      cursorRendererRef.current.removeCursor(peerId);
    }
    
    // Remove user from user context
    removeUser(peerId);
  }, [removeUser]);

  /**
   * Initialize WebRTC connection
   */
  const initializeWebRTC = useCallback(async () => {
    if (initializationRef.current.webrtc) {
      console.log('⚠️ WebRTC already initialized, skipping...');
      return;
    }
    
    try {
      initializationRef.current.webrtc = true;
      console.log('🔌 Initializing WebRTC connection...');
      
      // Get current user data (should be set by initializeCanvas)
      const cachedUser = apiService.getCachedUser();
      if (!cachedUser) {
        throw new Error('No user session found. Canvas should be initialized first.');
      }
      
      console.log('👤 Using existing user for WebRTC:', cachedUser);
      
      await webRTCService.connect(
        {
          signalingUrl: 'http://localhost:3003',
          roomId: 'canvas-room',
          userId: cachedUser.userId,
          nickname: cachedUser.nickname,
          userColor: cachedUser.color
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
   * Initialize canvas data and WebSocket connection - run only once
   */
  useEffect(() => {
    let isInitialized = false;
    
    const initialize = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      console.log('🚀 Starting one-time canvas initialization...');
      
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
  }, []); // Empty dependency array - run only once

  /**
   * Update WebSocket handlers when callbacks change (without reinitializing)
   */
  useEffect(() => {
    console.log('🔄 Updating WebSocket handlers...');
    webSocketService.updateHandlers({
      onPixelUpdate: handlePixelUpdate,
      onReloadCanvas: handleCanvasReload,
      onConnect: () => handleConnectionStatusChange(ConnectionStatus.CONNECTED),
      onDisconnect: () => handleConnectionStatusChange(ConnectionStatus.DISCONNECTED),
      onError: () => handleConnectionStatusChange(ConnectionStatus.ERROR),
      onReconnecting: () => handleConnectionStatusChange(ConnectionStatus.RECONNECTING),
    });
  }, [handlePixelUpdate, handleCanvasReload, handleConnectionStatusChange]);

  /**
   * Animation update loop (cursors and effects)
   */
  useEffect(() => {
    let animationFrame: number;
    let lastTime = 0;

    const updateAnimations = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      if (cursorRendererRef.current) {
        cursorRendererRef.current.update();
      }

      if (rendererRef.current) {
        rendererRef.current.updateEffects(deltaTime);
      }

      animationFrame = requestAnimationFrame(updateAnimations);
    };

    // Start the update loop
    animationFrame = requestAnimationFrame(updateAnimations);

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

  /**
   * Handle user interaction to resume audio context
   */
  useEffect(() => {
    const handleUserInteraction = () => {
      if (rendererRef.current) {
        rendererRef.current.resumeAudio();
      }
    };

    // Add listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

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
          <div>
            <button 
              onClick={() => {
                if (rendererRef.current) {
                  rendererRef.current.resumeAudio();
                  rendererRef.current.playPixelSound(selectedColor, true); // true = own pixel
                }
              }}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Test Sound
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Canvas;