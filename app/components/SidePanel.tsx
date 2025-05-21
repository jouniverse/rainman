'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import { DEFAULT_CENTER } from '../constants';

const MapContainer = dynamic(() => import('./MapContainer'), {
  ssr: false,
});

interface LocationInput {
  street: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
}

interface SidePanelProps {
  selectedLocation: {
    lat: number;
    lng: number;
    zip: string;
    countyFIPS: string;
    state?: string;
    city?: string;
  };
  setSelectedLocation: React.Dispatch<React.SetStateAction<{
    lat: number;
    lng: number;
    zip: string;
    countyFIPS: string;
    state?: string;
    city?: string;
  }>>;
}

interface StateOption {
  state_id: string;
  name: string;
  lat: string;
  lng: string;
}

interface CityOption {
  city: string;
  state_id: string;
  lat: string;
  lng: string;
}

export default function SidePanel({ selectedLocation = DEFAULT_CENTER, setSelectedLocation }: SidePanelProps) {
  const [location, setLocation] = useState<LocationInput>({
    street: '',
    city: '',
    state: '',
    zip: '',
    latitude: '',
    longitude: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const stateDropdownRef = useRef<HTMLUListElement>(null);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLUListElement>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
  const [userFavorite, setUserFavorite] = useState<{
    lat?: number;
    lng?: number;
    state?: string;
    city?: string;
    street?: string;
    zip?: string;
  } | null>(null);

  // Fetch user's favorite location on initial load
  useEffect(() => {
    const fetchUserFavorite = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const userData = await response.json();
          setUserFavorite({
            lat: userData.lat,
            lng: userData.lng,
            state: userData.state,
            city: userData.city, 
            street: userData.street,
            zip: userData.zip
          });
        }
      } catch (error) {
        console.error('Error fetching user favorite location:', error);
      }
    };

    fetchUserFavorite();
  }, []);

  // Update mapCenter when selectedLocation changes (for initial load and Weather button)
  useEffect(() => {
    if (selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number' &&
        !isNaN(selectedLocation.lat) && !isNaN(selectedLocation.lng) &&
        (selectedLocation.lat !== DEFAULT_CENTER.lat || selectedLocation.lng !== DEFAULT_CENTER.lng)) {
      setMapCenter([selectedLocation.lat, selectedLocation.lng]);
    }
  }, [selectedLocation]);

  // Preload state list from CSV
  useEffect(() => {
    fetch('/data/us-states.csv')
      .then(res => res.text())
      .then(csv => {
        const parsed = Papa.parse(csv, { header: true });
        setStateOptions(parsed.data as StateOption[]);
      });
  }, []);

  // Preload city list from CSV (use sample for dev)
  useEffect(() => {
    fetch('/data/us-cities.csv')
      .then(res => res.text())
      .then(csv => {
        const parsed = Papa.parse(csv, { header: true });
        setCityOptions(parsed.data as CityOption[]);
      });
  }, []);

  // Close state dropdown on outside click
  useEffect(() => {
    if (!showStateDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        stateInputRef.current &&
        !stateInputRef.current.contains(event.target as Node) &&
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStateDropdown]);

  // Close city dropdown on outside click
  useEffect(() => {
    if (!showCityDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target as Node) &&
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCityDropdown]);

  const hasLatLng = location.latitude.trim() !== '' && location.longitude.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Helper to set selectedLocation only if all fields are valid
      const setLocationWithFIPS = (lat: number, lng: number, zip: string, state?: string, city?: string) => async () => {
        // Always fetch countyFIPS for any lat/lng
        const fipsUrl = `/api/geocode?type=reverse&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
        const fipsRes = await fetch(fipsUrl);
        const fipsData = await fipsRes.json();
        const county = fipsData?.result?.geographies?.Counties?.[0];
        
        // Get state and city from reverse geocoding if not provided
        let reverseState = state;
        let reverseCity = city;
        
        if (!state) {
          const stateData = fipsData?.result?.geographies?.States?.[0];
          if (stateData?.STUSAB) {
            reverseState = stateData.STUSAB;
          }
        }
        
        if (!city) {
          // Try to get city from Census Designated Places first
          const cdp = fipsData?.result?.geographies?.['Census Designated Places']?.[0];
          if (cdp?.BASENAME) {
            reverseCity = cdp.BASENAME;
          } else {
            // Fall back to Incorporated Places if no CDP found
            const place = fipsData?.result?.geographies?.['Incorporated Places']?.[0];
            if (place?.BASENAME) {
              reverseCity = place.BASENAME;
            }
          }
        }

        if (county && county.GEOID) {
          setSelectedLocation({
            lat,
            lng,
            zip,
            countyFIPS: county.GEOID,
            state: reverseState,
            city: reverseCity
          });
          console.log('Set selectedLocation (with FIPS):', {
            lat,
            lng,
            zip,
            countyFIPS: county.GEOID,
            state: reverseState,
            city: reverseCity
          });
        } else {
          setError('Could not find county FIPS for the given coordinates.');
          setLoading(false);
          return false;
        }
        return true;
      };

      // If pendingCoords is set, use them for forecast
      if (pendingCoords) {
        const lat = pendingCoords.lat;
        const lng = pendingCoords.lng;
        const success = await setLocationWithFIPS(lat, lng, '', location.state, location.city)();
        if (!success) return;
        setLocation(prev => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
        setPendingCoords(null); // Clear after use
        setLoading(false);
        return;
      }

      // If no input fields are filled, use the current selectedLocation
      if (!hasLatLng && !location.street && !location.city && !location.state && !location.zip) {
        if (selectedLocation.lat !== DEFAULT_CENTER.lat || selectedLocation.lng !== DEFAULT_CENTER.lng) {
          // Use the current selectedLocation if it's not the default center
          await setLocationWithFIPS(selectedLocation.lat, selectedLocation.lng, selectedLocation.zip, selectedLocation.state, selectedLocation.city)();
          setLoading(false);
          return;
        }
      }

      // Check for ZIP code only input first
      if (location.zip && !location.street && !location.city && !location.state && !hasLatLng) {
        setLoading(false);
        setError('Please enter either valid latitude and longitude, a valid address (street + city+state, state+zip, or city+zip), a city, or a state.');
        return;
      }

      // 1. Lat/Lng direct input
      if (hasLatLng) {
        setLocation(prev => ({ ...prev, street: '', city: '', state: '', zip: '' }));
        // Sanitize minus sign for lat/lng
        const lat = parseFloat(location.latitude.trim().replace(/−/g, '-'));
        const lng = parseFloat(location.longitude.trim().replace(/−/g, '-'));
        if (isNaN(lat) || isNaN(lng)) {
          setError('Invalid latitude or longitude.');
          setLoading(false);
          return;
        }
        await setLocationWithFIPS(lat, lng, '', location.state, location.city)();
        setLoading(false);
        return;
      }

      // 2. Address input: try all valid combinations in order
      if (location.street) {
        // Try street-based geocoding first (options 1-4)
        const addressCombos = [
          { street: location.street, city: location.city, state: location.state, zip: location.zip }, // 1. street + city + state + zip
          { street: location.street, city: location.city, state: location.state, zip: '' }, // 2. street + city + state
          { street: location.street, city: '', state: location.state, zip: location.zip }, // 3. street + state + zip
          { street: location.street, city: location.city, state: '', zip: location.zip }, // 4. street + city + zip
        ];

        console.log('Available address combinations:', addressCombos); // Debug log
        console.log('Current location state:', location.state); // Debug log

        let found = false;
        for (const combo of addressCombos) {
          // Skip if we don't have enough fields for this combination
          if (!combo.street) continue;
          console.log('Processing combo:', combo); // Debug log

          // For street + state + zip combination, we need both state and zip
          if (!combo.city && combo.state && combo.zip) {
            console.log('Found street + state + zip combo'); // Debug log
            const params = new URLSearchParams();
            params.append('type', 'address');
            params.append('street', combo.street);
            params.append('state', combo.state);
            params.append('zip', combo.zip);
            params.append('benchmark', '4');
            params.append('format', 'json');

            const url = `/api/geocode?${params.toString()}`;
            console.log('Trying geocode with:', params.toString()); // Debug log
            const res = await fetch(url);
            const data = await res.json();
            console.log('Geocode response:', JSON.stringify(data, null, 2)); // Detailed debug log
            console.log('Address matches:', data?.result?.addressMatches); // Debug address matches
            const match = data?.result?.addressMatches?.[0];
            if (match && match.coordinates) {
              console.log('Found match:', match); // Debug match details
              const lat = parseFloat(String(match.coordinates.y).replace(/−/g, '-'));
              const lng = parseFloat(String(match.coordinates.x).replace(/−/g, '-'));
              const zip = match.addressComponents?.zip || combo.zip || '';
              setLocation(prev => ({
                ...prev,
                latitude: '',
                longitude: '',
                zip,
              }));
              await setLocationWithFIPS(lat, lng, zip, location.state, location.city)();
              found = true;
              break;
            } else {
              console.log('No match found for combination:', combo); // Debug no match
            }
          }
          // For other combinations, we need at least one of city, state, or zip
          else if (!(combo.city || combo.state || combo.zip)) {
            console.log('Skipping combo - not enough fields'); // Debug log
            continue;
          }

          const params = new URLSearchParams();
          params.append('type', 'address');
          params.append('street', combo.street);
          if (combo.city) params.append('city', combo.city);
          if (combo.state) params.append('state', combo.state);
          if (combo.zip) params.append('zip', combo.zip);
          params.append('benchmark', '4');
          params.append('format', 'json');

          const url = `/api/geocode?${params.toString()}`;
          console.log('Trying geocode with:', params.toString()); // Debug log
          const res = await fetch(url);
          const data = await res.json();
          console.log('Geocode response:', JSON.stringify(data, null, 2)); // Detailed debug log
          console.log('Address matches:', data?.result?.addressMatches); // Debug address matches
          const match = data?.result?.addressMatches?.[0];
          if (match && match.coordinates) {
            console.log('Found match:', match); // Debug match details
            const lat = parseFloat(String(match.coordinates.y).replace(/−/g, '-'));
            const lng = parseFloat(String(match.coordinates.x).replace(/−/g, '-'));
            const zip = match.addressComponents?.zip || combo.zip || '';
            setLocation(prev => ({
              ...prev,
              latitude: '',
              longitude: '',
              zip,
            }));
            await setLocationWithFIPS(lat, lng, zip, location.state, location.city)();
            found = true;
            break;
          } else {
            console.log('No match found for combination:', combo); // Debug no match
          }
        }

        if (found) {
          setLoading(false);
          return;
        }

        // If street geocoding failed, try city or state center based on available fields
        // Only fall back to city/state center if we don't have enough fields for street geocoding
        if (!location.city && !location.state) {
          // 7. street + zip -> invalid
          setError('Please provide either city or state along with street address.');
          setLoading(false);
          return;
        } else if (location.city && !location.state && !location.zip) {
          // 5. street + city -> use city center
          const city = cityOptions.find(
            c => c.city.toLowerCase() === location.city.toLowerCase()
          );
          if (city) {
            const lat = parseFloat(String(city.lat).replace(/−/g, '-'));
            const lng = parseFloat(String(city.lng).replace(/−/g, '-'));
            setLocation(prev => ({ ...prev, latitude: '', longitude: '' }));
            await setLocationWithFIPS(lat, lng, '', location.state, location.city)();
            setLoading(false);
            return;
          }
        } else if (location.state && !location.city && !location.zip) {
          // 6. street + state -> use state center
          const state = stateOptions.find(s => s.state_id === location.state);
          if (state) {
            const lat = parseFloat(String(state.lat).replace(/−/g, '-'));
            const lng = parseFloat(String(state.lng).replace(/−/g, '-'));
            setLocation(prev => ({ ...prev, latitude: '', longitude: '' }));
            await setLocationWithFIPS(lat, lng, '', location.state, location.city)();
            setLoading(false);
            return;
          }
        } else {
          // If we have enough fields for street geocoding but it failed, show error
          setError('Could not find coordinates for the given address. Please check the street, city, state, and zip code.');
          setLoading(false);
          return;
        }
      }

      // 8-11. City-based combinations (no street)
      if (location.city && !location.street) {
        const city = cityOptions.find(
          c => c.city.toLowerCase() === location.city.toLowerCase() && (!location.state || c.state_id === location.state)
        );
        if (city) {
          const lat = parseFloat(String(city.lat).replace(/−/g, '-'));
          const lng = parseFloat(String(city.lng).replace(/−/g, '-'));
          setLocation(prev => ({ ...prev, latitude: '', longitude: '' }));
          await setLocationWithFIPS(lat, lng, location.zip || '', location.state, location.city)();
          setLoading(false);
          return;
        } else {
          setError('City not found in the database.');
          setLoading(false);
          return;
        }
      }

      // 12. State-only
      if (location.state && !location.street && !location.city) {
        const state = stateOptions.find(s => s.state_id === location.state);
        if (state) {
          const lat = parseFloat(String(state.lat).replace(/−/g, '-'));
          const lng = parseFloat(String(state.lng).replace(/−/g, '-'));
          setLocation(prev => ({ ...prev, latitude: '', longitude: '' }));
          await setLocationWithFIPS(lat, lng, '', location.state, location.city)();
          setLoading(false);
          return;
        } else {
          setError('State not found in the database.');
          setLoading(false);
          return;
        }
      }

      setError('Please enter either valid latitude and longitude, a valid address (street + city+state, state+zip, or city+zip), a city, or a state.');
    } catch {
      setError('Failed to fetch location data.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If entering lat/lng coordinates, clear ALL address fields
    if (name === 'latitude' || name === 'longitude') {
      setLocation(prev => ({
        ...prev,
        [name]: value,
        // Clear all address fields when entering coordinates
        street: '',
        city: '',
        state: '',
        zip: '',
      }));
      
      // Also clear the search values for dropdowns
      setCitySearch('');
      setStateSearch('');
      
      // Hide dropdowns
      setShowCityDropdown(false);
      setShowStateDropdown(false);
    } 
    // If entering any address field, clear latitude and longitude
    else {
      setLocation(prev => ({
        ...prev,
        [name]: value,
        // Clear coordinate fields when entering any address field
        latitude: '',
        longitude: '',
      }));
      
      // Update search values for dropdowns if needed
      if (name === 'city') {
        setCitySearch(value);
      } else if (name === 'state') {
        setStateSearch(value);
      }
    }
  };

  // Handle map click: set pending coordinates, clear all address and lat/lng fields
  const handleMapClick = async (lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
    // Clear all location fields
    setLocation({
      street: '',
      city: '',
      state: '',
      zip: '',
      latitude: '',
      longitude: '',
    });
    // Clear search values
    setCitySearch('');
    setStateSearch('');
    // Update map center for zooming
    setMapCenter([lat, lng]);
    // Clear any previous errors
    setError(null);
  };

  // Use the user's favorite location
  const handleUseFavoriteLocation = async () => {
    if (!userFavorite) return;
    
    setFavoriteLoading(true);
    setError(null);
    
    try {
      // Case 1: User has lat/lng values (most precise)
      if (userFavorite.lat !== undefined && userFavorite.lat !== null && 
          userFavorite.lng !== undefined && userFavorite.lng !== null) {
        const lat = userFavorite.lat;
        const lng = userFavorite.lng;
        setPendingCoords({ lat, lng });
        setMapCenter([lat, lng]);
        
        // Update location input fields - strings required
        setLocation({
          street: '',
          city: '',
          state: '',
          zip: '',
          latitude: lat.toString(),
          longitude: lng.toString()
        });
        
        setCitySearch('');
        setStateSearch('');
        setFavoriteLoading(false);
        return;
      }
      
      // Case 2: User has address components but no lat/lng
      const hasStreetAddress = userFavorite.street && userFavorite.street.trim() !== '';
      
      // First, try to construct a location using available fields
      const favoriteLocation: LocationInput = {
        street: userFavorite.street || '',
        city: userFavorite.city || '',
        state: userFavorite.state || '',
        zip: userFavorite.zip || '',
        latitude: '',
        longitude: ''
      };
      
      // Set the location state with the favorite values
      setLocation(favoriteLocation);
      
      // Update search values for dropdowns
      if (favoriteLocation.city) {
        setCitySearch(favoriteLocation.city);
      }
      
      if (favoriteLocation.state) {
        setStateSearch(favoriteLocation.state);
      }
      
      // If we have a street address, and any combination of city/state/zip, try geocoding
      if (hasStreetAddress && (favoriteLocation.city || favoriteLocation.state || favoriteLocation.zip)) {
        // For geocoding, we need to have at least one of: city+state, state+zip, or city+zip
        const hasValidCombination = (favoriteLocation.city && favoriteLocation.state) || 
                                   (favoriteLocation.state && favoriteLocation.zip) ||
                                   (favoriteLocation.city && favoriteLocation.zip);
        
        if (hasValidCombination) {
          // Build the query parameters
          const params = new URLSearchParams();
          params.append('type', 'address');
          params.append('street', favoriteLocation.street);
          if (favoriteLocation.city) params.append('city', favoriteLocation.city);
          if (favoriteLocation.state) params.append('state', favoriteLocation.state);
          if (favoriteLocation.zip) params.append('zip', favoriteLocation.zip);
          params.append('benchmark', '4');
          params.append('format', 'json');

          // Try geocoding the address
          try {
            const url = `/api/geocode?${params.toString()}`;
            console.log('Geocoding favorite address with:', params.toString());
            const res = await fetch(url);
            const data = await res.json();
            
            const match = data?.result?.addressMatches?.[0];
            if (match && match.coordinates) {
              console.log('Found match for favorite address:', match);
              const lat = parseFloat(String(match.coordinates.y).replace(/−/g, '-'));
              const lng = parseFloat(String(match.coordinates.x).replace(/−/g, '-'));
              
              setPendingCoords({ lat, lng });
              setMapCenter([lat, lng]);
              setFavoriteLoading(false);
              return;
            } else {
              console.log('No match found for favorite address, falling back to city/state');
            }
          } catch (error) {
            console.error('Error geocoding favorite address:', error);
          }
        }
      }
      
      // If geocoding failed or we don't have street address, try city/state
      // If we have city and state, try to find coordinates from cityOptions
      if (favoriteLocation.city && favoriteLocation.state) {
        const city = cityOptions.find(
          c => c.city.toLowerCase() === favoriteLocation.city.toLowerCase() && 
              c.state_id === favoriteLocation.state
        );
        
        if (city) {
          // Parse string lat/lng to numbers
          const lat = parseFloat(city.lat);
          const lng = parseFloat(city.lng);
          setPendingCoords({ lat, lng });
          setMapCenter([lat, lng]);
          setFavoriteLoading(false);
          return;
        }
      } 
      // If only state, use state center
      else if (favoriteLocation.state) {
        const state = stateOptions.find(s => s.state_id === favoriteLocation.state);
        if (state) {
          // Parse string lat/lng to numbers
          const lat = parseFloat(state.lat);
          const lng = parseFloat(state.lng);
          setPendingCoords({ lat, lng });
          setMapCenter([lat, lng]);
          setFavoriteLoading(false);
          return;
        }
      }
      
      setFavoriteLoading(false);
    } catch (error) {
      console.error('Error setting favorite location:', error);
      setError('Failed to set favorite location');
      setFavoriteLoading(false);
    }
  };

  // Clear all inputs and reset map
  const handleClear = () => {
    setLocation({
      street: '',
      city: '',
      state: '',
      zip: '',
      latitude: '',
      longitude: '',
    });
    // Update the map center and also update the selected location to DEFAULT_CENTER
    setMapCenter([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
    setPendingCoords({ lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng });
    setError(null);
    setCitySearch('');
    setStateSearch('');
    setShowCityDropdown(false);
    setShowStateDropdown(false);
  };

  // Handler for state dropdown selection
  const handleStateDropdownSelect = (opt: StateOption) => {
    setLocation(prev => ({
      ...prev,
      state: opt.state_id,
      // Clear coordinate fields when selecting a state
      latitude: '',
      longitude: ''
    }));
    setStateSearch(opt.state_id);
    setShowStateDropdown(false);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden text-gray-100 font-mono px-4 py-2 midnight-sky-bg" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
      <div className="flex flex-col gap-4 flex-1 min-h-0 w-full max-w-full">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-2">Enter Location</h2>
          {userFavorite && (
            (userFavorite.lat !== undefined && userFavorite.lat !== null && 
            userFavorite.lng !== undefined && userFavorite.lng !== null) || 
            (userFavorite.city && userFavorite.state) || 
            userFavorite.street
          ) && (
            <button
              onClick={handleUseFavoriteLocation}
              disabled={favoriteLoading}
              className="p-2 hover:bg-black/30 rounded transition-colors mr-5"
              title="Use Favorite Location"
            >
              <img src="/icons/favorite-fill.svg" alt="Favorite" className="w-6 h-6" />
            </button>
          )}
        </div>
        <div className="text-lg font-medium mb-3">Enter Address</div>
        <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-full">
          <div className="relative">
            <label htmlFor="state" className="block text-sm font-medium mb-1">State</label>
            <input
              type="text"
              id="state"
              name="state"
              value={stateSearch || location.state}
              onChange={e => {
                setStateSearch(e.target.value.toUpperCase());
                setShowStateDropdown(true);
                setLocation(prev => ({ ...prev, state: e.target.value.toUpperCase() }));
              }}
              onFocus={() => setShowStateDropdown(true)}
              className="block w-full max-w-sm rounded bg-gray-800 border border-gray-700 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
              autoComplete="off"
              placeholder="e.g., CA"
              ref={stateInputRef}
            />
            {showStateDropdown && stateOptions.length > 0 && (
              <ul
                ref={stateDropdownRef}
                className="absolute z-10 bg-gray-900 border border-gray-700 w-full max-w-sm mt-1 rounded shadow max-h-48 overflow-y-auto"
              >
                {stateOptions
                  .filter(opt =>
                    stateSearch === '' ||
                    opt.state_id.toUpperCase().includes(stateSearch.toUpperCase()) ||
                    opt.name.toUpperCase().includes(stateSearch.toUpperCase())
                  )
                  .sort((a, b) => {
                    // Prioritize exact state_id match, then startsWith, then name
                    const search = stateSearch.toUpperCase();
                    if (a.state_id.toUpperCase() === search && b.state_id.toUpperCase() !== search) return -1;
                    if (a.state_id.toUpperCase() !== search && b.state_id.toUpperCase() === search) return 1;
                    if (a.state_id.toUpperCase().startsWith(search) && !b.state_id.toUpperCase().startsWith(search)) return -1;
                    if (!a.state_id.toUpperCase().startsWith(search) && b.state_id.toUpperCase().startsWith(search)) return 1;
                    if (a.name.toUpperCase().includes(search) && !b.name.toUpperCase().includes(search)) return -1;
                    if (!a.name.toUpperCase().includes(search) && b.name.toUpperCase().includes(search)) return 1;
                    return 0;
                  })
                  .map(opt => (
                    <li
                      key={opt.state_id}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-700 text-white"
                      onClick={() => handleStateDropdownSelect(opt)}
                    >
                      <span className="font-mono font-bold">{opt.state_id}</span>
                      <span className="ml-2 text-gray-300">{opt.name}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={citySearch || location.city}
              onChange={e => {
                setCitySearch(e.target.value);
                setShowCityDropdown(true);
                setLocation(prev => ({ ...prev, city: e.target.value }));
              }}
              onFocus={() => setShowCityDropdown(true)}
              className="block w-full max-w-sm rounded bg-gray-800 border border-gray-700 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
              autoComplete="off"
              placeholder="e.g., Los Angeles"
              ref={cityInputRef}
            />
            {showCityDropdown && cityOptions.length > 0 && (
              <ul
                ref={cityDropdownRef}
                className="absolute z-10 bg-gray-900 border border-gray-700 w-full max-w-sm mt-1 rounded shadow max-h-48 overflow-y-auto"
              >
                {cityOptions
                  .filter(opt => {
                    const search = citySearch.toLowerCase();
                    const state = location.state;
                    const cityMatch = opt.city && opt.city.toLowerCase().startsWith(search);
                    const stateMatch = !state || opt.state_id === state;
                    return cityMatch && stateMatch;
                  })
                  .slice(0, 50)
                  .map(opt => (
                    <li
                      key={opt.city + '-' + opt.state_id}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-700 text-white"
                      onClick={() => {
                        setLocation(prev => ({
                          ...prev,
                          city: opt.city,
                          // Clear coordinate fields when selecting a city
                          latitude: '',
                          longitude: ''
                          // Do not auto-fill state when city is selected
                        }));
                        setCitySearch(opt.city);
                        setShowCityDropdown(false);
                      }}
                    >
                      <span className="font-mono font-bold">{opt.city}</span>
                      <span className="ml-2 text-gray-300">{opt.state_id}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="zip" className="block text-sm font-medium mb-1">ZIP Code</label>
            <input
              type="text"
              id="zip"
              name="zip"
              value={location.zip}
              onChange={handleChange}
              className="block w-full max-w-sm rounded bg-gray-800 border border-gray-700 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
              pattern="[0-9]{5}"
              title="Five digit zip code"
              autoComplete="off"
              placeholder="e.g., 90001"
            />
          </div>
          <div>
            <label htmlFor="street" className="block text-sm font-medium mb-1">Street Address</label>
            <input
              type="text"
              id="street"
              name="street"
              value={location.street}
              onChange={handleChange}
              className="block w-full max-w-sm rounded bg-gray-800 border border-gray-700 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
              autoComplete="off"
              placeholder="e.g., 123 Main St"
            />
          </div>
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium mb-3">Or enter coordinates</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium mb-1">Latitude</label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  value={location.latitude}
                  onChange={handleChange}
                  step="any"
                  className="block w-full max-w-xs rounded bg-gray-800 border border-gray-700 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., 34.0522"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium mb-1">Longitude</label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  value={location.longitude}
                  onChange={handleChange}
                  step="any"
                  className="block w-full max-w-xs rounded bg-gray-800 border border-gray-700 px-2 py-1 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., -118.2437"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="flex-1 items-center justify-center bg-black text-white rounded border border-white py-2 px-4 hover:border-rose-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={loading}
            >
              {loading ? <div className="loader-bar"></div> : 'Weather'}
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </form>
        {/* Show current lat/lng above the map */}
        <div className="pt-4 text-sm text-gray-300">
          <div>
            <span className="font-semibold">Selected Coordinates:</span> {pendingCoords ? `${pendingCoords.lat.toFixed(6)}, ${pendingCoords.lng.toFixed(6)}` : `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
          </div>
        </div>
        <div className="flex-1 min-h-[300px] notch-10 mt-4 mb-4">
          <MapContainer center={mapCenter} onMapClick={handleMapClick} />
        </div>
      </div>
    </div>
  );
} 