import { supabase } from './supabase';
import { toast } from 'sonner';

/**
 * Function to handle capturing user's location and updating it in the database
 * This is a critical component for the location-based service matching system
 */
export const setupLocationTracking = (userId: string, onPosition?: (coords: { lat: number; lng: number }) => void) => {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    toast.error('Geolocation is not supported by your browser');
    return () => {};
  }
  
  // First, immediately get the current position to update the database right away
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const coords = { lat: latitude, lng: longitude };
      
      // Debug log
      console.log(`Initial location captured: ${latitude}, ${longitude}`);
      
      // Call callback if provided
      if (onPosition) onPosition(coords);
      
      // Update user location in database
      try {
        const { error } = await supabase
          .from('users')
          .update({ 
            location: `POINT(${longitude} ${latitude})`, 
            last_active: new Date() 
          })
          .eq('id', userId);
        
        if (error) throw error;
        console.log('Location updated in database successfully');
      } catch (error: any) {
        console.error('Error updating location in database:', error);
      }
    },
    (error) => {
      console.error('Geolocation error:', error);
      toast.error('Please enable location services to receive nearby service requests', {
        description: 'Location is required for service matching',
        duration: 5000
      });
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );

  // Then setup continuous watching
  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const coords = { lat: latitude, lng: longitude };
      
      // Debug log
      console.log(`Location updated: ${latitude}, ${longitude}`);
      
      // Call callback if provided
      if (onPosition) onPosition(coords);
      
      // Update user location in database
      try {
        const { error } = await supabase
          .from('users')
          .update({ 
            location: `POINT(${longitude} ${latitude})`, 
            last_active: new Date() 
          })
          .eq('id', userId);
        
        if (error) throw error;
      } catch (error: any) {
        console.error('Error updating location in database:', error);
      }
    },
    (error) => console.error('Geolocation watch error:', error),
    { enableHighAccuracy: true, maximumAge: 15000 }
  );

  return () => navigator.geolocation.clearWatch(watchId);
};

/**
 * Function to get current position as a Promise
 */
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
};
