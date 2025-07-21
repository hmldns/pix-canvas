import React, { useRef } from 'react';
import Canvas from '@components/Canvas';
import ChatWidget from '@components/widgets/ChatWidget';
import UserListWidget from '@components/widgets/UserListWidget';
import ConnectionStatusWidget from '@components/widgets/ConnectionStatusWidget';
import ColorPaletteWidget from '@components/widgets/ColorPaletteWidget';
import ThemeToggleWidget from '@components/widgets/ThemeToggleWidget';
import VolumeControlWidget from '@components/widgets/VolumeControlWidget';
import DebugPanel from '@components/widgets/DebugPanel';
import { MobilePanelProvider } from '@contexts/MobilePanelContext';

const App: React.FC = () => {
  const canvasRef = useRef<any>(null);

  const handleVolumeChange = (volume: number) => {
    if (canvasRef.current?.setSoundVolume) {
      canvasRef.current.setSoundVolume(volume);
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    if (canvasRef.current?.setSoundsEnabled) {
      canvasRef.current.setSoundsEnabled(enabled);
    }
  };

  return (
    <MobilePanelProvider>
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 relative">
        {/* Main Canvas - PixiJS rendering area */}
        <Canvas ref={canvasRef} />
        
        {/* Floating UI Widgets */}
        <ThemeToggleWidget />
        <ConnectionStatusWidget />
        <VolumeControlWidget
          onVolumeChange={handleVolumeChange}
          onToggleEnabled={handleSoundToggle}
        />
        <UserListWidget />
        <ChatWidget />
        <ColorPaletteWidget />
        
        {/* Debug Panel - only visible in development or when enabled */}
        <DebugPanel
          effectsManager={canvasRef.current?.getEffectsManager?.()}
          soundManager={canvasRef.current?.getSoundManager?.()}
          webSocketService={canvasRef.current?.getWebSocketService?.()}
        />
        
      </div>
    </MobilePanelProvider>
  );
};

export default App;