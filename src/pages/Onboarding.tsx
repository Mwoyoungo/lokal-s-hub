import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, User, Smartphone } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

const Onboarding: React.FC = () => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate();

  const handleContinue = async () => {
    // Basic validation
    if (name && phoneNumber) {
      // Store user details in local storage or state management
      localStorage.setItem('userProfile', JSON.stringify({ name, phoneNumber }));
      // Persist first_name in users table
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('users')
          .update({ first_name: name, last_name: '' })
          .eq('id', session.user.id);
        // If developer, create developer_profiles entry
        const { data: userRecord } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', session.user.id)
          .single();
        if (userRecord?.user_type === 'developer') {
          // Redirect to developer onboarding for details
          navigate('/developer-onboarding');
          return;
        }
      }
      toast.success('Profile saved!');
      navigate('/home');
    } else {
      // TODO: Add toast notification for validation
      console.error('Please fill all fields');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD700] flex flex-col justify-center p-6">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] p-8 rounded-lg">
        <h1 className="text-4xl font-black text-black mb-6 text-center">
          Welcome to LOKAL-S
        </h1>
        
        <div className="space-y-4">
          <div className="flex items-center border-2 border-black rounded-lg p-2 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
            <User className="mr-2 text-black" />
            <Input 
              type="text" 
              placeholder="Your Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-none focus:outline-none w-full text-lg"
            />
          </div>

          <div className="flex items-center border-2 border-black rounded-lg p-2 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
            <Smartphone className="mr-2 text-black" />
            <Input 
              type="tel" 
              placeholder="Phone Number" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="border-none focus:outline-none w-full text-lg"
            />
          </div>

          <Button 
            onClick={handleContinue}
            className="w-full bg-black text-white hover:bg-gray-800 text-xl font-bold py-3 rounded-lg border-2 border-black shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.6)] transition-all"
          >
            Continue
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          By continuing, you agree to our 
          <a href="#" className="ml-1 underline font-bold">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
