"use client";

import CollapsibleSidePanel from './components/CollapsibleSidePanel';
import WeatherForecast from './components/WeatherForecast';
import Navbar from './components/layout/Navbar';
import { useState, useEffect } from 'react';
import { DEFAULT_CENTER } from './constants';

interface Location {
  lat: number;
  lng: number;
  zip: string;
  countyFIPS: string;
  state?: string;
  city?: string;
}

const LOCATION_STORAGE_KEY = 'rainman-selected-location';

function loadStoredLocation(): Location {
  if (typeof window === 'undefined') return DEFAULT_CENTER;
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return DEFAULT_CENTER;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number' && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
      return parsed;
    }
    return DEFAULT_CENTER;
  } catch {
    return DEFAULT_CENTER;
  }
}

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [entering, setEntering] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location>(DEFAULT_CENTER);

  // Restore cached location on mount (avoids resetting to default on reload/tab switch)
  useEffect(() => {
    setSelectedLocation(loadStoredLocation());
  }, []);

  // Persist location whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(selectedLocation));
    } catch {
      // ignore storage errors (e.g. private browsing quota)
    }
  }, [selectedLocation]);

  const handleEnter = () => {
    setEntering(true);
    setEntered(true);
  };

  // Show welcome/landing page until the user presses Enter
  if (!entered) {
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
          <button
            onClick={handleEnter}
            disabled={entering}
            className="inline-flex items-center justify-center min-w-[140px] px-6 py-3 bg-white/10 backdrop-blur-md border-white/30 border text-white rounded-xl hover:bg-white/15 hover:border-lime-400 hover:text-lime-300 transition-colors"
          >
            {entering ? <div className="loader-bar"></div> : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  // Weather app
  return (
    <div className="min-h-screen relative">
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