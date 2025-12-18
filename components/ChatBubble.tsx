
import React from 'react';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full px-4 mb-3`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-ios-lg text-[17px] leading-[1.3] shadow-sm ${
        isUser 
          ? 'bg-[#007AFF] text-white rounded-tr-[4px]' 
          : 'bg-[#E9E9EB] dark:bg-[#3A3A3C] text-ios-light-text dark:text-ios-dark-text rounded-tl-[4px]'
      }`}>
        {message.text}
      </div>
    </div>
  );
};

export default ChatBubble;
