import React from 'react';
import { ConnectionStatus } from '@services/websocket';

interface StatusWidgetProps {
  connectionStatus: ConnectionStatus;
  pixelCount: number;
  webRTCConnected: boolean;
  connectedPeers: string[];
  selectedColor: string;
  onTestSound: () => void;
}

const StatusWidget: React.FC<StatusWidgetProps> = ({
  connectionStatus,
  pixelCount,
  webRTCConnected,
  connectedPeers,
  selectedColor,
  onTestSound,
}) => {
  return (
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
            onClick={onTestSound}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Test Sound
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusWidget;
