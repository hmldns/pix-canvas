import React, { useState } from 'react';
import BaseWidget from './BaseWidget';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  color: string;
}

const ChatWidget: React.FC = () => {
  const [messages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'PixelArtist',
      message: 'Welcome to the infinite pixel canvas! 🎨',
      timestamp: new Date(Date.now() - 120000),
      color: '#FF6B6B'
    },
    {
      id: '2', 
      username: 'GridMaster',
      message: 'Love the new grid system!',
      timestamp: new Date(Date.now() - 60000),
      color: '#4ECDC4'
    }
  ]);

  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // TODO: Implement actual message sending via WebSocket
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <BaseWidget 
      title="Chat" 
      position="bottom-left"
      defaultCollapsed={false}
    >
      <div className="flex flex-col h-64">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <div className="flex items-baseline space-x-2">
                <span 
                  className="font-medium text-xs"
                  style={{ color: msg.color }}
                >
                  {msg.username}
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
          
          {messages.length === 0 && (
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
    </BaseWidget>
  );
};

export default ChatWidget;