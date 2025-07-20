import React, { useState } from 'react';
import BaseWidget from './BaseWidget';

interface OnlineUser {
  id: string;
  username: string;
  color: string;
  lastSeen: Date;
  isOnline: boolean;
}

const UserListWidget: React.FC = () => {
  const [users] = useState<OnlineUser[]>([
    {
      id: '1',
      username: 'You',
      color: '#FF3333',
      lastSeen: new Date(),
      isOnline: true
    },
    {
      id: '2',
      username: 'PixelArtist',
      color: '#FF6B6B',
      lastSeen: new Date(Date.now() - 30000),
      isOnline: true
    },
    {
      id: '3',
      username: 'GridMaster',
      color: '#4ECDC4',
      lastSeen: new Date(Date.now() - 120000),
      isOnline: true
    },
    {
      id: '4',
      username: 'ColorWizard',
      color: '#45B7D1',
      lastSeen: new Date(Date.now() - 300000),
      isOnline: false
    }
  ]);

  const onlineUsers = users.filter(user => user.isOnline);
  const offlineUsers = users.filter(user => !user.isOnline);

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const UserItem: React.FC<{ user: OnlineUser }> = ({ user }) => (
    <div className="flex items-center space-x-3 py-2">
      {/* User Color Indicator */}
      <div className="relative">
        <div 
          className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: user.color }}
        />
        {user.isOnline && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-gray-800" />
        )}
      </div>
      
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {user.username}
          </span>
          {user.username === 'You' && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </div>
        {!user.isOnline && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatLastSeen(user.lastSeen)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <BaseWidget 
      title={`Users (${onlineUsers.length} online)`}
      position="top-right"
      defaultCollapsed={false}
    >
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {/* Online Users */}
        {onlineUsers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Online ({onlineUsers.length})
            </h4>
            <div className="space-y-1">
              {onlineUsers.map(user => (
                <UserItem key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Offline Users */}
        {offlineUsers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Recently Offline
            </h4>
            <div className="space-y-1">
              {offlineUsers.slice(0, 5).map(user => (
                <UserItem key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {users.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
            No users online
          </div>
        )}

        {/* Total Stats */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {users.length} total user{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

export default UserListWidget;