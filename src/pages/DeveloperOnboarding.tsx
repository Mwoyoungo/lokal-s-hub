import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

const DeveloperOnboarding: React.FC = () => {
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    // Upsert or update developer profile
    const { data: existing } = await supabase
      .from('developer_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('developer_profiles')
        .update({ bio, hourly_rate: parseFloat(hourlyRate), portfolio_url: portfolioUrl, availability_status: true })
        .eq('id', user.id);
    } else {
      await supabase
        .from('developer_profiles')
        .insert({ id: user.id, user_id: user.id, bio, hourly_rate: parseFloat(hourlyRate), portfolio_url: portfolioUrl, availability_status: true });
    }
    toast.success('Developer details saved!');
    navigate('/developers');
  };

  return (
    <div className="min-h-screen bg-[#FFD700] flex flex-col justify-center p-6">
      <div className="bg-white border-4 border-black shadow p-8 rounded-lg max-w-md mx-auto">
        <h1 className="text-3xl font-black mb-6 text-center">Developer Details</h1>
        <div className="space-y-4">
          <Input
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="border-2 border-black"
          />
          <Input
            placeholder="Hourly Rate"
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="border-2 border-black"
          />
          <Input
            placeholder="Portfolio URL"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="border-2 border-black"
          />
          <Button onClick={handleSubmit} className="w-full bg-black text-white">
            Save Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperOnboarding;
