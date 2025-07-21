import React, { useState, useEffect, useRef } from 'react';
import BaseWidget from './BaseWidget';
import MobileWidget from './MobileWidget';
import { useChatContext } from '@contexts/ChatContext';
import { ChatMessageData } from '@libs/common-types';

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: number;
  isLocal?: boolean;
}

const ChatWidget: React.FC = () => {
  const { messages: contextMessages, sendMessage } = useChatContext();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Merge and sort all messages (local + context)
  const allMessages = React.useMemo(() => {
    const contextConverted: ChatMessage[] = contextMessages.map(msg => ({
      id: `remote-${msg.userId}-${msg.timestamp}`,
      userId: msg.userId,
      nickname: msg.nickname,
      message: msg.message,
      timestamp: msg.timestamp,
      isLocal: false
    }));

    const combined = [...localMessages, ...contextConverted];
    
    // Sort by timestamp to maintain chronological order
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [contextMessages, localMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // Send via context
      sendMessage(newMessage);
      
      // Add to local messages immediately
      const localMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        userId: 'local',
        nickname: 'You',
        message: newMessage,
        timestamp: Date.now(),
        isLocal: true
      };
      
      setLocalMessages(prev => [...prev, localMsg]);
      setNewMessage('');
      console.log('💬 Sent chat message via widget:', newMessage);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserColor = (userId: string, isLocal: boolean) => {
    if (isLocal) return '#10B981'; // Green for local user
    
    // Generate consistent color based on userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
    return colors[Math.abs(hash) % colors.length];
  };


  const chatIcon = (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  );

  const widgetContent = (
    <div className="flex flex-col h-64">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {allMessages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <div className="flex items-baseline space-x-2">
              <span 
                className="font-medium text-xs"
                style={{ color: getUserColor(msg.userId, msg.isLocal || false) }}
              >
                {msg.nickname}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <div className="text-gray-800 dark:text-gray-200 mt-1">
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {allMessages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            No messages yet. Start a conversation!
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-600 pt-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="
              flex-1 px-3 py-2 text-sm
              bg-gray-100 dark:bg-gray-700
              border border-gray-300 dark:border-gray-600
              rounded-md
              text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-colors duration-150
            "
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="
              px-3 py-2 text-sm font-medium
              bg-blue-500 hover:bg-blue-600
              disabled:bg-gray-300 dark:disabled:bg-gray-600
              disabled:cursor-not-allowed
              text-white
              rounded-md
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <MobileWidget
        title="Chat"
        panelId="chat"
        icon={chatIcon}
        position="bottom-left"
      >
        {widgetContent}
      </MobileWidget>
      <BaseWidget 
        title="Chat" 
        position="bottom-left"
        defaultCollapsed={false}
      >
        {widgetContent}
      </BaseWidget>
    </>
  );
};

export default ChatWidget;