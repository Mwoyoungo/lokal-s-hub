import React, { useState, useEffect } from 'react';
import { MapPin, Plus, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import ServiceSelection from '@/components/ServiceSelection';
import Map from '@/components/Map';
import { supabase } from '@/lib/supabase';
import { setupLocationTracking } from '@/lib/geolocation';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    localStorage.removeItem('userProfile');
    toast.success('Logged out');
    navigate('/login');
  };

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

  const [serviceSelectionOpen, setServiceSelectionOpen] = useState(false);
  const [userProfile] = useState(() => {
    const profile = localStorage.getItem('userProfile');
    return profile ? JSON.parse(profile) : null;
  });

  // Define the developer profile type
  interface DeveloperProfile {
    hourly_rate?: number;
    average_rating?: number;
    availability_status?: boolean;
  }
  
  // Define the developer type
  interface Developer {
    id: string;
    first_name: string;
    last_name: string;
    lat: number;
    lng: number;
    average_rating: number;
    hourly_rate: number;
    profile_image_url?: string;
    distance_km?: number;
    available: boolean;
  }
  
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track user location in state so we can react to changes
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Load user location from localStorage and set up a listener for changes
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

    // Listen for localStorage changes (from other components)
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for same-tab updates
    const handleCustomLocationUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setUserLocation(e.detail);
      }
    };

    window.addEventListener('locationUpdated', handleCustomLocationUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('locationUpdated', handleCustomLocationUpdate as EventListener);
    };
  }, []);

  // Fetch all developers with their locations
  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        setLoading(true);
        
        // Get current location
        let userLat = 0;
        let userLng = 0;
        
        if (userLocation) {
          userLat = userLocation.lat;
          userLng = userLocation.lng;
        } else {
          const cachedLocation = localStorage.getItem('userLocation');
          if (cachedLocation) {
            const { lat, lng } = JSON.parse(cachedLocation);
            userLat = lat;
            userLng = lng;
          }
        }
        
        // Skip fetching if we don't have location data
        if (userLat === 0 && userLng === 0) {
          console.log('No location data available, skipping developer fetch');
          setLoading(false);
          return;
        }
        
        console.log('Fetching developers with user location:', { userLat, userLng });
        
        // Get all developers from database with locations
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            profile_image_url,
            location,
            developer_profiles(hourly_rate, average_rating, availability_status)
          `)
          .eq('user_type', 'developer')
          .not('location', 'is', null);
          
        if (error) {
          throw error;
        }
        
        // Parse developer data and their locations
        const parsedDevelopers = data
          .filter(dev => dev.location) // Filter out any without location
          .map(dev => {
            // Extract coordinates from PostGIS point
            const pointMatch = dev.location.match(/POINT\(([^\)]+)\)/);
            let lat = 0;
            let lng = 0;
            
            if (pointMatch && pointMatch[1]) {
              const coords = pointMatch[1].split(' ');
              // PostGIS format is POINT(lng lat)
              lng = parseFloat(coords[0]);
              lat = parseFloat(coords[1]);
            }
            
            // Calculate distance if user location is available
            let distance_km = null;
            if (userLat && userLng) {
              const R = 6371; // Earth radius in km
              const dLat = (lat - userLat) * Math.PI / 180;
              const dLon = (lng - userLng) * Math.PI / 180;
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distance_km = R * c;
            }
            
            // Safely access profile data with explicit typing
            const profile = dev.developer_profiles?.[0] as { 
              average_rating?: number; 
              hourly_rate?: number; 
              availability_status?: boolean 
            } || { average_rating: 0, hourly_rate: 0, availability_status: false };
            
            return {
              id: dev.id,
              first_name: dev.first_name || 'Developer',
              last_name: dev.last_name || '',
              lat,
              lng,
              average_rating: profile.average_rating || 0,
              hourly_rate: profile.hourly_rate || 0,
              profile_image_url: dev.profile_image_url,
              distance_km,
              available: Boolean(profile.availability_status)
            };
          });
        
        console.log('Parsed developers data:', parsedDevelopers);
        setDevelopers(parsedDevelopers);
      } catch (error) {
        console.error('Error fetching developers:', error);
        toast.error('Error loading developers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDevelopers();
    
    // Set up real-time subscription for developer location updates
    const developersSubscription = supabase
      .channel('public:users:user_type=eq.developer')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        console.log('Developer location updated:', payload);
        // Re-fetch all developers when any developer updates their location
        fetchDevelopers();
      })
      .subscribe();
      
    return () => {
      developersSubscription.unsubscribe();
    };
  }, [userLocation]); // Re-fetch when user location changes

  const openServiceSelection = () => {
    setServiceSelectionOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFD700] relative overflow-hidden">
      <div className="h-screen w-full bg-white border-4 border-black relative">
        <div className="absolute top-4 left-4 z-10 bg-white border-4 border-black p-3 rounded-lg shadow-[5px_5px_0px_rgba(0,0,0,0.7)]">
          <User size={24} />
        </div>
        <div className="absolute top-4 right-4 z-10 bg-white border-4 border-black p-3 rounded-lg shadow-[5px_5px_0px_rgba(0,0,0,0.7)]">
          <LogOut size={24} className="cursor-pointer" onClick={handleLogout} />
        </div>
        
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
            <div className="bg-black text-white px-4 py-2 rounded-lg border-3 border-black shadow-[5px_5px_0px_rgba(0,0,0,0.7)]">
              <p className="font-bold">Loading nearby developers...</p>
            </div>
          </div>
        ) : null}
        
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
