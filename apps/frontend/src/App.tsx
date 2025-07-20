import React, { useRef } from 'react';
import Canvas from '@components/Canvas';
import ChatWidget from '@components/widgets/ChatWidget';
import UserListWidget from '@components/widgets/UserListWidget';
import ConnectionStatusWidget from '@components/widgets/ConnectionStatusWidget';
import ColorPaletteWidget from '@components/widgets/ColorPaletteWidget';
import ThemeToggleWidget from '@components/widgets/ThemeToggleWidget';
import VolumeControlWidget from '@components/widgets/VolumeControlWidget';

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
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 relative">
      {/* Main Canvas - PixiJS rendering area */}
      <Canvas ref={canvasRef} />
      
      {/* Floating UI Widgets */}
      <ThemeToggleWidget />
      <ConnectionStatusWidget />
      <UserListWidget />
      <ChatWidget />
      <ColorPaletteWidget />
      <VolumeControlWidget
        onVolumeChange={handleVolumeChange}
        onToggleEnabled={handleSoundToggle}
      />
      
    </div>
  );
};

export default App;