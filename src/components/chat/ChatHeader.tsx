
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface ChatHeaderProps {
  providerName: string;
  rating?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ providerName, rating }) => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-white border-b-4 border-black p-4 flex items-center">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate('/home')}
        className="mr-2"
      >
        <ArrowLeft />
      </Button>
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center mr-2">
          <User size={16} />
        </div>
        <div>
          <h1 className="font-black text-xl">{providerName}</h1>
          {rating && (
            <span className="text-sm">⭐ {rating}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
