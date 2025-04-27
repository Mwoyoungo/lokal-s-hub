import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { UserSearch, Loader2, MapPin, ArrowLeft, Clock } from 'lucide-react';

interface ServiceRequest {
  id: string;
  client_id: string;
  service_type: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
  address?: string;
  location?: string;
  matched_developer_id?: string;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  developer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }
    };
    
    const fetchRequest = async () => {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select(`
            *,
            client:client_id(id, first_name, last_name),
            developer:matched_developer_id(id, first_name, last_name)
          `)
          .eq('id', id)
          .single();
          
        if (error) {
          throw error;
        }
        
        setRequest(data);
      } catch (error: any) {
        console.error('Error fetching request details:', error);
        toast.error(error.message || 'Failed to load request details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentUser();
    fetchRequest();
  }, [id, navigate]);

  // Status formatting
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-yellow-400 text-black border-2 border-black font-bold">Pending</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-600 text-white border-2 border-black font-bold">Assigned</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600 text-white border-2 border-black font-bold">Accepted</Badge>;
      case 'in_progress':
        return <Badge className="bg-purple-600 text-white border-2 border-black font-bold">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-700 text-white border-2 border-black font-bold">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-600 text-white border-2 border-black font-bold">Cancelled</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white border-2 border-black font-bold">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-400 text-black border-2 border-black font-bold">{status}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Check if user is the client who created this request
  const isClient = currentUser?.id === request?.client_id;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-6 flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <h2 className="font-black text-2xl">Loading request details...</h2>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!request) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-6 flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-black text-2xl mb-4">Request Not Found</h2>
          <p className="mb-6">The service request you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button 
            onClick={() => navigate(-1)}
            className="bg-black hover:bg-gray-800 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate(-1)}
            className="bg-black hover:bg-gray-800 text-white border-2 border-black font-bold py-1 px-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span className="text-sm font-medium">Created {formatDate(request.created_at)}</span>
          </div>
        </div>
        
        {/* Request details card */}
        <Card className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h1 className="text-3xl font-black tracking-tight mb-2 md:mb-0">{request.service_type}</h1>
            {getStatusBadge(request.status)}
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold mb-2">Description</h3>
            <p className="text-gray-800 bg-gray-50 p-4 border-2 border-gray-200 rounded-md">{request.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-bold mb-2">Budget</h3>
              <div className="text-3xl font-black text-green-700">${request.budget.toFixed(2)}</div>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">Location</h3>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-red-500" />
                <span>{request.address || 'No address provided'}</span>
              </div>
            </div>
          </div>
          
          {/* Show developer info if matched */}
          {request.matched_developer_id && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">Assigned Developer</h3>
              <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-md">
                <div className="font-bold">
                  {request.developer?.first_name} {request.developer?.last_name}
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            {/* Show Find Developer button only if this is a pending request and the current user is the client */}
            {request.status === 'pending' && isClient && (
              <Button 
                onClick={() => navigate('/select-developer', { state: { requestId: request.id } })}
                className="bg-black hover:bg-gray-800 text-white border-3 border-black font-bold py-3 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
              >
                <UserSearch size={20} />
                Find Developer
              </Button>
            )}
            
            {/* Show View Details button if the request has been assigned */}
            {(request.status === 'assigned' || request.status === 'accepted' || request.status === 'in_progress') && (
              <Button 
                onClick={() => navigate(`/service/${request.id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white border-3 border-black font-bold py-3 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex-1 flex justify-center items-center gap-2"
              >
                View Details & Chat
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RequestDetails;
