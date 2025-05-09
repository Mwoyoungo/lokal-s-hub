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
import { BarChart3, Bell, Calendar, Check, ChevronRight, Clock, Loader2, MapPin, MoreHorizontal, Plus, Play, User, X } from 'lucide-react';
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
  raw_status?: string; // For debugging
  created_at: string;
  matched_developer_id?: string;
  client: {
    first_name: string;
    last_name: string;
  }
}

const DeveloperDashboard = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<RequestItem[]>([]);
  const [activeRequests, setActiveRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');
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
      
      // Fetch requests - simplify to get all requests first, then filter in code
      // This helps avoid potential SQL query issues
      const { data: allRequestsData, error: allRequestsError } = await supabase
        .from('service_requests')
        .select(
          `id, service_type, description, budget, status, created_at, matched_developer_id, \
          client:users!service_requests_client_id_fkey(first_name, last_name)`
        )
        .order('created_at', { ascending: false });
      
      // We now get all requests in one query, so we don't need this second query
      
      if (allRequestsError) {
        toast.error(`Error fetching requests: ${allRequestsError.message}`);
      }
      
      if (allRequestsData) {
        // Debug: Log all fetched requests
        console.log('Fetched all requests:', allRequestsData);
        
        // Filter and categorize requests
        const pendingItems: RequestItem[] = [];
        const assignedItems: RequestItem[] = [];
        const activeItems: RequestItem[] = [];
        
        allRequestsData.forEach((r: any) => {
          // Normalize status for comparison
          const normalizedStatus = (r.status || '').trim().toLowerCase();
          const client = r.client || { first_name: 'Unknown', last_name: 'Client' };
          
          // Create the request item
          const requestItem: RequestItem = {
            id: r.id,
            service_type: r.service_type,
            description: r.description,
            budget: r.budget,
            status: normalizedStatus,
            raw_status: r.status,
            created_at: r.created_at,
            matched_developer_id: r.matched_developer_id,
            client
          };
          
          // Explicitly log each request for debugging
          console.log(`Request ${r.id}:
  Status: '${r.status}'
  Matched Dev: ${r.matched_developer_id}
  Current Dev: ${userId}`);
          
          // Categorize the request
          if (normalizedStatus === 'pending') {
            // All pending requests go to the pending list
            pendingItems.push(requestItem);
          } else if (normalizedStatus === 'assigned' && r.matched_developer_id === userId) {
            // Only assigned requests for this developer go to assigned list
            console.log(`  -> Assigned to this developer`);
            assignedItems.push(requestItem);
          } else if ((normalizedStatus === 'accepted' || normalizedStatus === 'in_progress') && r.matched_developer_id === userId) {
            // Active requests for this developer
            console.log(`  -> Active job for this developer`);
            activeItems.push(requestItem);
          }
        });
        
        // Update state with categorized requests
        setPendingRequests(pendingItems);
        setAssignedRequests(assignedItems);
        setRequests([...pendingItems, ...assignedItems]); // Keep backward compatibility
        setActiveRequests(activeItems);
      }
      
      // Remove this block - we're handling active requests above
      
      setLoading(false);
    };
    
    fetchRequests();
    
    // Add audio element for notification sound
    const audioElement = document.createElement('audio');
    audioElement.src = '/notification.mp3'; // We'll add this file later
    audioElement.preload = 'auto';
    audioRef.current = audioElement;
    
    // Set up real-time subscriptions
    // 1. Subscription for brand new service requests
    const newRequestsChannel = supabase
      .channel('new_requests_channel')
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
      
    // 2. Subscription for request assignment to this developer
    const assignmentChannel = supabase
      .channel('assignment_channel')
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `matched_developer_id=eq.${userId}` },
          async (payload) => {
            // If the update was to assign this request to the current developer
            if (payload.new.status === 'assigned' && payload.new.matched_developer_id === userId) {
              console.log('New job assigned to you:', payload.new);
              
              // Play notification sound
              playNotificationSound();
              
              // Refetch data to update the UI
              await fetchRequests();
              
              // Get client name for the notification
              const { data: clientData } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', payload.new.client_id)
                .single();
                
              const clientName = clientData ? 
                `${clientData.first_name} ${clientData.last_name}` : 
                'A client';
                
              // Show toast notification
              toast('New service request assigned to you!', {
                icon: <Bell className="h-5 w-5 text-yellow-500" />,
                description: `${clientName} has selected you for a job`,
                duration: 5000,
              });
              
              // Show browser notification if enabled
              if (notificationsEnabled) {
                showBrowserNotification('LOKAL-S: New Assignment', {
                  body: `A client has assigned a new service request to you!`,
                  tag: 'new-assignment',
                });
              }
              
              // Highlight the "new" tab
              setActiveTab('new');
            }
          })
      .subscribe();

    return () => {
      supabase.removeChannel(newRequestsChannel);
      supabase.removeChannel(assignmentChannel);
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
    
    // Keep the matched_developer_id for all states except 'rejected'
    if (newStatus !== 'rejected') {
      // For 'pending' we don't set the matched_developer_id, it will be set when assigned
      // But for 'accepted', 'in_progress', and 'completed' we keep it
      updates.matched_developer_id = devId;
    }
    
    const { error } = await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      // Handle different status transitions with appropriate messages
      if (newStatus === 'accepted') {
        toast.success('Request accepted!', {
          description: 'You have accepted this assignment',
          icon: <Check className="h-5 w-5 text-green-500" />
        });
        
        // Move from assignedRequests to activeRequests
        const requestToMove = assignedRequests.find(r => r.id === id);
        if (requestToMove) {
          const updatedRequest = {...requestToMove, status: 'accepted'};
          setAssignedRequests(prev => prev.filter(r => r.id !== id));
          setActiveRequests(prev => [updatedRequest, ...prev]);
        }
      } else if (newStatus === 'in_progress') {
        toast.success('Started working on request!', {
          description: 'You have marked this request as in progress',
          icon: <Check className="h-5 w-5 text-green-500" />
        });
        
        // Just update the status - request should already be in activeRequests
        setActiveRequests(prev => prev.map(r => 
          r.id === id ? {...r, status: 'in_progress'} : r
        ));
      } else if (newStatus === 'rejected') {
        toast.success('Request rejected', {
          description: 'You will not be assigned to this request',
          icon: <X className="h-5 w-5 text-red-500" />
        });
        
        // Remove from assignedRequests
        setAssignedRequests(prev => prev.filter(r => r.id !== id));
      } else if (newStatus === 'completed') {
        toast.success('Request marked as completed!', {
          description: 'Great job! The client will be notified.',
          icon: <Check className="h-5 w-5 text-green-500" />
        });
        
        // Remove from activeRequests
        setActiveRequests(prev => prev.filter(r => r.id !== id));
      }
      
      // For backward compatibility, also remove from the requests list
      setRequests(prev => prev.filter(r => r.id !== id));
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

    // Helper functions for request status display
  const getStatusDisplayName = (status: string): string => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch(status) {
      case 'pending': return 'bg-gray-200';
      case 'assigned': return 'bg-yellow-200';
      case 'accepted': return 'bg-blue-200';
      case 'in_progress': return 'bg-green-200';
      case 'completed': return 'bg-purple-200';
      case 'rejected': return 'bg-red-200';
      default: return 'bg-gray-200';
    }
  };
  
  // Render task card - neobrutalism style
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

  const renderTaskCard = (request: RequestItem, isActive: boolean) => {
    // Debug output for request status
    console.log(`Rendering card for request ${request.id} with status: ${request.status}`);
    
    // Determine background color based on status
    let statusBgColor = 'bg-white';
    if (request.status === 'assigned') statusBgColor = 'bg-yellow-50';
    if (request.status === 'accepted') statusBgColor = 'bg-blue-50';
    if (request.status === 'in_progress') statusBgColor = 'bg-green-50';
    
    return (
      <Card key={request.id} className={`${statusBgColor} border-4 border-black overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all`}>
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
          {/* Show status badge */}
          <Badge className={`px-3 py-1 text-black font-bold border-2 border-black ${getStatusBadgeColor(request.status)}`}>
            {getStatusDisplayName(request.status)}
          </Badge>

          {/* For Active requests (already accepted or in progress) */}
          {isActive && (
            <>
              {request.status === 'accepted' && (
                <Button 
                  onClick={() => handleAction(request.id, 'in_progress')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                >
                  <Play size={18} className="mr-2" /> Start Work
                </Button>
              )}
              
              {request.status === 'in_progress' && (
                <Button 
                  onClick={() => handleAction(request.id, 'completed')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                >
                  <Check size={18} className="mr-2" /> Mark Complete
                </Button>
              )}
            </>
          )}

          {/* For New requests (pending or assigned) */}
          {!isActive && (
            <>
              {/* For assigned requests, show accept/reject buttons */}
              {/* Show accept/reject buttons if request is assigned to this developer */}
              {(request.status === 'assigned' || request.raw_status === 'assigned') && request.matched_developer_id === userId && (
                <>
                  <Button 
                    onClick={() => handleAction(request.id, 'accepted')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                  >
                    <Check size={18} className="mr-2" /> Accept
                  </Button>
                  <Button 
                    onClick={() => handleAction(request.id, 'rejected')}
                    variant="outline"
                    className="flex-1 bg-white hover:bg-gray-100 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                  >
                    <X size={18} className="mr-2" /> Reject
                  </Button>
                </>
              )}
              
              {/* For pending requests, show view only or disabled button */}
              {(request.status === 'pending' || request.raw_status === 'pending') && (
                <Button
                  variant="outline"
                  className="flex-1 bg-white hover:bg-gray-100 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                  disabled
                >
                  <Clock size={18} className="mr-2" /> Awaiting Assignment
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
    );
  };

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
            <TabsList className="w-full sm:w-auto bg-white border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ minWidth: '500px' }}>
              <TabsTrigger 
                value="assigned" 
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black font-bold text-lg py-2 px-4">
                Assigned {assignedRequests.length > 0 && `(${assignedRequests.length})`}
              </TabsTrigger>
              <TabsTrigger 
                value="new" 
                className="data-[state=active]:bg-black data-[state=active]:text-white font-bold text-lg py-2 px-4">
                New {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </TabsTrigger>
              <TabsTrigger 
                value="active" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-black font-bold text-lg py-2 px-4">
                Active {activeRequests.length > 0 && `(${activeRequests.length})`}
              </TabsTrigger>
            </TabsList>
            
            <Button className="bg-black hover:bg-gray-800 text-white border-4 border-black font-bold gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
              <Plus className="w-5 h-5" />
              Add New Task
            </Button>
          </div>
          
          <TabsContent value="assigned">
            {assignedRequests.length === 0 ? (
              <Card className="bg-white border-4 border-dashed border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
                <p className="font-bold text-xl">No assigned requests</p>
                <p className="font-medium mt-2">You will see requests that clients have assigned to you here</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {assignedRequests.map(request => (
                  <Card key={request.id} className="bg-yellow-50 border-4 border-black overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
                    <div className="p-4 border-b-4 border-black bg-yellow-400">
                      <div className="flex justify-between items-center">
                        <h3 className="font-black text-lg tracking-tight">{request.service_type}</h3>
                        <Badge className="bg-black text-white font-bold px-3 py-1 text-sm">
                          ${request.budget}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <p className="font-medium mb-4">{request.description}</p>
                      
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
                      
                      <div className="flex gap-3 mt-4 pt-4 border-t-2 border-gray-200">
                        <Badge className={`px-3 py-1 text-black font-bold border-2 border-black bg-yellow-200`}>
                          Assigned to You
                        </Badge>

                        <Button 
                          onClick={() => handleAction(request.id, 'accepted')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                        >
                          <Check size={18} className="mr-2" /> Accept Job
                        </Button>
                        <Button 
                          onClick={() => handleAction(request.id, 'rejected')}
                          variant="outline"
                          className="flex-1 bg-white hover:bg-gray-100 text-black font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all"
                        >
                          <X size={18} className="mr-2" /> Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="new">
            {pendingRequests.length === 0 ? (
              <Card className="bg-white border-4 border-dashed border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
                <p className="font-bold text-xl">No new requests available</p>
                <p className="font-medium mt-2">Check back later for new service requests</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {pendingRequests.map(request => renderTaskCard(request, false))}
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
