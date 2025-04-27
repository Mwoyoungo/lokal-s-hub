import React, { useState, useEffect } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ServiceSelection from '@/components/ServiceSelection';
import { useNavigate } from 'react-router-dom';
import { getAvailableDevelopers, createFallbackDevelopers, Developer } from '@/utils/developerUtils';
import { getCurrentPosition, setupLocationTracking } from '@/lib/geolocation';
import Map from '@/components/Map';
import { supabase } from '@/lib/supabase';
import ClientNavigation from '@/components/ClientNavigation';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [serviceSelectionOpen, setServiceSelectionOpen] = useState(false);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [userProfile] = useState(() => {
    const profile = localStorage.getItem('userProfile');
    return profile ? JSON.parse(profile) : null;
  });

  // Get Supabase session for user data
  const [session, setSession] = useState<any>(null);
  
  // Get session on component mount
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
  }, []);

  // Handle user logout
  const handleLogout = async () => {
    try {
      // Try global sign out
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Continue with clean up even if there's an API error
      if (error) {
        console.error('Error during logout API call:', error);
        toast.warning('Continuing with local logout...');
      } else {
        toast.success('Logged out successfully');
      }
      
      // Clear all necessary local storage items
      localStorage.removeItem('userProfile');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('userLocation');
      
      // Redirect to login page
      navigate('/login');
    } catch (err) {
      console.error('Unexpected error during logout:', err);
      toast.error('Logout process encountered an error');
      
      // Force redirect as fallback
      navigate('/login');
    }
  };

  // Initialize location tracking
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast.error('Authentication required');
          navigate('/login');
          return;
        }
        
        // Set up location tracking and handle cleanup
        const stopTracking = setupLocationTracking(session.user.id, (coords) => {
          console.log('Home: Location updated', coords);
          // Store coords in localStorage for easy access
          localStorage.setItem('userLocation', JSON.stringify(coords));
          // Dispatch custom event to notify components in same tab
          window.dispatchEvent(new CustomEvent('locationUpdated', { detail: coords }));
        });
        
        // Clean up function to stop tracking when component unmounts
        return () => {
          if (stopTracking) stopTracking();
        };
      } catch (error) {
        console.error('Error initializing location tracking:', error);
        toast.error('Error initializing location services');
      }
    };
    
    initializeLocation();
  }, [navigate]);

  // Function to fetch developers from Supabase and update state
  const fetchDevelopers = async () => {
    try {
      setLoading(true);
      console.log('Fetching developers...');
      
      // Get current location
      let userLat = 0;
      let userLng = 0;
      
      if (userLocation) {
        userLat = userLocation.lat;
        userLng = userLocation.lng;
      } else {
        const cachedLocation = localStorage.getItem('userLocation');
        if (cachedLocation) {
          try {
            const { lat, lng } = JSON.parse(cachedLocation);
            userLat = lat;
            userLng = lng;
          } catch (e) {
            console.error('Error parsing cached location:', e);
          }
        }
      }
      
      // Skip fetching if we don't have location data
      if (userLat === 0 && userLng === 0) {
        console.log('No location data available, skipping developer fetch');
        setLoading(false);
        return;
      }
      
      console.log('Fetching developers with location:', { userLat, userLng });
      
      // Use our utility function to get available developers from Supabase
      const availableDevelopers = await getAvailableDevelopers();
      
      console.log('Developers from Supabase:', availableDevelopers);
      
      // If no available developers found, create some fallback developers
      if (!availableDevelopers || availableDevelopers.length === 0) {
        console.log('No available developers found, using fallback developers');
        const fallbackDevs = createFallbackDevelopers(userLat, userLng);
        setDevelopers(fallbackDevs);
        console.log('Set fallback developers:', fallbackDevs.length);
      } else {
        // Calculate distance for each developer
        const developersWithDistance = availableDevelopers.map(dev => {
          let distance_km = 0;
          if (userLat && userLng) {
            // Calculate rough distance
            const latDiff = userLat - dev.lat;
            const lngDiff = userLng - dev.lng;
            distance_km = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough conversion to km
          }
          return { ...dev, distance_km };
        });
        
        console.log('Setting developers with distance:', developersWithDistance.length);
        setDevelopers(developersWithDistance);
      }
    } catch (error) {
      console.error('Error fetching developers:', error);
      toast.error('Error loading developers');
    } finally {
      setLoading(false);
    }
  };
  
  // Load user location from localStorage and set up event listeners
  useEffect(() => {
    // Initial load from localStorage
    const cachedLocation = localStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const location = JSON.parse(cachedLocation);
        setUserLocation(location);
      } catch (e) {
        console.error('Error parsing cached location:', e);
      }
    }

    // Set up event listener for location changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userLocation' && e.newValue) {
        try {
          const newLocation = JSON.parse(e.newValue);
          setUserLocation(newLocation);
        } catch (error) {
          console.error('Error parsing updated location:', error);
        }
      }
    };

    // Custom event listener for same-tab location updates
    const handleCustomLocationUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setUserLocation(e.detail);
      }
    };
    
    // Custom event listener for developer availability changes
    const handleAvailabilityChange = (e: CustomEvent) => {
      console.log('Developer availability changed event received:', e.detail);
      fetchDevelopers();
    };
    
    // Custom event listener for developer location changes
    const handleDeveloperLocationChange = (e: CustomEvent) => {
      console.log('Developer location changed event received:', e.detail);
      fetchDevelopers();
    };

    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('locationUpdated', handleCustomLocationUpdate as EventListener);
    window.addEventListener('developerAvailabilityChanged', handleAvailabilityChange as EventListener);
    window.addEventListener('developerLocationChanged', handleDeveloperLocationChange as EventListener);

    // Cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('locationUpdated', handleCustomLocationUpdate as EventListener);
      window.removeEventListener('developerAvailabilityChanged', handleAvailabilityChange as EventListener);
      window.removeEventListener('developerLocationChanged', handleDeveloperLocationChange as EventListener);
    };
  }, []);
  // Call fetchDevelopers when userLocation changes
  useEffect(() => {
    // Skip if no user location yet
    if (!userLocation) return;
    
    fetchDevelopers();
    
    // Set up real-time subscriptions using Supabase's built-in real-time capabilities
    console.log('Setting up Supabase real-time subscriptions');
    
    const developersSubscription = supabase
      .channel('developer_updates')
      // Listen for user location updates
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users', 
        filter: 'user_type=eq.developer' 
      }, (payload) => {
        console.log('Developer location updated via Supabase real-time:', payload);
        // Refresh developers on map when any developer location changes
        fetchDevelopers();
      })
      // Listen for availability status changes in developer_profiles table
      .on('postgres_changes', { 
        event: '*', // Listen for INSERT, UPDATE, DELETE
        schema: 'public', 
        table: 'developer_profiles'
      }, (payload) => {
        console.log('Developer profile updated via Supabase real-time:', payload);
        toast.info('Developer availability changed');
        // Refresh developers on map when any developer's availability changes
        fetchDevelopers();
      })
      .subscribe((status) => {
        console.log('Supabase channel status:', status);
      });
    
    return () => {
      console.log('Unsubscribing from Supabase channel');
      developersSubscription.unsubscribe();
    };
  }, [userLocation]); // Re-run when user location changes
  
  // Open the service selection modal
  const openServiceSelection = () => {
    setServiceSelectionOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFD700] relative overflow-hidden">
      <div className="h-screen w-full bg-white border-4 border-black relative">
        <ClientNavigation 
          userName={`${session?.user?.user_metadata?.first_name || ''} ${session?.user?.user_metadata?.last_name || ''}`} 
          userImage={session?.user?.user_metadata?.avatar_url || ''}
          unreadMessages={0} // Replace with actual count when implemented
          unreadNotifications={0} // Replace with actual count when implemented
        />
        {/* Burger menu is now in ClientNavigation component */}
        
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
            <div className="bg-black text-white px-4 py-2 rounded-lg border-3 border-black shadow-[5px_5px_0px_rgba(0,0,0,0.7)]">
              <p className="font-bold">Loading nearby developers...</p>
            </div>
          </div>
        ) : null}
        
        <div className="relative">
          {/* Notification for showing only available developers */}
          <div className="absolute top-4 right-16 z-10 bg-black text-white px-4 py-2 rounded-lg border-2 border-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.7)]">
            <p className="text-sm font-bold">Showing {developers.length} available developers</p>
          </div>
          
          <Map 
            developers={developers} 
            onDeveloperSelect={(developer) => {
              const fullName = `${developer.first_name} ${developer.last_name}`.trim();
              const distance = developer.distance_km ? 
                `${Math.round(developer.distance_km * 10) / 10}km away` : 'Distance unknown';
              
              toast(
                <div className="flex flex-col">
                  <span className="font-bold">{fullName}</span>
                  <span>Hourly Rate: ${developer.hourly_rate}/hr</span>
                  <span>Rating: {developer.average_rating}/5</span>
                  <span className="text-sm text-gray-500">{distance}</span>
                </div>
              );
            }}
          />
        </div>
      </div>

      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
        <Button 
          onClick={openServiceSelection}
          className="bg-black text-white hover:bg-gray-800 text-xl font-bold py-6 px-6 rounded-full border-4 border-black shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.6)] transition-all"
          size="lg"
        >
          <Plus size={24} />
          <span className="ml-2">Request Service</span>
        </Button>
      </div>

      <ServiceSelection 
        isOpen={serviceSelectionOpen} 
        onClose={() => setServiceSelectionOpen(false)} 
      />
    </div>
  );
};

export default Home;
