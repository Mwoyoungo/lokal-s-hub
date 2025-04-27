import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      console.error(authError);
      toast.error(authError.message);
      return;
    }
    if (authData.session) {
      const userId = authData.session.user.id;
      // Check if user already has a first_name set (profile completed)
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('first_name, user_type')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) {
        toast.error(userError.message);
        navigate('/onboarding');
      } else if (!userRecord?.first_name) {
        // If profile not completed, redirect to onboarding
        navigate('/onboarding');
      } else {
        // Check if user is a developer, redirect accordingly
        if (userRecord.user_type === 'developer') {
          toast.success('Welcome back, Developer!');
          navigate('/developer');
        } else {
          // Regular client user
          navigate('/home');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD700] flex items-center justify-center">
      <div className="bg-white border-4 border-black p-8 rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.7)] w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Welcome Back</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-2 border-black"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-2 border-black"
            />
          </div>
          <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">
            Login
          </Button>
        </form>
        <p className="mt-4 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
