import React from 'react';
import Canvas from '@components/Canvas';

const App: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900">
      {/* Main Canvas - PixiJS rendering area */}
      <Canvas />
      
      {/* Floating widgets will be positioned absolutely over the canvas */}
      {/* These will be implemented in later phases */}
      
      {/* Debug panel (development only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 right-4 floating-widget p-4 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            <div>Environment: {import.meta.env.MODE}</div>
            <div>Build: Development</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;