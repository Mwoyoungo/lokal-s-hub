import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MapPin, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Map from '@/components/Map';

interface LocationPickerProps {
  userId: string;
  onLocationSaved?: (location: { lat: number; lng: number }, address: string) => void;
  autoSave?: boolean;
  buttonText?: string;
  showHeader?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  userId,
  onLocationSaved,
  autoSave = true,
  buttonText = 'Save Location',
  showHeader = true,
}) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  // Handle location change from map component
  const handleLocationChange = (location: { lat: number; lng: number }, address: string) => {
    setCurrentLocation(location);
    setCurrentAddress(address);
    setSaved(false);
    
    // Auto-save if enabled
    if (autoSave) {
      saveLocationToDatabase(location, address);
    }
  };

  // Save location to Supabase
  const saveLocationToDatabase = async (
    location: { lat: number; lng: number },
    address: string
  ) => {
    if (!userId || !location) return;
    
    try {
      setSaving(true);
      
      // Create PostgreSQL geography point
      const point = `POINT(${location.lng} ${location.lat})`;
      
      // Update user's location in database
      const { error } = await supabase
        .from('users')
        .update({ 
          location: point,
          address: address, // Store the address for easier access
          last_active: new Date() 
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Show success toast
      toast.success('Location saved successfully', {
        description: address ? `Address: ${address}` : undefined,
        icon: <Check className="h-4 w-4 text-green-500" />,
      });
      
      setSaved(true);
      
      // Update localStorage with new location
      localStorage.setItem('userLocation', JSON.stringify(location));
      localStorage.setItem('userAddress', address);
      
      // Dispatch custom event for components in the same window
      window.dispatchEvent(
        new CustomEvent('locationUpdated', { detail: location })
      );
      
      // Call the callback if provided
      if (onLocationSaved) {
        onLocationSaved(location, address);
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location', {
        description: error.message,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle save button click
  const handleSaveClick = () => {
    if (currentLocation) {
      saveLocationToDatabase(currentLocation, currentAddress);
    } else {
      toast.error('No location selected', {
        description: 'Please select a location on the map first',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  };

  return (
    <div className="flex flex-col w-full h-[60vh] bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.7)] p-0 relative rounded-xl overflow-hidden">
      {showHeader && (
        <div className="bg-black text-white p-3 flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            <h3 className="font-bold text-lg">Select Your Location</h3>
          </div>
          <div className="text-sm">
            {saved ? (
              <span className="bg-green-500 text-white px-2 py-1 rounded-full flex items-center">
                <Check className="h-3 w-3 mr-1" /> Saved
              </span>
            ) : (
              <span className="text-yellow-400">Unsaved changes</span>
            )}
          </div>
        </div>
      )}
      
      <div className="relative flex-grow h-full min-h-[300px]">
        <Map 
          onLocationChange={handleLocationChange}
          saveLocation={true}
          allowManualLocation={true}
        />
      </div>
      
      {!autoSave && (
        <div className="p-3 bg-gray-50 border-t-2 border-black">
          <div className="flex justify-between items-center">
            <div className="max-w-[70%] overflow-hidden text-ellipsis">
              {currentAddress ? (
                <div className="text-sm">
                  <span className="font-bold">Selected Address:</span><br />
                  <span className="text-gray-600">{currentAddress}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Select a location on the map or search for an address
                </div>
              )}
            </div>
            <Button 
              onClick={handleSaveClick} 
              disabled={saving || !currentLocation}
              className="bg-black hover:bg-gray-800 text-white px-4 py-2"
            >
              {saving ? 'Saving...' : buttonText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
