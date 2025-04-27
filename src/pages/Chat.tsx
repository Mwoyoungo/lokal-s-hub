
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ServiceSelection from '@/components/ServiceSelection';
import { toast } from '@/components/ui/sonner';

const Chat = () => {
  const [serviceSelectionOpen, setServiceSelectionOpen] = useState(false);

  const handleOpenServiceSelection = () => {
    setServiceSelectionOpen(true);
  };

  const handleCloseServiceSelection = () => {
    setServiceSelectionOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      <div className="max-w-4xl mx-auto bg-white border-4 border-black rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.7)] p-6">
        <h1 className="text-3xl font-bold mb-6">Choose a Service</h1>
        
        <Button 
          onClick={handleOpenServiceSelection}
          className="bg-black text-white hover:bg-gray-800"
        >
          Select a Service
        </Button>

        <ServiceSelection 
          isOpen={serviceSelectionOpen} 
          onClose={handleCloseServiceSelection} 
        />
      </div>
    </div>
  );
};

export default Chat;
