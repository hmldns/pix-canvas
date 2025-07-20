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
      
      {/* Debug panel (development only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-20 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-xs border border-gray-200 dark:border-gray-700">
          <div className="text-gray-600 dark:text-gray-400 space-y-1">
            <div>Environment: {import.meta.env.MODE}</div>
            <div>Build: Development</div>
            <div>Hot Reload: Active</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;