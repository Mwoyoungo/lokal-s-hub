import React, { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  BellRing, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DeveloperLayoutProps {
  children: ReactNode;
}

const DeveloperLayout: React.FC<DeveloperLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      // Clear local session first
      localStorage.removeItem('supabase.auth.token');
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during logout:', error);
        // Continue with local logout even if API call fails
      }
      
      // Show success message and redirect regardless
      toast.success('Logged out successfully');
      
      // Force redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed. Please try again.');
      
      // Force redirect to login page anyway
      navigate('/login');
    }
  };

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/developer', 
      icon: <div className="w-6 h-6 flex items-center justify-center">📋</div>
    },
    { 
      name: 'Calendar', 
      path: '/developer/calendar', 
      icon: <Calendar className="w-5 h-5" /> 
    },
    { 
      name: 'Messages', 
      path: '/developer/messages', 
      icon: <MessageSquare className="w-5 h-5" /> 
    },
    { 
      name: 'Statistics', 
      path: '/developer/statistics', 
      icon: <BarChart3 className="w-5 h-5" /> 
    },
    { 
      name: 'Notifications', 
      path: '/developer/notifications', 
      icon: <BellRing className="w-5 h-5" /> 
    },
    { 
      name: 'Profile', 
      path: '/developer/profile', 
      icon: <User className="w-5 h-5" /> 
    },
    { 
      name: 'Settings', 
      path: '/developer/settings', 
      icon: <Settings className="w-5 h-5" /> 
    },
  ];

  return (
    <div className="flex h-screen bg-[#FFD700] text-black overflow-hidden">
      {/* Mobile sidebar toggle button */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      >
        {mobileSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar - Desktop always visible, Mobile conditionally */}
      <div 
        className={cn(
          "w-64 bg-white border-r-4 border-black flex flex-col transition-all duration-300",
          mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 lg:relative" : "fixed -left-64 lg:left-0 lg:relative"
        )}
      >
        <div className="p-4 border-b-4 border-black bg-[#FFD700]">
          <h1 className="text-xl font-black tracking-tight">LOKAL-S Hub</h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-3 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 text-sm border-2 transition-all",
                isActive(item.path) 
                  ? "bg-black text-white font-bold border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]" 
                  : "border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] bg-white hover:translate-y-[-2px] hover:translate-x-[-2px]"
              )}
            >
              <span className="mr-3">{item.icon}</span>
              <span className="font-bold">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t-4 border-black">
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="w-full flex items-center justify-start px-4 py-3 text-sm font-bold border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Log out</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default DeveloperLayout;
