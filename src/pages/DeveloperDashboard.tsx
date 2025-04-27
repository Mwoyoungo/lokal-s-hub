import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Bell, Calendar, Check, ChevronRight, Clock, Loader2, MapPin, MoreHorizontal, Plus, User, X } from 'lucide-react';
import DeveloperLayout from '@/components/DeveloperLayout';
import { cn } from '@/lib/utils';
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '@/utils/notificationSound';
import { updateUserLocation } from '@/utils/locationUtils';
import LocationPicker from '@/components/LocationPicker';

interface RequestItem {
  id: string;
  service_type: string;
  description: string;
  budget: number;
  status: string;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
  }
}

const DeveloperDashboard: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeRequests, setActiveRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const [available, setAvailable] = useState(false); // Default to false until we get the actual status
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  // Initialize notification permission
  useEffect(() => {
    const initNotifications = async () => {
      const permissionGranted = await requestNotificationPermission();
      setNotificationsEnabled(permissionGranted);
    };
    
    initNotifications();
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      // get current user id via session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }
      
      setUserId(currentUserId);
      
      // Fetch developer's current availability status
      const { data: profileData, error: profileError } = await supabase
        .from('developer_profiles')
        .select('availability_status')
        .eq('user_id', currentUserId)
        .single();
      
      if (profileError) {
        console.error('Error fetching developer profile:', profileError);
      } else if (profileData) {
        console.log('Developer availability status:', profileData.availability_status);
        setAvailable(Boolean(profileData.availability_status));
      }
      
      // Update developer location
      updateUserLocation(currentUserId).then(success => {
        if (success) {
          console.log('Developer location updated successfully');
        } else {
          toast.warning('Location access is required for optimal service matching', {
            description: 'Please enable location access to receive nearby service requests',
            duration: 5000
          });
        }
      });
      
      // Fetch pending requests (new)
      const { data: pendingData, error: pendingError } = await supabase
        .from('service_requests')
        .select(
          `id, service_type, description, budget, status, created_at, \
          client:users!service_requests_client_id_fkey(first_name, last_name)`
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      // Fetch active requests (in progress)
      let activeData = null;
      let activeError = null;
      
      if (userId) {
        const result = await supabase
          .from('service_requests')
          .select(
            `id, service_type, description, budget, status, created_at, \
            client:users!service_requests_client_id_fkey(first_name, last_name)`
          )
          .eq('status', 'in_progress')
          .eq('matched_developer_id', userId)
          .order('created_at', { ascending: false });
          
        activeData = result.data;
        activeError = result.error;
      } else {
        // If userId is null, just use an empty array for active requests
        activeData = [];
      }
      
      if (pendingError) {
        toast.error(`Error fetching pending requests: ${pendingError.message}`);
      }
      
      if (activeError) {
        toast.error(`Error fetching active requests: ${activeError.message}`);
      }
      
      if (pendingData) {
        // Process pending requests
        const pendingItems = pendingData.map((r: any) => {
          const client = r.client || { first_name: 'Unknown', last_name: 'Client' };
          return {
            id: r.id,
            service_type: r.service_type,
            description: r.description,
            budget: r.budget,
            status: r.status,
            created_at: r.created_at,
            client
          };
        });
        setRequests(pendingItems);
      }
      
      if (activeData) {
        // Process active requests
        const activeItems = activeData.map((r: any) => {
          const client = r.client || { first_name: 'Unknown', last_name: 'Client' };
          return {
            id: r.id,
            service_type: r.service_type,
            description: r.description,
            budget: r.budget,
            status: r.status,
            created_at: r.created_at,
            client
          };
        });
        setActiveRequests(activeItems);
      }
      
      setLoading(false);
    };
    
    fetchRequests();
    
    // Add audio element for notification sound
    const audioElement = document.createElement('audio');
    audioElement.src = '/notification.mp3'; // We'll add this file later
    audioElement.preload = 'auto';
    audioRef.current = audioElement;
    
    // Set up real-time subscription for new requests
    const channel = supabase
      .channel('service_requests_channel')
      .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `status=eq.pending` },
          async (payload) => {
            // Check if this is a nearby request using our function
            if (userId) {
              try {
                // Check if the developer is within range of this request
                const newRequestId = payload.new.id;
                const { data: nearbyDevs, error: proximityError } = await supabase
                  .rpc('developers_within_distance', { 
                    request_id: newRequestId,
                    max_distance_km: 50 
                  });
                
                if (proximityError) {
                  console.error('Error checking proximity:', proximityError);
                  return;
                }
                
                // Check if this developer is in the nearby list
                const isNearby = nearbyDevs?.some(dev => dev.user_id === userId);
                
                if (isNearby) {
                  // Play notification sound
                  playNotificationSound();
                  
                  // Refetch data when there's a new request
                  await fetchRequests();
                  
                  // Show toast notification with distance
                  const myData = nearbyDevs.find(dev => dev.user_id === userId);
                  const distance = myData ? Math.round(myData.distance_km * 10) / 10 : null;
                  
                  toast('New service request available!', {
                    icon: <Bell className="h-5 w-5 text-yellow-500" />,
                    description: distance ? `${distance}km away from your location` : 'Nearby request',
                    duration: 5000,
                  });
                  
                  // Show browser notification if enabled
                  if (notificationsEnabled) {
                    showBrowserNotification('LOKAL-S: New Request', {
                      body: `A new service request is available ${distance}km away!`,
                      tag: 'new-request',
                    });
                  }
                  
                  // Highlight the "new" tab
                  setActiveTab('new');
                } else {
                  console.log('New request detected but not within your 50km radius');
                }
              } catch (error) {
                console.error('Error processing new request notification:', error);
              }
            }
          })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  // Toggle developer availability
  const toggleAvailability = async () => {
    try {
      if (!userId) return;
      
      // Toggle state locally
      const newStatus = !available;
      setAvailable(newStatus);
      
      // Update in database
      const { error } = await supabase
        .from('developer_profiles')
        .update({ availability_status: newStatus })
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      // Dispatch a custom event for real-time communication across the app
      window.dispatchEvent(
        new CustomEvent('developerAvailabilityChanged', { 
          detail: { userId, status: newStatus } 
        })
      );
      
      toast.success(`You are now ${newStatus ? 'available' : 'unavailable'} for new requests`, {
        icon: newStatus ? <Check className="text-green-500" /> : <X className="text-red-500" />,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast.error(`Failed to update availability: ${error.message}`);
      
      // Revert the state change
      setAvailable(!available);
    }
  };

  const handleAction = async (id: string, newStatus: string) => {
    // get current user id
    const { data: { session } } = await supabase.auth.getSession();
    const devId = session?.user?.id;
    if (!devId) {
      toast.error('Authentication required');
      return;
    }
    
    // build update payload
    const updates: any = { status: newStatus };
    if (newStatus === 'in_progress') updates.matched_developer_id = devId;
    
    const { error } = await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      if (newStatus === 'in_progress') {
        toast.success('Request accepted!', {
          description: 'You can now start working on this request',
          icon: <Check className="h-5 w-5 text-green-500" />
        });
        
        // Move request from pending to active
        const acceptedRequest = requests.find(r => r.id === id);
        if (acceptedRequest) {
          setActiveRequests(prev => [acceptedRequest, ...prev]);
        }
      } else if (newStatus === 'rejected') {
        toast.success('Request rejected', {
          icon: <X className="h-5 w-5 text-red-500" />
        });
      } else if (newStatus === 'completed') {
        toast.success('Request marked as completed!', {
          icon: <Check className="h-5 w-5 text-green-500" />
        });
      }
      
      // Remove from appropriate list
      if (newStatus === 'in_progress') {
        setRequests(prev => prev.filter(r => r.id !== id));
      } else if (newStatus === 'rejected') {
        setRequests(prev => prev.filter(r => r.id !== id));
      } else if (newStatus === 'completed') {
        setActiveRequests(prev => prev.filter(r => r.id !== id));
      }
    }
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render task card - neobrutalism style
  const renderTaskCard = (request: RequestItem, isActive: boolean) => (
    <Card className="bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
      {/* Colored header based on status */}
      <div className={`p-4 border-b-4 border-black ${isActive ? 'bg-green-400' : 'bg-yellow-400'}`}>
        <div className="flex justify-between items-center">
          <h3 className="font-black text-lg tracking-tight">{request.service_type}</h3>
          <Badge className="bg-black text-white font-bold px-3 py-1 text-sm">
            ${request.budget}
          </Badge>
        </div>
      </div>
      
      <div className="p-4">
        {/* Task description */}
        <p className="font-medium mb-4">{request.description}</p>
        
        {/* Task meta information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-300 border-2 border-black flex items-center justify-center">
              <User size={16} className="text-black" />
            </div>
            <span className="font-bold text-sm">{request.client.first_name} {request.client.last_name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-8 h-8 bg-purple-300 border-2 border-black flex items-center justify-center">
              <Clock size={16} className="text-black" />
            </div>
            <span>{formatDate(request.created_at)}</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t-2 border-gray-200">
          {isActive ? (
            <Button 
              onClick={() => handleAction(request.id, 'completed')}
              className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
            >
              <Check size={18} className="mr-2" /> Mark Complete
            </Button>
          ) : (
            <>
              <Button 
                onClick={() => handleAction(request.id, 'in_progress')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
              >
                Accept
              </Button>
              <Button 
                onClick={() => handleAction(request.id, 'rejected')}
                variant="outline"
                className="flex-1 bg-white hover:bg-gray-100 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <DeveloperLayout>
        <div className="min-h-screen bg-[#FFD700] flex items-center justify-center">
          <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-black mb-4" />
            <p className="text-xl font-black">Loading Dashboard...</p>
          </div>
        </div>
      </DeveloperLayout>
    );
  }

  // Handle location picker open/close
  const toggleLocationPicker = () => setShowLocationPicker(!showLocationPicker);
  
  // Handle location save
  const handleLocationSaved = async (location: {lat: number, lng: number}, address: string) => {
    if (!userId) return;
    
    try {
      setCurrentLocation(location);
      
      // Format for PostGIS
      const point = `POINT(${location.lng} ${location.lat})`;
      
      // Save to database
      const { error } = await supabase
        .from('users')
        .update({ 
          location: point,
          address: address
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast.success('Location updated successfully');
      
      // Notify other components about location change
      window.dispatchEvent(
        new CustomEvent('developerLocationChanged', { 
          detail: { userId, location, address } 
        })
      );
      
      // Close the location picker
      setShowLocationPicker(false);
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast.error('Failed to update location');
    }
  };

  // Location modal
  const LocationModal = () => {
    if (!showLocationPicker) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden">
          <div className="bg-black p-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <h2 className="text-xl font-bold">Set Your Location</h2>
            </div>
            <Button variant="ghost" className="h-8 w-8 p-0 text-white" onClick={toggleLocationPicker}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-grow overflow-hidden">
            {userId && (
              <LocationPicker 
                userId={userId}
                onLocationSaved={handleLocationSaved}
                autoSave={false}
                buttonText="Save My Location"
                showHeader={false}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DeveloperLayout>
      {/* Location picker modal */}
      <LocationModal />
      
      <div className="min-h-screen bg-[#FFD700] p-6">
        {/* Header with status toggle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Developer Dashboard</h1>
            <p className="text-black font-medium">Manage your service requests and projects</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white border-4 border-black px-4 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <Label htmlFor="available" className="text-base font-bold">Available for new jobs</Label>
            <Switch 
              id="available" 
              checked={available} 
              onCheckedChange={toggleAvailability}
              className="data-[state=checked]:bg-green-600 border-4 border-black"
            />
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold">New Requests</p>
                <h3 className="text-4xl font-black tracking-tight mt-1">{requests.length}</h3>
              </div>
              <div className="w-16 h-16 bg-green-400 border-3 border-black flex items-center justify-center">
                <Calendar className="w-8 h-8 text-black" />
              </div>
            </div>
            <div className="mt-4 text-base flex items-center text-blue-700 font-bold">
              <ChevronRight className="w-5 h-5" />
              <span>View all requests</span>
            </div>
          </Card>
          
          <Card className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold">Your Location</p>
                <h3 className="text-4xl font-black tracking-tight mt-1">{currentLocation ? 'Set' : 'Not Set'}</h3>
              </div>
              <div className="w-16 h-16 bg-yellow-400 border-3 border-black flex items-center justify-center">
                <MapPin className="w-8 h-8 text-black" />
              </div>
            </div>
            <div className="mt-4 text-base flex items-center text-blue-700 font-bold cursor-pointer" onClick={toggleLocationPicker}>
              <ChevronRight className="w-5 h-5" />
              <span>Set your location manually</span>
            </div>
          </Card>
          
          <Card className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold">Total Earnings</p>
                <h3 className="text-4xl font-black tracking-tight mt-1">$1,250</h3>
              </div>
              <div className="w-16 h-16 bg-purple-400 border-3 border-black flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-black" />
              </div>
            </div>
            <div className="mt-4 text-base flex items-center text-blue-700 font-bold">
              <ChevronRight className="w-5 h-5" />
              <span>View earnings details</span>
            </div>
          </Card>
        </div>
        
        {/* Tabs for requests */}
        <Tabs 
          defaultValue="new" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <TabsList className="w-full sm:w-auto bg-white border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <TabsTrigger 
                value="new" 
                className="data-[state=active]:bg-black data-[state=active]:text-white font-bold text-lg py-2 px-4">
                New Requests {requests.length > 0 && `(${requests.length})`}
              </TabsTrigger>
              <TabsTrigger 
                value="active" 
                className="data-[state=active]:bg-black data-[state=active]:text-white font-bold text-lg py-2 px-4">
                Active Jobs {activeRequests.length > 0 && `(${activeRequests.length})`}
              </TabsTrigger>
            </TabsList>
            
            <Button className="bg-black hover:bg-gray-800 text-white border-4 border-black font-bold gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
              <Plus className="w-5 h-5" />
              Add New Task
            </Button>
          </div>
          
          <TabsContent value="new">
            {requests.length === 0 ? (
              <Card className="bg-white border-4 border-dashed border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
                <p className="font-bold text-xl">No new requests available</p>
                <p className="font-medium mt-2">Check back later for new service requests</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {requests.map(request => renderTaskCard(request, false))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="active">
            {activeRequests.length === 0 ? (
              <Card className="bg-white border-4 border-dashed border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
                <p className="font-bold text-xl">No active jobs</p>
                <p className="font-medium mt-2">Accept new requests to see them here</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {activeRequests.map(request => renderTaskCard(request, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DeveloperLayout>
  );
};

export default DeveloperDashboard;
