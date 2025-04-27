import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF, OverlayView, Autocomplete } from '@react-google-maps/api';
import { MapPin, Star } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
};

// default fallback center
const defaultCenter = {
  lat: 40.712,
  lng: -74.006
};

interface Developer {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  lat: number;
  lng: number;
  rating?: number;
  average_rating?: number;
  service?: string;
  hourly_rate?: number;
  profile_image_url?: string;
  distance_km?: number;
  available?: boolean;
}

interface MapProps {
  developers?: Developer[];
  onDeveloperSelect?: (developer: Developer) => void;
}

interface MapProps {
  developers?: Developer[];
  onDeveloperSelect?: (developer: Developer) => void;
  onLocationChange?: (location: { lat: number; lng: number }, address: string) => void;
  saveLocation?: boolean;
  allowManualLocation?: boolean;
}

const Map: React.FC<MapProps> = ({ 
  developers = [], 
  onDeveloperSelect, 
  onLocationChange, 
  saveLocation = false,
  allowManualLocation = true
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [address, setAddress] = useState('');
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null);
  const [manualMarker, setManualMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<'auto' | 'manual'>('auto');

  // Watch position with high accuracy
  // Effect to watch user location (only if locationSource is 'auto')
  useEffect(() => {
    if (!navigator.geolocation || locationSource === 'manual') return;
    
    // Try to load saved location from localStorage first
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        setUserLocation(parsedLocation);
        if (mapRef.current) {
          mapRef.current.panTo(parsedLocation);
          mapRef.current.setZoom(15);
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
      }
    }
    
    // Set up geolocation watcher
    const watcher = navigator.geolocation.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (onLocationChange && locationSource === 'auto') {
          onLocationChange(loc, address);
        }
        if (mapRef.current && !manualMarker) {
          mapRef.current.panTo(loc);
          mapRef.current.setZoom(15);
        }
      },
      err => console.error('Geolocation watch error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    
    return () => navigator.geolocation.clearWatch(watcher);
  }, [locationSource, address, onLocationChange, manualMarker]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
    libraries: ['places']
  });

  // Handle when a place is selected from the autocomplete dropdown
  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.geometry?.location) {
      const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      
      // Set the location as manual since user selected it
      setLocationSource('manual');
      setManualMarker(loc);
      setUserLocation(loc);
      
      // Update map view
      mapRef.current?.panTo(loc);
      mapRef.current?.setZoom(15);
      
      // Update address and notify parent if callback provided
      const formattedAddress = place.formatted_address || '';
      setAddress(formattedAddress);
      
      if (onLocationChange) {
        onLocationChange(loc, formattedAddress);
      }
      
      // Save to localStorage if option enabled
      if (saveLocation) {
        localStorage.setItem('userLocation', JSON.stringify(loc));
        localStorage.setItem('userAddress', formattedAddress);
        
        // Dispatch event for other components to react
        window.dispatchEvent(
          new CustomEvent('locationUpdated', { detail: loc })
        );
      }
    }
  };
  
  // Handle map click for manual location setting
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!allowManualLocation) return;
    
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    
    if (lat !== undefined && lng !== undefined) {
      const newLocation = { lat, lng };
      
      // Set location mode to manual
      setLocationSource('manual');
      setManualMarker(newLocation);
      setUserLocation(newLocation);
      
      // Reverse geocode to get address
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: newLocation }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const newAddress = results[0].formatted_address;
          setAddress(newAddress);
          
          if (onLocationChange) {
            onLocationChange(newLocation, newAddress);
          }
          
          // Save to localStorage if option enabled
          if (saveLocation) {
            localStorage.setItem('userLocation', JSON.stringify(newLocation));
            localStorage.setItem('userAddress', newAddress);
            
            // Dispatch event for other components to react
            window.dispatchEvent(
              new CustomEvent('locationUpdated', { detail: newLocation })
            );
          }
        }
      });
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading maps...</div>;

  const mapCenter = userLocation || defaultCenter;

  return (
    <div className="relative w-full h-screen">
      <Autocomplete onLoad={autoC => setAutocomplete(autoC)} onPlaceChanged={handlePlaceChanged}>
        <input
          type="text"
          placeholder="Enter your address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="absolute top-4 left-4 z-20 p-2 border-2 border-black rounded bg-white"
        />
      </Autocomplete>
      <div className="absolute inset-0 rounded-lg shadow-lg">
        {locationSource === 'manual' && (
          <div className="absolute top-4 left-4 z-50 bg-black text-white px-3 py-1 rounded-lg border-2 border-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.7)]">
            <p className="text-sm font-bold">Manual Location Mode</p>
          </div>
        )}
        
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={mapCenter}
          onLoad={map => { mapRef.current = map; }}
          onClick={handleMapClick}
          options={{
            styles: [
              {
                featureType: "all",
                elementType: "all",
                stylers: [
                  { saturation: -100 },
                  { lightness: 20 }
                ]
              }
            ],
            disableDefaultUI: true,
            zoomControl: true,
            streetViewControl: true,
            mapTypeControl: true,
            fullscreenControl: true,
          }}
        >
          {/* User's current location - different icons for auto vs manual */}
          {userLocation && !manualMarker && (
            <MarkerF 
              position={userLocation}
              icon={{
                url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#0000FF" stroke="black" stroke-width="2"/></svg>')}`,
                scaledSize: new google.maps.Size(28, 28)
              }}
            />
          )}
          
          {/* Manual location marker */}
          {manualMarker && (
            <MarkerF 
              position={manualMarker}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng) {
                  const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                  setManualMarker(newLoc);
                  setUserLocation(newLoc);
                  
                  // Reverse geocode for address
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ location: newLoc }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                      const newAddress = results[0].formatted_address;
                      setAddress(newAddress);
                      
                      if (onLocationChange) {
                        onLocationChange(newLoc, newAddress);
                      }
                      
                      if (saveLocation) {
                        localStorage.setItem('userLocation', JSON.stringify(newLoc));
                        localStorage.setItem('userAddress', newAddress);
                      }
                    }
                  });
                }
              }}
              icon={{
                url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="16" fill="#FFD700" stroke="black" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="#000000"/></svg>')}`,
                scaledSize: new google.maps.Size(36, 36),
                anchor: new google.maps.Point(18, 18)
              }}
            >
              {/* Showing location info using OverlayView instead of InfoWindow to avoid errors */}
              <OverlayView
                position={manualMarker}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="flex flex-col items-center relative -mt-16">
                  <div className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.7)] p-2 rounded-lg">
                    <strong>Your Location</strong>
                    <p className="text-xs mt-1">Drag to adjust position</p>
                  </div>
                </div>
              </OverlayView>
            </MarkerF>
          )}
          
          {/* Developer markers */}
          {developers.map(developer => {
            const developerName = developer.name || `${developer.first_name || ''} ${developer.last_name || ''}`.trim();
            const position = { lat: developer.lat, lng: developer.lng };
            const isSelected = selectedDeveloper?.id === developer.id;
            
            return (
              <React.Fragment key={developer.id}>
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-50"
                  style={{ 
                    top: 0,
                    left: 0,
                    pointerEvents: 'none'
                  }}
                >
                  <MarkerF
                    position={position}
                    onClick={() => {
                      setSelectedDeveloper(developer);
                      if (onDeveloperSelect) onDeveloperSelect(developer);
                    }}
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="1" height="1" viewBox="0 0 1 1" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>'),
                      scaledSize: new google.maps.Size(1, 1)
                    }}
                  />
                </div>
                
                {/* Custom developer marker with neobrutalist design */}
                <MarkerF
                  position={position}
                  onClick={() => {
                    setSelectedDeveloper(developer);
                    if (onDeveloperSelect) onDeveloperSelect(developer);
                  }}
                  icon={{
                    url: `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="1" height="1" viewBox="0 0 1 1" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>')}`,
                    scaledSize: new google.maps.Size(1, 1)
                  }}
                >
                  {/* Custom overlay for developer marker styled like the Facebook image */}
                  <OverlayView 
                    position={position}
                    mapPaneName={OverlayView.FLOAT_PANE}
                  >
                    <div className="flex flex-col items-center">
                      <div className="bg-black text-white font-bold px-3 py-1.5 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.7)] text-sm z-10">
                        {developerName}
                      </div>
                      {/* Custom pin styled more like the Facebook image */}
                      <div className="relative -mt-1.5">
                        <div className="w-7 h-7 rounded-full bg-[#FFD700] border-2 border-black shadow-md relative">
                          {/* Inner circle */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black"></div>
                        </div>
                        {/* Pin triangle */}
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-4"
                          style={{
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '8px solid black'
                          }}
                        ></div>
                      </div>
                    </div>
                  </OverlayView>
                </MarkerF>
                
                {/* Info window when developer is selected */}
                {isSelected && (
                  <InfoWindowF
                    position={position}
                    onCloseClick={() => setSelectedDeveloper(null)}
                  >
                    <div className="p-2 max-w-[200px] bg-white border-2 border-black">
                      <h3 className="font-bold text-lg">{developerName}</h3>
                      {developer.service && <p><strong>Service:</strong> {developer.service}</p>}
                      {(developer.rating || developer.average_rating) && (
                        <div className="flex items-center mt-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                          <span>{developer.rating || developer.average_rating || 0}/5</span>
                        </div>
                      )}
                      {developer.hourly_rate && <p className="mt-1"><strong>Rate:</strong> ${developer.hourly_rate}/hr</p>}
                      {developer.distance_km && <p className="mt-1"><strong>Distance:</strong> {Math.round(developer.distance_km * 10) / 10} km</p>}
                    </div>
                  </InfoWindowF>
                )}
              </React.Fragment>
            );
          })}
        </GoogleMap>
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10 rounded-lg" />
    </div>
  );
};

export default Map;
