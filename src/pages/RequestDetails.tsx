import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

interface ServiceRequest {
  id: string;
  client_id: string;
  service_type: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
}

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from<ServiceRequest>('service_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error(error.message);
      } else {
        setRequest(data);
      }
      setLoading(false);
    };
    fetchRequest();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!request) return <div>Request not found</div>;

  return (
    <div className="min-h-screen bg-[#FFD700] p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Request Details</h1>
        <Card className="p-4 border-2 border-black">
          <p><strong>Type:</strong> {request.service_type}</p>
          <p><strong>Description:</strong> {request.description}</p>
          <p><strong>Budget:</strong> ${request.budget}</p>
          <p><strong>Status:</strong> {request.status}</p>
          <p><strong>Created At:</strong> {new Date(request.created_at).toLocaleString()}</p>
        </Card>
      </div>
    </div>
  );
};

export default RequestDetails;
