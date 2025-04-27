import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, MapPin, Filter, X, ArrowUpDown, Check } from 'lucide-react';
import { Developer } from '@/utils/developerUtils';

interface DeveloperSelectionProps {
  requestId?: string;
}

const DeveloperSelection: React.FC<DeveloperSelectionProps> = ({ requestId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get request ID from props or from location state
  const serviceRequestId = requestId || location.state?.requestId;
  console.log('Developer Selection Page - Request ID:', serviceRequestId, 'Location State:', location.state);
  
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [filteredDevelopers, setFilteredDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'price'>('distance');
  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterMaxDistance, setFilterMaxDistance] = useState(50);
  const [filterMaxPrice, setFilterMaxPrice] = useState(200);
  
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
      
      // Get developers from users table with availability status from developer_profiles
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          profile_image_url,
          location,
          address,
          developer_profiles(hourly_rate, average_rating, availability_status, bio),
          developer_skills(skills(name, category))
        `)
        .eq('user_type', 'developer')
        .eq('developer_profiles.availability_status', true);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setDevelopers([]);
        setFilteredDevelopers([]);
        setLoading(false);
        return;
      }
      
      // Process developer data
      const processedDevelopers = data.map(dev => {
        const profile = dev.developer_profiles[0] || {};
        
        // Extract coordinates from PostGIS point format
        let lat = 0;
        let lng = 0;
        
        if (dev.location) {
          const pointMatch = dev.location.match(/POINT\(([^\)]+)\)/);
          if (pointMatch && pointMatch[1]) {
            const coords = pointMatch[1].split(' ');
            lng = parseFloat(coords[0]);
            lat = parseFloat(coords[1]);
          }
        }
        
        // Extract skills
        const skills = dev.developer_skills?.map(skill => skill.skills?.name || '') || [];
        
        return {
          id: dev.id,
          first_name: dev.first_name || 'Developer',
          last_name: dev.last_name || '',
          lat,
          lng,
          address: dev.address || '',
          profile_image_url: dev.profile_image_url,
          bio: profile?.bio || '',
          average_rating: profile?.average_rating || 0,
          hourly_rate: profile?.hourly_rate || 0,
          available: true,
          skills: skills as string[]
        };
      });
      
      setDevelopers(processedDevelopers);
      applyFilters(processedDevelopers);
    } catch (error) {
      console.error('Error fetching developers:', error);
      toast.error('Failed to load available developers');
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters and sorting to developers
  const applyFilters = (devs = developers) => {
    let filtered = [...devs];
    
    // Apply rating filter
    filtered = filtered.filter(dev => dev.average_rating >= filterMinRating);
    
    // Apply distance filter if we have location data
    if (filterMaxDistance < 50) {
      filtered = filtered.filter(dev => {
        return dev.distance_km ? dev.distance_km <= filterMaxDistance : true;
      });
    }
    
    // Apply price filter
    filtered = filtered.filter(dev => dev.hourly_rate <= filterMaxPrice);
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'rating') return b.average_rating - a.average_rating;
      if (sortBy === 'price') return a.hourly_rate - b.hourly_rate;
      // Default is distance
      return (a.distance_km || 999) - (b.distance_km || 999);
    });
    
    setFilteredDevelopers(filtered);
  };
  
  // Reset filters to default
  const resetFilters = () => {
    setFilterMinRating(0);
    setFilterMaxDistance(50);
    setFilterMaxPrice(200);
    setSortBy('distance');
    applyFilters();
  };
  
  // Assign a developer to the service request
  const assignDeveloper = async (developerId: string) => {
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to assign a developer');
        navigate('/login');
        return;
      }
      
      // Update the service request with the selected developer
      const { error } = await supabase
        .from('service_requests')
        .update({
          matched_developer_id: developerId,
          status: 'assigned'
        })
        .eq('id', serviceRequestId);
      
      if (error) throw error;
      
      // Show success message
      toast.success('Developer assigned successfully! Waiting for developer to accept.');
      
      // Navigate to service details page (this will need to be created)
      navigate(`/service/${serviceRequestId}`);
    } catch (error) {
      console.error('Error assigning developer:', error);
      toast.error('Failed to assign developer');
    }
  };
  
  // Render a developer card
  const renderDeveloperCard = (developer: Developer) => {
    return (
      <Card key={developer.id} className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Developer profile picture */}
          <div className="w-20 h-20 overflow-hidden border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] bg-yellow-300">
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
          
          {/* Developer info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between">
              <h3 className="text-xl font-black mb-1">{`${developer.first_name} ${developer.last_name}`}</h3>
              <div className="flex items-center mb-2 md:mb-0">
                <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-sm">
                  ${developer.hourly_rate}/hr
                </div>
              </div>
            </div>
            
            <div className="flex items-center mb-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
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
            
            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-2">
              {developer.skills?.slice(0, 3).map((skill, index) => (
                <Badge key={index} className="bg-yellow-400 text-black border-2 border-black hover:bg-yellow-500">
                  {skill}
                </Badge>
              ))}
              {developer.skills?.length > 3 && (
                <Badge className="bg-gray-200 text-black border-2 border-black">
                  +{developer.skills.length - 3} more
                </Badge>
              )}
            </div>
            
            {/* Bio (truncated) */}
            <p className="text-sm text-gray-700 line-clamp-2 mb-3">
              {developer.bio || 'No bio available'}
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
  
  // Filter section component
  const FiltersSection = () => (
    <div className="bg-white border-4 border-black p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Filters & Sorting</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetFilters}
          className="text-sm hover:bg-yellow-100"
        >
          Reset
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating filter */}
        <div>
          <label className="font-bold text-sm mb-1 block">Minimum Rating</label>
          <div className="flex items-center">
            <input 
              type="range" 
              min="0" 
              max="5" 
              step="0.5"
              value={filterMinRating}
              onChange={(e) => setFilterMinRating(parseFloat(e.target.value))}
              className="w-full accent-black"
            />
            <span className="ml-2 font-bold">{filterMinRating}</span>
          </div>
        </div>
        
        {/* Distance filter */}
        <div>
          <label className="font-bold text-sm mb-1 block">Max Distance (km)</label>
          <div className="flex items-center">
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={filterMaxDistance}
              onChange={(e) => setFilterMaxDistance(parseInt(e.target.value))}
              className="w-full accent-black"
            />
            <span className="ml-2 font-bold">{filterMaxDistance} km</span>
          </div>
        </div>
        
        {/* Price filter */}
        <div>
          <label className="font-bold text-sm mb-1 block">Max Hourly Rate ($)</label>
          <div className="flex items-center">
            <input 
              type="range" 
              min="10" 
              max="200" 
              step="5"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(parseInt(e.target.value))}
              className="w-full accent-black"
            />
            <span className="ml-2 font-bold">${filterMaxPrice}</span>
          </div>
        </div>
      </div>
      
      {/* Sorting options */}
      <div className="mt-4">
        <label className="font-bold text-sm mb-1 block">Sort By</label>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setSortBy('distance')} 
            className={`px-3 py-1 text-sm ${sortBy === 'distance' ? 'bg-black text-white' : 'bg-gray-200 text-black'} border-2 border-black`}
          >
            Closest First
          </Button>
          <Button 
            onClick={() => setSortBy('rating')} 
            className={`px-3 py-1 text-sm ${sortBy === 'rating' ? 'bg-black text-white' : 'bg-gray-200 text-black'} border-2 border-black`}
          >
            Highest Rated
          </Button>
          <Button 
            onClick={() => setSortBy('price')} 
            className={`px-3 py-1 text-sm ${sortBy === 'price' ? 'bg-black text-white' : 'bg-gray-200 text-black'} border-2 border-black`}
          >
            Lowest Price
          </Button>
        </div>
      </div>
    </div>
  );
  
  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [filterMinRating, filterMaxDistance, filterMaxPrice, sortBy]);
  
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
      
      {/* Filter toggle */}
      <div className="mb-4">
        <Button 
          onClick={() => setShowFilters(!showFilters)}
          className="bg-black text-white font-bold border-3 border-black flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
        >
          {showFilters ? <X size={18} /> : <Filter size={18} />}
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>
      
      {/* Filters section */}
      {showFilters && <FiltersSection />}
      
      {/* Developer list */}
      <div className="mb-4 text-lg font-bold">
        Showing {filteredDevelopers.length} available developers
      </div>
      
      <div className="grid gap-6">
        {filteredDevelopers.length === 0 ? (
          <Card className="bg-white border-4 border-dashed border-black p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
            <p className="font-bold text-xl">No developers available</p>
            <p className="font-medium mt-2">Try adjusting your filters or check back later</p>
          </Card>
        ) : (
          filteredDevelopers.map(developer => renderDeveloperCard(developer))
        )}
      </div>
    </div>
  );
};

export default DeveloperSelection;
