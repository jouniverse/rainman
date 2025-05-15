"use client";

import CollapsibleSidePanel from './components/CollapsibleSidePanel';
import WeatherForecast from './components/WeatherForecast';
import Navbar from './components/layout/Navbar';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DEFAULT_CENTER } from './constants';
import Papa from 'papaparse';

interface Location {
  lat: number;
  lng: number;
  zip: string;
  countyFIPS: string;
  state?: string;
  city?: string;
}

// Add proper types for CSV data
interface CityOption {
  city: string;
  state_id: string;
  lat: string;
  lng: string;
}

interface StateOption {
  state_id: string;
  name: string;
  lat: string;
  lng: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [selectedLocation, setSelectedLocation] = useState<Location>(DEFAULT_CENTER);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchUserLocation = async () => {
      if (session?.user?.id) {
        try {
          setIsInitializing(true);
          const response = await fetch('/api/users');
          if (response.ok) {
            const userData = await response.json();
            
            // Case 1: User has lat/lng coordinates - use them directly
            if (userData.lat !== undefined && userData.lat !== null && 
                userData.lng !== undefined && userData.lng !== null &&
                !isNaN(userData.lat) && !isNaN(userData.lng)) {
              console.log('Using user favorite lat/lng location:', userData);
              
              // Always fetch FIPS for the coordinates to ensure we have the correct countyFIPS
              try {
                const fipsUrl = `/api/geocode?type=reverse&lat=${encodeURIComponent(userData.lat)}&lng=${encodeURIComponent(userData.lng)}`;
                const fipsRes = await fetch(fipsUrl);
                const fipsData = await fipsRes.json();
                const county = fipsData?.result?.geographies?.Counties?.[0];
                
                if (county && county.GEOID) {
                  setSelectedLocation({
                    lat: userData.lat,
                    lng: userData.lng,
                    zip: userData.zip || '',
                    countyFIPS: county.GEOID,
                    state: userData.state,
                    city: userData.city
                  });
                  console.log('Set location with fetched FIPS:', county.GEOID);
                  setIsInitializing(false);
                  return;
                }
              } catch (error) {
                console.error('Error fetching FIPS for favorite coordinates:', error);
              }
              
              // Fallback if FIPS fetch fails
              setSelectedLocation({
                lat: userData.lat,
                lng: userData.lng,
                zip: userData.zip || '',
                countyFIPS: '', // This will be fetched by the WeatherForecast component
                state: userData.state,
                city: userData.city
              });
              setIsInitializing(false);
              return;
            }
            
            // Case 2: User has address components but no lat/lng
            const hasStreetAddress = userData.street && userData.street.trim() !== '';
            const hasCity = userData.city && userData.city.trim() !== '';
            const hasState = userData.state && userData.state.trim() !== '';
            const hasZip = userData.zip && userData.zip.trim() !== '';
            
            // If user has a street address and valid combination of other fields, try geocoding
            if (hasStreetAddress && 
                ((hasCity && hasState) || (hasState && hasZip) || (hasCity && hasZip))) {
              try {
                // Build the query parameters
                const params = new URLSearchParams();
                params.append('type', 'address');
                params.append('street', userData.street);
                if (hasCity) params.append('city', userData.city);
                if (hasState) params.append('state', userData.state);
                if (hasZip) params.append('zip', userData.zip);
                params.append('benchmark', '4');
                params.append('format', 'json');

                const url = `/api/geocode?${params.toString()}`;
                console.log('Geocoding favorite address at startup:', params.toString());
                const res = await fetch(url);
                const data = await res.json();
                
                const match = data?.result?.addressMatches?.[0];
                if (match && match.coordinates) {
                  console.log('Found match for favorite address at startup:', match);
                  const lat = parseFloat(String(match.coordinates.y).replace(/−/g, '-'));
                  const lng = parseFloat(String(match.coordinates.x).replace(/−/g, '-'));
                  
                  // Also fetch FIPS for the geocoded coordinates
                  const fipsUrl = `/api/geocode?type=reverse&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
                  const fipsRes = await fetch(fipsUrl);
                  const fipsData = await fipsRes.json();
                  const county = fipsData?.result?.geographies?.Counties?.[0];
                  
                  if (county && county.GEOID) {
                    setSelectedLocation({
                      lat,
                      lng,
                      zip: userData.zip || '',
                      countyFIPS: county.GEOID,
                      state: userData.state,
                      city: userData.city
                    });
                    setIsInitializing(false);
                    return;
                  }
                }
              } catch (error) {
                console.error('Error geocoding favorite address at startup:', error);
              }
            }
            
            // Case 3: Try city/state center if geocoding failed or we don't have street address
            if (hasCity && hasState) {
              try {
                // For city/state, fetch from the preloaded CSV data
                const res = await fetch('/data/us-cities.csv');
                const csv = await res.text();
                const parsedCsv = Papa.parse<CityOption>(csv, { header: true }).data;
                
                // Find the matching city
                const city = parsedCsv.find(
                  (c) => c.city?.toLowerCase() === userData.city.toLowerCase() && 
                      c.state_id === userData.state
                );
                
                if (city && city.lat && city.lng) {
                  const lat = parseFloat(city.lat);
                  const lng = parseFloat(city.lng);
                  
                  // Fetch FIPS for the city coordinates
                  const fipsUrl = `/api/geocode?type=reverse&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
                  const fipsRes = await fetch(fipsUrl);
                  const fipsData = await fipsRes.json();
                  const county = fipsData?.result?.geographies?.Counties?.[0];
                  
                  if (county && county.GEOID) {
                    setSelectedLocation({
                      lat,
                      lng,
                      zip: userData.zip || '',
                      countyFIPS: county.GEOID,
                      state: userData.state,
                      city: userData.city
                    });
                    setIsInitializing(false);
                    return;
                  }
                }
              } catch (error) {
                console.error('Error finding city center at startup:', error);
              }
            }
            
            // Case 4: Just state as fallback
            if (hasState && !hasCity) {
              try {
                // For state center, fetch from the preloaded CSV data
                const res = await fetch('/data/us-states.csv');
                const csv = await res.text();
                const parsedCsv = Papa.parse<StateOption>(csv, { header: true }).data;
                
                // Find the matching state
                const state = parsedCsv.find(
                  (s) => s.state_id === userData.state
                );
                
                if (state && state.lat && state.lng) {
                  const lat = parseFloat(state.lat);
                  const lng = parseFloat(state.lng);
                  
                  // Fetch FIPS for the state coordinates
                  const fipsUrl = `/api/geocode?type=reverse&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
                  const fipsRes = await fetch(fipsUrl);
                  const fipsData = await fipsRes.json();
                  const county = fipsData?.result?.geographies?.Counties?.[0];
                  
                  if (county && county.GEOID) {
                    setSelectedLocation({
                      lat,
                      lng,
                      zip: userData.zip || '',
                      countyFIPS: county.GEOID,
                      state: userData.state,
                      city: ''
                    });
                    setIsInitializing(false);
                    return;
                  }
                }
              } catch (error) {
                console.error('Error finding state center at startup:', error);
              }
            }
            
            console.log('No valid favorite location found, using default');
            setIsInitializing(false);
          }
        } catch (error) {
          console.error('Error fetching user location:', error);
        }
      }
      
      // If we reach here with no favorite location set, we can use the default
      setIsInitializing(false);
    };

    fetchUserLocation();
  }, [session]);

  // Show loading state while checking session or initializing location
  if (status === 'loading' || isInitializing) {
    return (
      <div className="min-h-screen midnight-sky-bg">
        <Navbar />
        <div className="pt-16">
          <div className="max-w-4xl mx-auto p-8 text-center">
            <div className="loader-pixels"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome page for unauthenticated users
  if (!session) {
    return (
      <div className="min-h-screen midnight-sky-bg relative overflow-hidden">
        <Navbar />
        {/* Video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/video/rainman-bg-splash.mp4"
        />
        {/* Overlay for darkening video */}
        <div className="absolute inset-0 bg-black/60 z-10" />
        {/* Centered content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="space-x-4">
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-black border-white border-2 text-white rounded-md hover:border-rose-700 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="inline-block px-6 py-3 bg-white/10 border-white border-2 text-white rounded-md hover:border-rose-700 transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show weather app for authenticated users
  return (
    <div className="min-h-screen midnight-sky-bg relative">
      {/* Overlay for navbar blur effect */}
      <div className="fixed top-0 left-0 w-full h-16 bg-black/40 z-30 pointer-events-none" />
      <Navbar />
      <CollapsibleSidePanel
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
      >
        <WeatherForecast
          lat={selectedLocation.lat}
          lng={selectedLocation.lng}
          address={{
            zip: selectedLocation.zip,
            state: selectedLocation.state,
            city: selectedLocation.city
          }}
          countyFIPS={selectedLocation.countyFIPS}
        />
      </CollapsibleSidePanel>
    </div>
  );
} 