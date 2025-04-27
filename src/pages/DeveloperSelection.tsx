import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin } from 'lucide-react';

interface DeveloperSelectionProps {
  requestId?: string;
}

interface Developer {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  address?: string;
  hourly_rate: number;
  average_rating: number;
  bio?: string;
  distance_km?: number;
}

const DeveloperSelection: React.FC<DeveloperSelectionProps> = ({ requestId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get request ID from props or from location state
  const serviceRequestId = requestId || location.state?.requestId;
  console.log('Developer Selection Page - Request ID:', serviceRequestId, 'Location State:', location.state);
  
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  
  useEffect(() => {
    // Log information about navigation and request ID
    console.log('DeveloperSelection mounted, serviceRequestId:', serviceRequestId);
    
    if (!serviceRequestId) {
      console.error('No service request ID found in props or location state');
      toast.error('No service request found');
      navigate('/home');
      return;
    }
    
    fetchServiceDetails();
    fetchAvailableDevelopers();
  }, [serviceRequestId, navigate]);
  
  // Fetch service request details
  const fetchServiceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', serviceRequestId)
        .single();
        
      if (error) throw error;
      if (data) setServiceDetails(data);
    } catch (error) {
      console.error('Error fetching service details:', error);
      toast.error('Failed to load service details');
    }
  };
  
  // Fetch available developers
  const fetchAvailableDevelopers = async () => {
    try {
      setLoading(true);
      console.log('Fetching available developers...');
      
      // Get developers from users table with availability status from developer_profiles
      // Simplified query to only filter by availability status - removed skills relationship
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          profile_image_url,
          location,
          developer_profiles(hourly_rate, average_rating, availability_status, bio)
        `)
        .eq('user_type', 'developer')
        .eq('developer_profiles.availability_status', true);
      
      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.log('No available developers found');
        setDevelopers([]);
        setLoading(false);
        return;
      }
      
      console.log('Found developers:', data.length);
      
      // Process developer data with careful validation
      const processedDevelopers = data.map(dev => {
        // Validate developer profile data exists and use proper type assertion
        const profiles = Array.isArray(dev.developer_profiles) ? dev.developer_profiles : [];
        // Explicitly type the profile to avoid TypeScript errors
        const profile: { bio?: string; average_rating?: number; hourly_rate?: number } = 
          profiles.length > 0 ? (profiles[0] || {}) : {};
        
        // Extract coordinates from PostGIS point format with validation
        let lat = 0;
        let lng = 0;
        
        if (typeof dev.location === 'string') {
          try {
            // Try to parse the PostGIS point format (POINT(lng lat))
            const pointMatch = dev.location.match(/POINT\(([\d.-]+) ([\d.-]+)\)/);
            if (pointMatch && pointMatch.length === 3) {
              lng = parseFloat(pointMatch[1]);
              lat = parseFloat(pointMatch[2]);
            }
          } catch (err) {
            console.error('Error parsing location coordinates:', err);
            // Continue with default coordinates (0,0)
          }
        }
        
        // No skills processing needed - focusing only on availability status
        
        // Create developer object with safe defaults - removed skills
        return {
          id: dev.id || '',
          first_name: dev.first_name || '',
          last_name: dev.last_name || '',
          profile_image_url: dev.profile_image_url || '',
          address: 'Location not available', // Address removed from query since it doesn't exist in users table
          hourly_rate: profile.hourly_rate || 0,
          average_rating: profile.average_rating || 0,
          bio: profile.bio || 'No bio available',
          distance_km: null
        };
      });
      
      setDevelopers(processedDevelopers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching developers:', error);
      toast.error(`Error fetching developers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };
  
  // Assign a developer to the service request
  const assignDeveloper = async (developerId: string) => {
    try {
      console.log('Assigning developer', developerId, 'to service request', serviceRequestId);
      
      // First verify the service request exists
      const { data: checkRequest, error: checkError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', serviceRequestId)
        .single();
        
      if (checkError) {
        console.error('Error checking service request:', checkError);
        throw new Error(`Service request ${serviceRequestId} not found`);
      }
      
      console.log('Found service request to update:', checkRequest);
      
      // Update the service request with the matched developer - use upsert to ensure it works
      const updateData = {
        id: serviceRequestId,
        matched_developer_id: developerId,
        status: 'assigned'
      };
      
      const { data: updatedData, error: updateError } = await supabase
        .from('service_requests')
        .upsert(updateData)
        .select();
        
      if (updateError) {
        console.error('Error updating service request:', updateError);
        throw updateError;
      }
      
      // As a backup, do a direct update as well
      const { data: directUpdate, error: directError } = await supabase
        .from('service_requests')
        .update({ matched_developer_id: developerId, status: 'assigned' })
        .eq('id', serviceRequestId);
      
      // Verify the update worked correctly
      const { data: verifyData } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', serviceRequestId)
        .single();
      
      console.log('Final service request state:', verifyData);
      console.log('New status:', verifyData?.status);
      console.log('Assigned developer ID:', verifyData?.matched_developer_id);
      
      toast.success('Developer assigned successfully!');
      
      // Navigate to success page
      navigate(`/request-success/${serviceRequestId}`);
    } catch (error) {
      console.error('Error assigning developer:', error);
      toast.error('Failed to assign developer');
    }
  };
  
  // Render a developer card
  const renderDeveloperCard = (developer: Developer) => {
    return (
      <Card key={developer.id} className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Developer image */}
          <div className="w-full md:w-1/4 bg-gray-100 border-r-4 border-black">
            <div className="aspect-square relative">
              {developer.profile_image_url ? (
                <img 
                  src={developer.profile_image_url} 
                  alt={`${developer.first_name} ${developer.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-yellow-400 text-black font-bold text-4xl">
                  {developer.first_name.charAt(0)}{developer.last_name.charAt(0)}
                </div>
              )}
            </div>
          </div>
          
          {/* Developer info */}
          <div className="p-4 w-full md:w-3/4">
            <h3 className="text-xl font-bold mb-1">{developer.first_name} {developer.last_name}</h3>
            
            {/* Rating and price */}
            <div className="flex items-center mb-3">
              <div className="flex items-center">
                <span className="font-bold mr-1">${developer.hourly_rate}/hr</span>
              </div>
              
              <div className="mx-2">•</div>
              
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={16} 
                    className={star <= Math.round(developer.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} 
                  />
                ))}
                <span className="ml-1 text-sm font-bold">{developer.average_rating.toFixed(1)}</span>
              </div>
              
              {developer.distance_km && (
                <div className="ml-4 flex items-center text-sm">
                  <MapPin size={14} className="mr-1" />
                  <span>{developer.distance_km.toFixed(1)} km away</span>
                </div>
              )}
            </div>
            
            {/* No skills shown - simplified matching */}
            
            {/* Bio (truncated) */}
            <p className="text-sm text-gray-700 line-clamp-2 mb-3">
              {developer.bio}
            </p>
            
            {/* Assign button */}
            <Button 
              onClick={() => assignDeveloper(developer.id)}
              className="bg-black hover:bg-gray-800 text-white border-3 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
            >
              Choose this Developer
            </Button>
          </div>
        </div>
      </Card>
    );
  };
  
  // No filtering or sorting needed - only showing available developers
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFD700] p-6 flex items-center justify-center">
        <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-pulse">
          <h2 className="font-black text-2xl">Loading available developers...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      {/* Header with service details */}
      <div className="flex flex-col mb-6">
        <h1 className="text-3xl font-black tracking-tight mb-1">Choose a Developer</h1>
        {serviceDetails && (
          <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-bold text-xl mb-2">{serviceDetails.service_type}</h2>
            <p className="mb-2">{serviceDetails.description}</p>
            <div className="font-bold">Budget: ${serviceDetails.budget}</div>
          </div>
        )}
      </div>
      
      {/* Developer list */}
      <div className="mb-4 text-lg font-bold">
        Showing {developers.length} available developers
      </div>
      
      <div className="grid gap-6">
        {developers.length === 0 ? (
          <Card className="bg-white border-4 border-dashed border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
            <p className="font-bold text-xl">No developers available</p>
            <p className="font-medium mt-2">Please check back later when developers become available</p>
          </Card>
        ) : (
          developers.map(developer => renderDeveloperCard(developer))
        )}
      </div>
    </div>
  );
};

export default DeveloperSelection;
