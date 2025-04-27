import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Info, MapIcon } from 'lucide-react';
import { setupLocationTracking, getCurrentPosition } from '@/lib/geolocation';
import LocationPicker from '@/components/LocationPicker';

const Request: React.FC = () => {
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initLocation = async () => {
      setIsGettingLocation(true);
      try {
        // First check if we have cached location in localStorage
        const cachedLocation = localStorage.getItem('userLocation');
        const cachedAddress = localStorage.getItem('userAddress');
        
        if (cachedLocation) {
          setCoords(JSON.parse(cachedLocation));
        }
        
        if (cachedAddress) {
          setAddress(cachedAddress);
        }
        
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast.error('Authentication required');
          navigate('/login');
          return;
        }
        
        // Save user ID for later use
        setUserId(session.user.id);
        
        // Only attempt automatic location if manual mode is not selected
        if (!useManualLocation) {
          try {
            // Get fresh position
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            const freshCoords = { lat: latitude, lng: longitude };
            setCoords(freshCoords);
            localStorage.setItem('userLocation', JSON.stringify(freshCoords));
            
            // Get address for the location using Geocoding API
            try {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: freshCoords }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  const newAddress = results[0].formatted_address;
                  setAddress(newAddress);
                  localStorage.setItem('userAddress', newAddress);
                }
              });
            } catch (geoError) {
              console.error('Error geocoding location:', geoError);
            }
            
            // Update in database
            await supabase
              .from('users')
              .update({ 
                location: `POINT(${longitude} ${latitude})`,
                address: address
              })
              .eq('id', session.user.id);
              
            console.log('Location updated successfully:', freshCoords);
            toast.success('Location updated successfully');
          } catch (locError: any) {
            console.error('Error getting current position:', locError);
            toast.error('Could not get your current location.', {
              description: 'You can manually select your location on the map instead.',
              duration: 5000
            });
            
            if (!cachedLocation) {
              // If we don't even have cached location, suggest manual entry
              setCoords(null);
              setUseManualLocation(true);
            }
          }
        }
        
        // Set up continuous location tracking only if not in manual mode
        if (!useManualLocation) {
          const stopTracking = setupLocationTracking(session.user.id, (pos) => {
            setCoords(pos);
            localStorage.setItem('userLocation', JSON.stringify(pos));
          });
          
          return () => {
            if (stopTracking) stopTracking();
          };
        }
      } catch (error) {
        console.error('Error initializing location:', error);
      } finally {
        setIsGettingLocation(false);
      }
    };
    
    initLocation();
  }, [navigate, useManualLocation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (submitting) return;
    setSubmitting(true);
    
    try {
      // Get current user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }
      
      // Validate form data
      if (!serviceType) {
        toast.error('Please select a service type');
        setSubmitting(false);
        return;
      }
      
      if (!description) {
        toast.error('Please provide a description');
        setSubmitting(false);
        return;
      }
      
      if (!budget || isNaN(parseFloat(budget)) || parseFloat(budget) <= 0) {
        toast.error('Please enter a valid budget');
        setSubmitting(false);
        return;
      }
      
      // Ensure we have location data
      if (!coords) {
        toast.error('Location is required for service matching', {
          description: 'Please set your location on the map',
          duration: 5000
        });
        setSubmitting(false);
        // Enable manual location selection mode if not already enabled
        setUseManualLocation(true);
        return;
      }
      
      // Show creating toast
      toast('Creating service request...', {
        duration: 3000,
        icon: <Loader2 className="animate-spin" />
      });
      
      // Create the service request
      const { data, error } = await supabase
        .from('service_requests')
        .insert([{ 
          client_id: userId, 
          service_type: serviceType, 
          description, 
          budget: parseFloat(budget), 
          location: `POINT(${coords.lng} ${coords.lat})`, 
          address: address, // Include the address in the request
          status: 'pending' 
        }])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Check if there are any nearby developers (within 50km)
      const { data: nearbyDevs, error: proximityError } = await supabase
        .rpc('developers_within_distance', {
          request_id: data.id,
          max_distance_km: 50
        });
        
      if (proximityError) {
        console.error('Error checking for nearby developers:', proximityError);
      }
      
      const devCount = nearbyDevs?.length || 0;
      
      // Success message with nearby developers count
      if (devCount > 0) {
        toast.success(`Request created!`, {
          description: `Found ${devCount} developer${devCount > 1 ? 's' : ''} within 50km of your location.`,
          duration: 5000,
          icon: <MapPin className="text-green-500" />
        });
      } else {
        toast.success('Request created!', {
          description: 'No developers found within 50km of your location yet. Your request is still active.',
          duration: 6000,
          icon: <MapPin className="text-yellow-500" />
        });
      }
      
      // Navigate to request details page
      navigate(`/request/${data.id}`);
    } catch (error: any) {
      console.error('Error creating service request:', error);
      toast.error(`Error creating request: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD700] flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black p-8 rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.7)] w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">New Service Request</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceType" className="font-bold text-lg">Service Type</Label>
              <Input
                id="serviceType"
                placeholder="What service do you need?"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="mt-1 border-2 border-black"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="font-bold text-lg">Description</Label>
              <textarea
                id="description"
                placeholder="Describe what you need in detail"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-24 mt-1 border-2 border-black p-2 resize-none"
              />
            </div>
            
            <div>
              <Label htmlFor="budget" className="font-bold text-lg">Budget ($)</Label>
              <Input
                id="budget"
                placeholder="Your budget for this service"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1 border-2 border-black"
              />
            </div>
          </div>
          
          {/* Location Selection Section */}
          <div className="pt-4 border-t-2 border-gray-300">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 mr-2 text-black" />
              <Label className="font-bold text-lg">Your Location</Label>
              
              <div className="ml-auto flex items-center">
                <button
                  type="button"
                  onClick={() => setUseManualLocation(!useManualLocation)}
                  className={`px-3 py-1 text-sm font-bold rounded-full flex items-center ${
                    useManualLocation 
                      ? 'bg-yellow-400 text-black' 
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {useManualLocation ? (
                    <>
                      <MapIcon className="h-3 w-3 mr-1" />
                      Manual Selection
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3 mr-1" />
                      Automatic Location
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <p className="mb-4 text-sm text-gray-700">
              {useManualLocation 
                ? 'Select your location on the map by clicking or searching for an address.' 
                : 'Your location will be automatically detected. Click the toggle to manually select a location.'}
            </p>
            
            {/* Show location picker if in manual mode or loading state */}
            {(useManualLocation || isGettingLocation) && userId && (
              <LocationPicker
                userId={userId}
                autoSave={false}
                buttonText="Set Request Location"
                onLocationSaved={(location, newAddress) => {
                  setCoords(location);
                  setAddress(newAddress);
                  // Briefly show success notification
                  toast.success('Location set successfully', {
                    description: newAddress,
                    duration: 3000,
                  });
                }}
              />
            )}
            
            {/* Show current location if we have coordinates and not in manual mode */}
            {coords && !useManualLocation && !isGettingLocation && (
              <div className="bg-gray-100 border-2 border-black rounded-md p-3 mb-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                  <div>
                    <p className="font-bold">Your Current Location</p>
                    {address ? (
                      <p className="text-sm text-gray-700">{address}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={submitting || !coords} 
              className="w-full bg-black text-white py-6 font-bold text-lg hover:bg-gray-800 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Request...
                </>
              ) : (
                'Create Service Request'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Request;
