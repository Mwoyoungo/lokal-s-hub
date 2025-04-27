import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Interface for developer data
export interface Developer {
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
  bio?: string;
  skills?: string[];
  address?: string;
}

// Get developers from Supabase with proper filtering for availability
export async function getAvailableDevelopers() {
  try {
    console.log('Fetching developers from Supabase');
    
    // First check if any developers exist
    const { data: devCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('user_type', 'developer');
      
    if (countError) {
      console.error('Error checking developer count:', countError);
      return [];
    }
    
    console.log(`Found ${devCount?.length || 0} developers in database`);
    
    // Fetch developers with their profiles and locations
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
      .eq('user_type', 'developer');
      
    if (error) {
      console.error('Error fetching developers:', error);
      toast.error('Failed to load developers');
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No developers found in database');
      return [];
    }
    
    console.log('Raw developer data from Supabase:', data);
    
    // Parse developer data with locations and availability
    const parsedDevelopers = data
      .filter(dev => dev.location) // Filter out developers without location
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
        
        // Get profile data for the developer
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
          available: Boolean(profile.availability_status)
        };
      });
      
    // Filter only available developers with valid coordinates
    const availableDevelopers = parsedDevelopers.filter(dev => 
      dev.available === true && dev.lat !== 0 && dev.lng !== 0
    );
    
    console.log('Available developers from database:', availableDevelopers);
    return availableDevelopers;
  } catch (error) {
    console.error('Error in getAvailableDevelopers:', error);
    return [];
  }
}

// Fallback function to create sample developers near a given location
export function createFallbackDevelopers(userLat: number, userLng: number): Developer[] {
  console.log('Creating fallback developers near:', {userLat, userLng});
  
  // Create sample developers matching the screenshot exactly
  return [
    {
      id: 'demo-1',
      first_name: 'Alice',
      last_name: 'M.',
      lat: userLat - 0.005,
      lng: userLng - 0.008,
      average_rating: 4.8,
      hourly_rate: 45,
      available: true,
      distance_km: 0.5
    },
    {
      id: 'demo-2',
      first_name: 'Bob',
      last_name: 'K.',
      lat: userLat - 0.002,
      lng: userLng + 0.005,
      average_rating: 4.5,
      hourly_rate: 50,
      available: true,
      distance_km: 0.3
    },
    {
      id: 'demo-3',
      first_name: 'John',
      last_name: 'D.',
      lat: userLat + 0.001,
      lng: userLng + 0.007,
      average_rating: 4.9,
      hourly_rate: 55,
      available: true,
      distance_km: 0.4
    }
  ];
}
