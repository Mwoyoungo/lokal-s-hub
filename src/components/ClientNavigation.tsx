import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MessageSquare,
  User,
  LogOut,
  Menu,
  Home,
  PlusSquare,
  ListChecks,
  Bell
} from 'lucide-react';

interface ClientNavigationProps {
  userName?: string;
  userImage?: string;
  unreadMessages?: number;
  unreadNotifications?: number;
}

const ClientNavigation: React.FC<ClientNavigationProps> = ({
  userName = '',
  userImage,
  unreadMessages = 0,
  unreadNotifications = 0
}) => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any stored user data
      localStorage.removeItem('userLocation');
      localStorage.removeItem('userAddress');
      
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast.error(error.message || 'Error logging out');
    } finally {
      setLoggingOut(false);
    }
  };

  const MenuItems = () => (
    <div className="flex flex-col gap-2 pt-4">
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          className="justify-start font-bold p-6 border-b-2 border-gray-100"
          onClick={() => navigate('/home')}
        >
          <Home className="mr-4" />
          Home
        </Button>
      </SheetClose>
      
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          className="justify-start font-bold p-6 border-b-2 border-gray-100"
          onClick={() => navigate('/request')}
        >
          <PlusSquare className="mr-4" />
          Create Service Request
        </Button>
      </SheetClose>
      
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          className="justify-start font-bold p-6 border-b-2 border-gray-100"
          onClick={() => navigate('/dashboard')}
        >
          <ListChecks className="mr-4" />
          My Requests
          {unreadNotifications > 0 && (
            <span className="ml-auto bg-yellow-400 text-black font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
              {unreadNotifications}
            </span>
          )}
        </Button>
      </SheetClose>
      
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          className="justify-start font-bold p-6 border-b-2 border-gray-100"
          onClick={() => navigate('/chat')}
        >
          <MessageSquare className="mr-4" />
          My Chats
          {unreadMessages > 0 && (
            <span className="ml-auto bg-red-500 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
              {unreadMessages}
            </span>
          )}
        </Button>
      </SheetClose>
      
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          className="justify-start font-bold p-6 border-b-2 border-gray-100"
          onClick={() => navigate('/profile')}
        >
          <User className="mr-4" />
          My Profile
        </Button>
      </SheetClose>
      
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          className="justify-start font-bold p-6 border-gray-100 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="mr-4" />
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </Button>
      </SheetClose>
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="fixed top-4 right-4 z-50 rounded-full w-12 h-12 bg-black hover:bg-gray-800 border-2 border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all">
          <Menu size={24} />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="border-l-4 border-black min-w-[300px] sm:min-w-[400px]">
        <SheetHeader className="border-b-4 border-black pb-4">
          <SheetTitle className="text-2xl font-black flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-black">
              <AvatarImage src={userImage} />
              <AvatarFallback className="bg-yellow-400 font-bold text-black">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span>{userName || 'Client Menu'}</span>
              <span className="text-sm font-medium text-gray-600">Client</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <MenuItems />
        
        <SheetFooter className="mt-auto pt-4 border-t-2 border-gray-200">
          <div className="text-xs text-gray-500 text-center w-full p-4">
            LOKAL-S Hub © {new Date().getFullYear()}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ClientNavigation;
