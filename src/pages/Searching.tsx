
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const Searching: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Finding the best match...');
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    // Check if we have service request in local storage
    const serviceRequest = localStorage.getItem('serviceRequest');
    if (!serviceRequest) {
      navigate('/home');
      return;
    }
    
    // Simulate searching process
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
      setProgress(prev => {
        const newProgress = prev + Math.random() * 5;
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 1000);
    
    // Update status messages
    const messageTimeouts = [
      setTimeout(() => setStatusText('Analyzing your requirements...'), 3000),
      setTimeout(() => setStatusText('Looking for expert providers...'), 6000),
      setTimeout(() => setStatusText('Matching based on availability...'), 9000),
      setTimeout(() => setStatusText('Almost there...'), 12000)
    ];
    
    // Navigate to chat after simulated search
    const navigationTimeout = setTimeout(() => {
      localStorage.setItem('matchedProvider', JSON.stringify({
        id: 'prov123',
        name: 'Alex Johnson',
        rating: 4.9,
        completedProjects: 127,
        specialty: 'Web Development',
        responseTime: 'Usually responds in 15 minutes'
      }));
      navigate('/chat');
    }, 15000);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      messageTimeouts.forEach(timeout => clearTimeout(timeout));
      clearTimeout(navigationTimeout);
    };
  }, [navigate]);
  
  const handleCancel = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-[#FFD700] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-lg p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
        <h1 className="text-3xl font-black text-center mb-6">Finding Providers</h1>
        
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-32 h-32 mb-4">
            <div className="absolute inset-0 border-4 border-black rounded-full border-dashed animate-spin" />
            <div className="absolute inset-3 bg-[#FFD700] rounded-full flex items-center justify-center">
              <span className="font-bold text-2xl">{Math.round(progress)}%</span>
            </div>
          </div>
          <p className="text-xl font-bold text-center">{statusText}</p>
          <p className="text-sm text-gray-600 mt-2">Time elapsed: {seconds} seconds</p>
        </div>
        
        <div className="text-center">
          <p className="mb-6">We're matching you with the perfect service provider for your project.</p>
          
          <Button
            onClick={handleCancel}
            variant="outline"
            className="border-2 border-black hover:bg-gray-100"
          >
            Cancel Search
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Searching;
