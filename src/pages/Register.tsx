import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProvider, setIsProvider] = useState(false);

  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      console.error(authError);
      toast.error(authError.message);
      return;
    }
    if (authData.user) {
      // create profile record
      await supabase.from('users').insert({
        id: authData.user.id,
        email,
        user_type: isProvider ? 'developer' : 'client'
      });
      toast.success('Account created! Please complete your profile.');
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD700] flex items-center justify-center">
      <div className="bg-white border-4 border-black p-8 rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.7)] w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Create Account</h1>
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
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isProvider}
              onChange={(e) => setIsProvider(e.target.checked)}
              className="rounded border-2 border-black"
            />
            <span>Register as a Service Provider</span>
          </label>
          <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">
            Register
          </Button>
        </form>
        <p className="mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
