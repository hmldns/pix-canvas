import React from 'react';
import BaseWidget from './BaseWidget';
import { webSocketService, ConnectionStatus } from '@services/websocket';

const ConnectionStatusWidget: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>(
    webSocketService.getStatus()
  );
  const [reconnectAttempt, setReconnectAttempt] = React.useState(0);
  const [lastConnected, setLastConnected] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // Update handlers to track connection status
    webSocketService.updateHandlers({
      onConnect: () => {
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setLastConnected(new Date());
        setReconnectAttempt(0);
      },
      onDisconnect: () => {
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
      },
      onError: () => {
        setConnectionStatus(ConnectionStatus.ERROR);
      },
      onReconnecting: (attempt) => {
        setConnectionStatus(ConnectionStatus.RECONNECTING);
        setReconnectAttempt(attempt);
      }
    });

    // Initial status
    if (connectionStatus === ConnectionStatus.CONNECTED) {
      setLastConnected(new Date());
    }
  }, []);

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900',
          icon: '●',
          text: 'Connected',
          description: 'Real-time updates active'
        };
      case ConnectionStatus.CONNECTING:
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          icon: '◐',
          text: 'Connecting...',
          description: 'Establishing connection'
        };
      case ConnectionStatus.RECONNECTING:
        return {
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900',
          icon: '◑',
          text: `Reconnecting (${reconnectAttempt}/5)`,
          description: 'Attempting to restore connection'
        };
      case ConnectionStatus.DISCONNECTED:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900',
          icon: '○',
          text: 'Disconnected',
          description: 'No real-time updates'
        };
      case ConnectionStatus.ERROR:
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900',
          icon: '✕',
          text: 'Connection Error',
          description: 'Failed to connect to server'
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900',
          icon: '?',
          text: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const handleReconnect = () => {
    webSocketService.disconnect();
    setTimeout(() => {
      webSocketService.connect();
    }, 500);
  };

  const formatUptime = () => {
    if (!lastConnected) return 'Never connected';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastConnected.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const statusInfo = getStatusInfo();

  return (
    <BaseWidget 
      title="Connection" 
      position="top-left"
      defaultCollapsed={true}
    >
      <div className="space-y-4">
        {/* Status Indicator */}
        <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
          <div className="flex items-center space-x-3">
            <span className={`text-lg ${statusInfo.color}`}>
              {statusInfo.icon}
            </span>
            <div>
              <div className={`font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {statusInfo.description}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span className="text-gray-900 dark:text-gray-100 capitalize">
              {connectionStatus}
            </span>
          </div>
          
          {lastConnected && connectionStatus === ConnectionStatus.CONNECTED && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatUptime()}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Server:</span>
            <span className="text-gray-900 dark:text-gray-100 text-xs font-mono">
              localhost:3001
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
          {(connectionStatus === ConnectionStatus.DISCONNECTED || 
            connectionStatus === ConnectionStatus.ERROR) && (
            <button
              onClick={handleReconnect}
              className="
                w-full px-3 py-2 text-sm font-medium
                bg-blue-500 hover:bg-blue-600
                text-white rounded-md
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              "
            >
              Reconnect
            </button>
          )}
          
          {connectionStatus === ConnectionStatus.CONNECTED && (
            <div className="text-center text-xs text-green-600 dark:text-green-400">
              ✓ All systems operational
            </div>
          )}
        </div>
      </div>
    </BaseWidget>
  );
};

export default ConnectionStatusWidget;