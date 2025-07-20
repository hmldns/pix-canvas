import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { webRTCService } from '@services/webrtc';

export interface ConnectedUser {
  id: string;
  nickname: string;
  color: string;
  lastSeen: Date;
  isOnline: boolean;
  isLocal?: boolean;
}

interface UserContextType {
  users: ConnectedUser[];
  currentUser: ConnectedUser | null;
  onlineCount: number;
  addUser: (user: Omit<ConnectedUser, 'lastSeen' | 'isOnline'>) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<ConnectedUser>) => void;
  setCurrentUser: (user: ConnectedUser) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

// Generate a consistent color for a user based on their ID
const generateUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#EE5A24', '#0082C3', '#2ED573', '#A055FF', '#FF3838'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [currentUser, setCurrentUserState] = useState<ConnectedUser | null>(null);
  const [localUserId, setLocalUserId] = useState<string | null>(null);

  const addUser = useCallback((userData: Omit<ConnectedUser, 'lastSeen' | 'isOnline'>) => {
    setUsers(prev => {
      const existingUser = prev.find(u => u.id === userData.id);
      if (existingUser) {
        // Update existing user
        return prev.map(u => 
          u.id === userData.id 
            ? { ...u, ...userData, lastSeen: new Date(), isOnline: true }
            : u
        );
      } else {
        // Add new user (but only if it's not the local user ID)
        if (localUserId && userData.id === localUserId) {
          console.log('🚫 Skipping adding local user as remote user');
          return prev; // Don't add local user as a separate user
        }
        
        const newUser: ConnectedUser = {
          ...userData,
          color: userData.color || generateUserColor(userData.id),
          lastSeen: new Date(),
          isOnline: true,
          isLocal: false // Explicitly mark as remote user
        };
        return [...prev, newUser];
      }
    });
  }, [localUserId]);

  const removeUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, isOnline: false, lastSeen: new Date() }
        : u
    ));
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<ConnectedUser>) => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, ...updates, lastSeen: new Date() }
        : u
    ));
  }, []);

  const setCurrentUser = useCallback((user: ConnectedUser) => {
    setCurrentUserState(user);
    setLocalUserId(user.id);
    // Add the local user to the users list
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== user.id); // Remove any existing entry
      return [...filtered, user];
    });
  }, []);

  const onlineCount = users.filter(u => u.isOnline).length;

  // Clean up old offline users (older than 1 hour)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      setUsers(prev => prev.filter(u => 
        u.isOnline || u.lastSeen > oneHourAgo
      ));
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  const value: UserContextType = {
    users,
    currentUser,
    onlineCount,
    addUser,
    removeUser,
    updateUser,
    setCurrentUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};