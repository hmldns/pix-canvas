import React, { useState, useEffect } from 'react';
import { addBreadcrumb } from '../../config/sentry';
import { config } from '@/config/config';

interface DebugPanelProps {
  effectsManager?: any; // PixelEffectManager instance
  soundManager?: any;   // SoundManager instance
  webSocketService?: any; // WebSocketService instance
}

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  activeParticles: number;
  webSocketLatency: number;
  pixelsDrawn: number;
  effectsPlayed: number;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  effectsManager,
  soundManager,
  webSocketService,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    activeParticles: 0,
    webSocketLatency: 0,
    pixelsDrawn: 0,
    effectsPlayed: 0,
  });
  
  const [isDebugMode, setIsDebugMode] = useState(
    import.meta.env.MODE === 'development' || 
    localStorage.getItem('debug-mode') === 'true'
  );

  const showDebugPanels = config.debug.showPanels;

  // Keyboard shortcut to toggle debug panel (Ctrl/Cmd + Shift + D)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsVisible(!isVisible);
        addBreadcrumb('Debug panel toggled', 'ui', { visible: !isVisible });
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  // Performance monitoring
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const newMetrics: PerformanceMetrics = {
        fps: measureFPS(),
        memoryUsage: getMemoryUsage(),
        activeParticles: effectsManager?.getActiveParticleCount() || 0,
        webSocketLatency: webSocketService?.getLatency() || 0,
        pixelsDrawn: effectsManager?.getPixelsDrawnCount() || 0,
        effectsPlayed: effectsManager?.getEffectsPlayedCount() || 0,
      };
      
      setMetrics(newMetrics);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, effectsManager, soundManager, webSocketService]);

  // FPS measurement
  const measureFPS = (): number => {
    // Simplified FPS calculation
    return Math.round(60 + Math.random() * 10 - 5); // Mock for now
  };

  // Memory usage
  const getMemoryUsage = (): number => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  };

  // Test animation effects
  const testAnimation = (type: 'sparkle' | 'burst' | 'glow') => {
    if (effectsManager) {
      const testX = Math.floor(Math.random() * 800);
      const testY = Math.floor(Math.random() * 600);
      
      effectsManager.playEffect(testX, testY, '#FF0000', true, type);
      addBreadcrumb(`Test animation triggered: ${type}`, 'debug', { x: testX, y: testY });
    }
  };

  // Test sound effects
  const testSound = (frequency: number) => {
    if (soundManager) {
      soundManager.playPixelSound('#FF0000', true, frequency);
      addBreadcrumb(`Test sound triggered`, 'debug', { frequency });
    }
  };

  // Toggle debug mode
  const toggleDebugMode = () => {
    const newDebugMode = !isDebugMode;
    setIsDebugMode(newDebugMode);
    localStorage.setItem('debug-mode', newDebugMode.toString());
    addBreadcrumb('Debug mode toggled', 'debug', { enabled: newDebugMode });
  };

  if (!showDebugPanels) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 text-white p-2 rounded-full opacity-50 hover:opacity-100 transition-opacity"
          title="Open Debug Panel (Ctrl+Shift+D)"
        >
          🐛
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg w-80 font-mono text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-2">
        <h3 className="text-lg font-bold">🐛 Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Performance Metrics */}
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-2 text-blue-400">📊 Performance</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>FPS: <span className="text-green-400">{metrics.fps}</span></div>
          <div>Memory: <span className="text-yellow-400">{metrics.memoryUsage}MB</span></div>
          <div>Particles: <span className="text-purple-400">{metrics.activeParticles}</span></div>
          <div>WS Latency: <span className="text-red-400">{metrics.webSocketLatency}ms</span></div>
          <div>Pixels: <span className="text-cyan-400">{metrics.pixelsDrawn}</span></div>
          <div>Effects: <span className="text-orange-400">{metrics.effectsPlayed}</span></div>
        </div>
      </div>

      {/* Animation Tests */}
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-2 text-green-400">🎨 Animation Tests</h4>
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => testAnimation('sparkle')}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Sparkle
          </button>
          <button
            onClick={() => testAnimation('burst')}
            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
          >
            Burst
          </button>
          <button
            onClick={() => testAnimation('glow')}
            className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-xs"
          >
            Glow
          </button>
        </div>
        
        {effectsManager && (
          <div className="text-xs">
            <div>Pool Size: {effectsManager.getPoolSize?.() || 'N/A'}</div>
            <div>Active: {effectsManager.getActiveCount?.() || 'N/A'}</div>
          </div>
        )}
      </div>

      {/* Sound Tests */}
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-2 text-yellow-400">🔊 Sound Tests</h4>
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => testSound(440)}
            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
          >
            A4 (440Hz)
          </button>
          <button
            onClick={() => testSound(523)}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            C5 (523Hz)
          </button>
          <button
            onClick={() => testSound(659)}
            className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
          >
            E5 (659Hz)
          </button>
        </div>
      </div>

      {/* WebSocket Info */}
      {webSocketService && (
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2 text-red-400">🌐 WebSocket</h4>
          <div className="text-xs">
            <div>Status: <span className="text-green-400">{webSocketService.getStatus?.() || 'Unknown'}</span></div>
            <div>Reconnects: {webSocketService.getReconnectCount?.() || 0}</div>
            <div>Messages: {webSocketService.getMessageCount?.() || 0}</div>
          </div>
        </div>
      )}

      {/* Debug Mode Toggle */}
      <div className="mb-4">
        <h4 className="text-md font-semibold mb-2 text-purple-400">⚙️ Settings</h4>
        <label className="flex items-center text-xs">
          <input
            type="checkbox"
            checked={isDebugMode}
            onChange={toggleDebugMode}
            className="mr-2"
          />
          Debug Mode
        </label>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
        <div>Press <kbd className="bg-gray-700 px-1 rounded">Ctrl+Shift+D</kbd> to toggle</div>
        <div>Environment: <span className="text-yellow-400">{import.meta.env.MODE}</span></div>
      </div>
    </div>
  );
};

export default DebugPanel;
