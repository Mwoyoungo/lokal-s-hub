import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

interface DeveloperProfile {
  id: string;
  user_id: string;
  bio: string;
  hourly_rate: number;
  average_rating: number;
  user: { first_name: string; last_name: string };
}

const Developers: React.FC = () => {
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDevelopers = async () => {
      const { data, error } = await supabase
        .from<DeveloperProfile>('developer_profiles')
        .select('id, user_id, bio, hourly_rate, average_rating, users (first_name, last_name)')
        .eq('availability_status', true);
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setDevelopers(data.map(item => ({
          ...item,
          user: item.users
        })));
      }
      setLoading(false);
    };
    fetchDevelopers();
  }, []);

  if (loading) return <div>Loading developers...</div>;

  return (
    <div className="min-h-screen bg-[#FFD700] p-4">
      <h1 className="text-2xl font-bold mb-4">Available Developers</h1>
      <div className="space-y-4">
        {developers.map(dev => (
          <Card key={dev.id} className="border-2 border-black p-4">
            <h2 className="text-xl font-bold">
              {dev.user.first_name} {dev.user.last_name}
            </h2>
            <p>{dev.bio}</p>
            <p>Rate: ${dev.hourly_rate}/hr</p>
            <p>Rating: {dev.average_rating}</p>
            <Button onClick={() => navigate(`/developers/${dev.user_id}`)} className="mt-2 bg-black text-white">
              View Profile
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Developers;
