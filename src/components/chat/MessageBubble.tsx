
import React from 'react';
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  text: string;
  sender: 'user' | 'provider';
  timestamp: Date;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ text, sender, timestamp }) => {
  const isUser = sender === 'user';
  
  return (
    <div className={cn(
      "mb-4 flex",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg p-3 shadow-sm",
        isUser
          ? "bg-black text-white"
          : "bg-white border-2 border-black"
      )}>
        <p className="break-words">{text}</p>
        <p className={cn(
          "text-xs mt-1",
          isUser ? "text-gray-300" : "text-gray-500"
        )}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
