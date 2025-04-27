import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Clock, CreditCard, User, CalendarClock, Check, X, Loader2, Star } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';

const ServiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [developer, setDeveloper] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('details');
  
  useEffect(() => {
    fetchCurrentUser();
    fetchServiceDetails();
  }, [id]);
  
  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('You must be logged in to view service details');
        navigate('/login');
        return;
      }
      
      setCurrentUser(session.user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      toast.error('Authentication error');
      navigate('/login');
    }
  };
  
  const fetchServiceDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Fetch service request details including client and developer info
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:client_id(id, first_name, last_name, profile_image_url, email),
          developer:matched_developer_id(id, first_name, last_name, profile_image_url, email, developer_profiles(hourly_rate, average_rating))
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setServiceDetails(data);
      setClient(data.client);
      setDeveloper(data.developer);
    } catch (error) {
      console.error('Error fetching service details:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };
  
  const updateServiceStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setServiceDetails({ ...serviceDetails, status });
      
      toast.success(`Service request ${status}`);
      
      // Fetch updated data
      fetchServiceDetails();
    } catch (error) {
      console.error(`Error ${status} service:`, error);
      toast.error(`Failed to ${status} service`);
    }
  };
  
  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-400 text-black' };
      case 'assigned':
        return { label: 'Assigned', color: 'bg-blue-600 text-white' };
      case 'accepted':
        return { label: 'Accepted', color: 'bg-green-600 text-white' };
      case 'in_progress':
        return { label: 'In Progress', color: 'bg-purple-600 text-white' };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-700 text-white' };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-600 text-white' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-gray-600 text-white' };
      default:
        return { label: status, color: 'bg-gray-400 text-black' };
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Determine if user is client or developer
  const isClient = currentUser?.id === client?.id;
  const isDeveloper = currentUser?.id === developer?.id;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-6 flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <h2 className="font-black text-2xl">Loading service details...</h2>
        </div>
      </div>
    );
  }
  
  if (!serviceDetails) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-6 flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-black text-2xl mb-4">Service Not Found</h2>
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
  
  // Developer status actions
  const renderDeveloperActions = () => {
    if (!isDeveloper) return null;
    
    if (serviceDetails.status === 'assigned') {
      return (
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={() => updateServiceStatus('accepted')}
            className="bg-green-600 hover:bg-green-700 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <Check size={18} />
            Accept Request
          </Button>
          <Button 
            onClick={() => updateServiceStatus('rejected')}
            className="bg-red-600 hover:bg-red-700 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <X size={18} />
            Reject Request
          </Button>
        </div>
      );
    }
    
    if (serviceDetails.status === 'accepted') {
      return (
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={() => updateServiceStatus('in_progress')}
            className="bg-purple-600 hover:bg-purple-700 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <Clock size={18} />
            Start Work
          </Button>
        </div>
      );
    }
    
    if (serviceDetails.status === 'in_progress') {
      return (
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={() => updateServiceStatus('completed')}
            className="bg-green-600 hover:bg-green-700 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <Check size={18} />
            Mark as Completed
          </Button>
        </div>
      );
    }
    
    return null;
  };
  
  // Client status actions
  const renderClientActions = () => {
    if (!isClient) return null;
    
    if (serviceDetails.status === 'pending' || serviceDetails.status === 'assigned') {
      return (
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={() => updateServiceStatus('cancelled')}
            className="bg-red-600 hover:bg-red-700 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <X size={18} />
            Cancel Request
          </Button>
        </div>
      );
    }
    
    if (serviceDetails.status === 'completed') {
      return (
        <div className="flex gap-4 mt-6">
          <Button 
            onClick={() => navigate(`/review/${id}`)}
            className="bg-yellow-400 hover:bg-yellow-500 text-black border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center gap-2"
          >
            <Star size={18} />
            Leave Review
          </Button>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">{serviceDetails.service_type}</h1>
            <div className="flex items-center gap-2">
              <Badge className={`${formatStatus(serviceDetails.status).color} border-2 border-black font-bold px-3 py-1`}>
                {formatStatus(serviceDetails.status).label}
              </Badge>
              <span className="text-sm font-medium">
                Created on {formatDate(serviceDetails.created_at)}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate(-1)}
            className="bg-black hover:bg-gray-800 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
          >
            Back
          </Button>
        </div>
        
        {/* Tabs */}
        <Tabs 
          defaultValue="details" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full mb-8"
        >
          <TabsList className="w-full md:w-auto bg-white border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:bg-black data-[state=active]:text-white font-bold text-lg py-2 px-4"
            >
              Details
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="data-[state=active]:bg-black data-[state=active]:text-white font-bold text-lg py-2 px-4"
            >
              Chat
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Service details card */}
              <Card className="col-span-2 bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="font-black text-xl mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Service Details
                </h2>
                
                <div className="mb-4">
                  <h3 className="font-bold mb-1">Description</h3>
                  <p className="text-gray-800">{serviceDetails.description}</p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-bold mb-1">Budget</h3>
                  <div className="text-xl font-black">${serviceDetails.budget}</div>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-bold mb-1">Status Timeline</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-3 w-3 rounded-full bg-yellow-400 border border-black"></div>
                    <div className="text-sm">Created on {formatDate(serviceDetails.created_at)}</div>
                  </div>
                  {/* Add more timeline events based on status changes */}
                </div>
                
                {/* Action buttons based on role and status */}
                {renderDeveloperActions()}
                {renderClientActions()}
              </Card>
              
              {/* Developer/Client info card depending on user role */}
              <Card className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                {isClient && developer ? (
                  <>
                    <h2 className="font-black text-xl mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Developer
                    </h2>
                    
                    <div className="flex items-center mb-4">
                      <div className="w-16 h-16 overflow-hidden border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] bg-yellow-300">
                        {developer.profile_image_url ? (
                          <img 
                            src={developer.profile_image_url} 
                            alt={`${developer.first_name} ${developer.last_name}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-yellow-300 text-black font-bold text-xl">
                            {developer.first_name[0] + (developer.last_name ? developer.last_name[0] : '')}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <h3 className="font-bold text-lg">{`${developer.first_name} ${developer.last_name}`}</h3>
                        <div className="flex items-center">
                          {developer.developer_profiles?.[0]?.average_rating && (
                            <div className="flex items-center text-sm">
                              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                              {developer.developer_profiles[0].average_rating.toFixed(1)}
                            </div>
                          )}
                          
                          {developer.developer_profiles?.[0]?.hourly_rate && (
                            <div className="ml-3 bg-black text-white px-2 py-0.5 text-xs rounded-full">
                              ${developer.developer_profiles[0].hourly_rate}/hr
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : isDeveloper && client ? (
                  <>
                    <h2 className="font-black text-xl mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Client
                    </h2>
                    
                    <div className="flex items-center mb-4">
                      <div className="w-16 h-16 overflow-hidden border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] bg-yellow-300">
                        {client.profile_image_url ? (
                          <img 
                            src={client.profile_image_url} 
                            alt={`${client.first_name} ${client.last_name}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-yellow-300 text-black font-bold text-xl">
                            {client.first_name[0] + (client.last_name ? client.last_name[0] : '')}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <h3 className="font-bold text-lg">{`${client.first_name} ${client.last_name}`}</h3>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <p className="font-bold">Loading contact information...</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="chat">
            {serviceDetails.status !== 'pending' && currentUser && (
              <div className="h-[600px]">
                {serviceDetails.status === 'rejected' || serviceDetails.status === 'cancelled' ? (
                  <div className="h-full flex items-center justify-center bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-center">
                      <h3 className="font-bold text-xl mb-2">Chat Unavailable</h3>
                      <p className="text-gray-600">This service request has been {serviceDetails.status}, so chat is unavailable.</p>
                    </div>
                  </div>
                ) : (
                  <ChatInterface
                    requestId={id || ''}
                    userId={currentUser.id}
                    recipientId={isClient ? developer?.id : client?.id}
                    recipientName={isClient ? `${developer?.first_name} ${developer?.last_name}` : `${client?.first_name} ${client?.last_name}`}
                    recipientImage={isClient ? developer?.profile_image_url : client?.profile_image_url}
                  />
                )}
              </div>
            )}
            
            {serviceDetails.status === 'pending' && (
              <div className="h-[300px] flex items-center justify-center bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-center">
                  <h3 className="font-bold text-xl mb-2">Chat Not Available Yet</h3>
                  <p className="text-gray-600">Chat will be available once a developer has been assigned and accepts the request.</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ServiceDetails;
