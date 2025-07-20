import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatMessageData } from '@libs/common-types';
import { webRTCService } from '@services/webrtc';

interface ChatContextType {
  messages: ChatMessageData[];
  sendMessage: (message: string) => void;
  addMessage: (message: ChatMessageData) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);

  const addMessage = useCallback((message: ChatMessageData) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback((messageText: string) => {
    webRTCService.sendChatMessage(messageText);
    console.log('💬 Sent chat message via context:', messageText);
  }, []);

  const value: ChatContextType = {
    messages,
    sendMessage,
    addMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};