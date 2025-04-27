import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, CreditCard, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

const Profile = () => {
  const navigate = useNavigate();
  const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    localStorage.removeItem('userProfile');
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FFD700] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.8)] space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-200 flex items-center justify-center">
              <User size={48} />
            </div>
            <div>
              <h1 className="text-3xl font-black">{userProfile.name || 'User Name'}</h1>
              <p className="text-gray-600">{userProfile.phoneNumber || 'Phone Number'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-2 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="text-yellow-500" />
                  <h3 className="font-bold">Rating</h3>
                </div>
                <span className="text-2xl font-bold">4.9</span>
              </div>
            </Card>

            <Card className="border-2 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
              <div className="flex items-center space-x-2 mb-4">
                <Clock />
                <h3 className="font-bold">Service History</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm">No services yet</p>
              </div>
            </Card>

            <Card className="border-2 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard />
                <h3 className="font-bold">Payment Methods</h3>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-2 border-black hover:bg-gray-100"
              >
                Add Payment Method
              </Button>
            </Card>
          </div>

          <Button 
            variant="outline"
            className="w-full border-2 border-black hover:bg-gray-100 mt-4"
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
