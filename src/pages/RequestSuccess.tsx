import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, ChevronRight, MessageSquare, Home } from 'lucide-react';

interface ServiceRequest {
  id: string;
  service_type: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
  matched_developer_id: string;
  client_id: string;
}

interface Developer {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  hourly_rate?: number;
  average_rating?: number;
}

const RequestSuccess: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [developer, setDeveloper] = useState<Developer | null>(null);
  
  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);
  
  const fetchRequestDetails = async () => {
    if (!requestId) {
      toast.error('Request ID is missing');
      navigate('/home');
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch the service request
      const { data: requestData, error: requestError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (requestError) throw requestError;
      if (!requestData) throw new Error('Request not found');
      
      setRequest(requestData);
      
      // Fetch the matched developer details
      if (requestData.matched_developer_id) {
        const { data: developerData, error: developerError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            profile_image_url,
            developer_profiles(hourly_rate, average_rating)
          `)
          .eq('id', requestData.matched_developer_id)
          .single();
        
        if (developerError) throw developerError;
        if (developerData) {
          const profiles = Array.isArray(developerData.developer_profiles) 
            ? developerData.developer_profiles : [];
          // Explicitly type the profile to avoid TypeScript errors
          const profile: { hourly_rate?: number; average_rating?: number } = 
            profiles.length > 0 ? profiles[0] || {} : {};
          
          setDeveloper({
            id: developerData.id,
            first_name: developerData.first_name,
            last_name: developerData.last_name,
            profile_image_url: developerData.profile_image_url,
            hourly_rate: profile.hourly_rate,
            average_rating: profile.average_rating
          });
        }
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-6 flex items-center justify-center">
        <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-pulse">
          <h2 className="font-black text-2xl">Loading request details...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2">Request Submitted Successfully!</h1>
          <p className="text-xl">Your developer has been assigned to your service request.</p>
        </div>
        
        <Card className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6">
          <h2 className="text-2xl font-bold mb-4">Service Request Details</h2>
          
          {request && (
            <div className="grid gap-4">
              <div className="flex justify-between border-b-2 border-gray-100 pb-2">
                <span className="font-semibold">Service Type:</span>
                <span>{request.service_type}</span>
              </div>
              
              <div className="flex justify-between border-b-2 border-gray-100 pb-2">
                <span className="font-semibold">Description:</span>
                <span className="text-right">{request.description}</span>
              </div>
              
              <div className="flex justify-between border-b-2 border-gray-100 pb-2">
                <span className="font-semibold">Budget:</span>
                <span>${request.budget}</span>
              </div>
              
              <div className="flex justify-between border-b-2 border-gray-100 pb-2">
                <span className="font-semibold">Status:</span>
                <span className="px-2 py-1 bg-yellow-200 rounded-full text-sm font-medium">
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
            </div>
          )}
        </Card>
        
        {developer && (
          <Card className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
            <h2 className="text-2xl font-bold mb-4">Assigned Developer</h2>
            
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden mr-4">
                {developer.profile_image_url ? (
                  <img src={developer.profile_image_url} alt="Developer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-yellow-400 text-black font-bold text-xl">
                    {developer.first_name.charAt(0)}{developer.last_name.charAt(0)}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-bold">{developer.first_name} {developer.last_name}</h3>
                {developer.hourly_rate && (
                  <p className="text-sm">${developer.hourly_rate}/hr</p>
                )}
              </div>
            </div>
          </Card>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => navigate('/home')} 
            variant="outline" 
            className="flex-1 bg-white hover:bg-gray-100 border-3 border-black font-bold py-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]"
          >
            <Home className="mr-2 h-5 w-5" />
            Return Home
          </Button>
          
          <Button 
            onClick={() => navigate('/messages')} 
            className="flex-1 bg-black text-white hover:bg-gray-800 border-3 border-black font-bold py-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Message Developer
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestSuccess;
