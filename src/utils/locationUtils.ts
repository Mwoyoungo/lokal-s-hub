import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Get user's current location using browser geolocation API
 */
export const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
};

/**
 * Update user's location in Supabase database
 */
export const updateUserLocation = async (userId: string): Promise<boolean> => {
  try {
    // Get current position from browser
    const position = await getCurrentLocation();
    const { latitude, longitude } = position.coords;
    
    // Create PostgreSQL geography point
    const point = `POINT(${longitude} ${latitude})`;
    
    // Update user's location in database
    const { error } = await supabase
      .from('users')
      .update({ location: point })
      .eq('id', userId);
      
    if (error) throw error;
    
    console.log(`Location updated successfully: ${latitude}, ${longitude}`);
    return true;
  } catch (error: any) {
    console.error('Error updating location:', error);
    toast.error(`Could not update location: ${error.message}`);
    return false;
  }
};

/**
 * Calculate distance between two points in kilometers
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};
