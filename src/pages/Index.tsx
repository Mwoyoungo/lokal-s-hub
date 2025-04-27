import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const userId = session.user.id;
        // Get user profile to check user type
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('user_type, first_name')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching user profile:', error);
        } else if (userProfile) {
          // If user has not completed profile, redirect to onboarding
          if (!userProfile.first_name) {
            navigate('/onboarding');
            return;
          }
          
          // Redirect based on user type
          if (userProfile.user_type === 'developer') {
            navigate('/developer');
          } else {
            navigate('/home');
          }
          return;
        }
      }
      setLoading(false);
    };
    
    checkSession();
  }, [navigate]);
  
  if (loading) {
    return <div className="min-h-screen bg-[#FFD700] flex items-center justify-center">
      <div className="text-xl font-bold">Loading...</div>
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-[#FFD700]">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold">Local Services Hub</h1>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="outline" className="border-2 border-black bg-white hover:bg-gray-100">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-black text-white hover:bg-gray-800">
                Register
              </Button>
            </Link>
          </div>
        </nav>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-black mb-6">Connect with Local Service Providers</h2>
            <p className="text-xl mb-8">Find trusted professionals for web development and app creation services in your area.</p>
            <Link to="/register">
              <Button className="bg-black text-white hover:bg-gray-800 text-xl px-8 py-6">
                Get Started
              </Button>
            </Link>
          </div>
          <div className="bg-white border-4 border-black p-8 rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.7)]">
            <h3 className="text-2xl font-bold mb-4">Our Services</h3>
            <ul className="space-y-4">
              <li className="flex items-center">
                <span className="text-xl mr-2">💻</span>
                <span>Custom Website Development</span>
              </li>
              <li className="flex items-center">
                <span className="text-xl mr-2">🛒</span>
                <span>E-Commerce Solutions</span>
              </li>
              <li className="flex items-center">
                <span className="text-xl mr-2">📱</span>
                <span>Mobile App Development</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
