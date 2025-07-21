import React from 'react';
import BaseWidget from './BaseWidget';
import MobileWidget from './MobileWidget';
import { useUserContext, ConnectedUser } from '@contexts/UserContext';

const UserListWidget: React.FC = () => {
  const { users, currentUser, onlineCount } = useUserContext();

  const onlineUsers = users.filter(user => user.isOnline);
  const offlineUsers = users.filter(user => !user.isOnline);

  // Generate simple avatar initials from nickname
  const getAvatarInitials = (nickname: string): string => {
    return nickname
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const UserItem: React.FC<{ user: ConnectedUser }> = ({ user }) => (
    <div className="flex items-center space-x-3 py-2">
      {/* User Avatar */}
      <div className="relative">
        <div 
          className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-medium text-white"
          style={{ backgroundColor: user.color }}
        >
          {getAvatarInitials(user.nickname)}
        </div>
        {user.isOnline && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </div>
      
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {user.nickname}
          </span>
          {user.isLocal && (
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

  const usersIcon = (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  );

  const widgetContent = (
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
  );

  return (
    <>
      <MobileWidget
        title={`Users (${onlineCount} online)`}
        panelId="users"
        icon={usersIcon}
        position="top-right"
      >
        {widgetContent}
      </MobileWidget>
      <BaseWidget 
        title={`Users (${onlineCount} online)`}
        position="top-right"
        defaultCollapsed={false}
      >
        {widgetContent}
      </BaseWidget>
    </>
  );
};

export default UserListWidget;