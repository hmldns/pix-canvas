import React from 'react';
import Canvas from '@components/Canvas';
import ChatWidget from '@components/widgets/ChatWidget';
import UserListWidget from '@components/widgets/UserListWidget';
import ConnectionStatusWidget from '@components/widgets/ConnectionStatusWidget';
import ColorPaletteWidget from '@components/widgets/ColorPaletteWidget';
import ThemeToggleWidget from '@components/widgets/ThemeToggleWidget';

const App: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 relative">
      {/* Main Canvas - PixiJS rendering area */}
      <Canvas />
      
      {/* Floating UI Widgets */}
      <ThemeToggleWidget />
      <ConnectionStatusWidget />
      <UserListWidget />
      <ChatWidget />
      <ColorPaletteWidget />
      
    </div>
  );
};

export default App;