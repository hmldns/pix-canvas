import React from 'react';
import BaseWidget from './BaseWidget';
import { webSocketService, ConnectionStatus } from '@services/websocket';

const ConnectionStatusWidget: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>(
    webSocketService.getStatus()
  );
  const [reconnectAttempt, setReconnectAttempt] = React.useState(0);
  const [lastConnected, setLastConnected] = React.useState<Date | null>(null);
  const [lastPingTime, setLastPingTime] = React.useState<number>(0);
  const [pingTimeoutWarning, setPingTimeoutWarning] = React.useState(false);

  React.useEffect(() => {
    // Update handlers to track connection status
    webSocketService.updateHandlers({
      onConnect: () => {
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setLastConnected(new Date());
        setReconnectAttempt(0);
        setPingTimeoutWarning(false);
        // Update initial ping time
        const stats = webSocketService.getStats();
        setLastPingTime(stats.lastPingTime);
      },
      onDisconnect: () => {
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        setPingTimeoutWarning(false);
      },
      onError: () => {
        setConnectionStatus(ConnectionStatus.ERROR);
        setPingTimeoutWarning(false);
      },
      onReconnecting: (attempt) => {
        setConnectionStatus(ConnectionStatus.RECONNECTING);
        setReconnectAttempt(attempt);
        setPingTimeoutWarning(false);
      }
    });

    // Initial status
    if (connectionStatus === ConnectionStatus.CONNECTED) {
      setLastConnected(new Date());
      const stats = webSocketService.getStats();
      setLastPingTime(stats.lastPingTime);
    }
  }, []);

  // Monitor keepalive timeout every second
  React.useEffect(() => {
    if (connectionStatus !== ConnectionStatus.CONNECTED) {
      return;
    }

    const interval = setInterval(() => {
      const stats = webSocketService.getStats();
      setLastPingTime(stats.lastPingTime);
      
      // Check if we haven't received a ping in the last 35 seconds (more than heartbeat interval)
      const timeSinceLastPing = Date.now() - stats.lastPingTime;
      const warningThreshold = 35000; // 35 seconds - more than the 30s heartbeat interval
      const timeoutThreshold = 60000; // 60 seconds before forcing reconnect
      
      if (stats.lastPingTime > 0 && timeSinceLastPing > warningThreshold) {
        setPingTimeoutWarning(true);
        
        // If timeout exceeds 60 seconds, force reconnect (let WebSocket service handle its own timeouts)
        if (timeSinceLastPing > timeoutThreshold) {
          console.warn('⚠️ Keepalive timeout exceeded 60 seconds, forcing reconnect');
          handleReconnect();
        }
      } else {
        setPingTimeoutWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        if (pingTimeoutWarning) {
          return {
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-100 dark:bg-orange-900',
            icon: '⚠',
            text: 'Connection Warning',
            description: 'Keepalive timeout - connection may be unstable'
          };
        }
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

  const formatLastPing = () => {
    if (!lastPingTime || lastPingTime === 0) return 'No pings received';
    
    const timeSinceLastPing = Date.now() - lastPingTime;
    const seconds = Math.floor(timeSinceLastPing / 1000);
    
    if (seconds < 1) return 'Just now';
    if (seconds === 1) return '1 second ago';
    return `${seconds} seconds ago`;
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

          {connectionStatus === ConnectionStatus.CONNECTED && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last ping:</span>
              <span className={`text-gray-900 dark:text-gray-100 ${pingTimeoutWarning ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                {formatLastPing()}
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

          {pingTimeoutWarning && connectionStatus === ConnectionStatus.CONNECTED && (
            <div className="space-y-2">
              <div className="text-center text-xs text-orange-600 dark:text-orange-400">
                ⚠️ Keepalive timeout detected
              </div>
              <button
                onClick={handleReconnect}
                className="
                  w-full px-3 py-2 text-sm font-medium
                  bg-orange-500 hover:bg-orange-600
                  text-white rounded-md
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                "
              >
                Force Reconnect
              </button>
            </div>
          )}
          
          {connectionStatus === ConnectionStatus.CONNECTED && !pingTimeoutWarning && (
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