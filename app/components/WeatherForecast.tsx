'use client';

import React, { useEffect, useState, useMemo } from 'react';
import ForecastHeader from './ForecastHeader';
import ForecastCharts from './ForecastCharts';
import HourlyForecastTable from './HourlyForecastTable';
import DailyForecastTable from './DailyForecastTable';
import WeatherAlertsTable from './WeatherAlertsTable';
import ClimateCharts from './ClimateCharts';
import Image from 'next/image';

interface WeatherForecastProps {
  lat: number;
  lng: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  countyFIPS?: string;
}

interface MetaProperties {
  county?: string;
  [key: string]: unknown;
}

interface Meta {
  properties?: MetaProperties;
  [key: string]: unknown;
}

interface WeatherData {
  meta: Meta;
  daily: unknown;
  hourly: unknown;
}

interface ClimateStation {
  id: string;
  name: string;
  mindate: string;
  maxdate: string;
  latitude: number;
  longitude: number;
}

interface ClimateData {
  station: ClimateStation;
  data: Record<string, unknown>[];
}

// Collapsible container for radar imagery
function RadarImagerySection({ radarStation }: { radarStation?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="midnight-sky-bg p-4 pt-6 shadow border us-white-border">
      <button
        className="us-white-text mb-2 font-mono flex items-center justify-between w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? 'Hide' : 'Show'} Radar Imagery</span>
        <Image 
          src={open ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
          alt={open ? 'Open' : 'Closed'} 
          width={16} 
          height={16}
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-4 items-center">
          {radarStation ? (
            <div className="w-full flex flex-col items-center">
              <div className="font-mono text-gray-300 mt-4 mb-1">Closest Radar Station ({radarStation})</div>
              <img
                src={`https://radar.weather.gov/ridge/standard/${radarStation}_loop.gif`}
                alt={`Radar loop for station ${radarStation}`}
                className="w-full max-w-md rounded-lg border us-white-border sepia-30 brightness-95"
                style={{ objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="font-mono text-gray-300 mb-1">No radar image available from closest radar station</div>
            </div>
          )}
          <div className="w-full flex flex-col items-center">
            <div className="font-mono text-gray-300 mb-1">Continental US (CONUS)</div>
            <img
              src="https://radar.weather.gov/ridge/standard/CONUS_loop.gif"
              alt="CONUS radar loop"
              className="w-full max-w-md rounded-lg border us-white-border mb-4 sepia-30 brightness-95"
              style={{ objectFit: 'contain' }}
            />
          </div>
          <a
            href="https://radar.weather.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="us-white-text mt-2 mb-2 font-mono"
          >
            Enhanced Radar View
          </a>
        </div>
      </div>
    </div>
  );
}

// Collapsible container for GeoColor imagery
function GeoColorImagerySection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="midnight-sky-bg p-4 pt-6 shadow mb-6 border-l border-r border-b us-white-border">
      <button
        className="us-white-text mb-2 font-mono flex items-center justify-between w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? 'Hide' : 'Show'} GeoColor Channel (CONUS)</span>
        <Image 
          src={open ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
          alt={open ? 'Open' : 'Closed'} 
          width={16} 
          height={16}
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col items-center">
          <img
            src="https://cdn.star.nesdis.noaa.gov/GOES19/ABI/CONUS/GEOCOLOR/625x375.jpg"
            alt="GeoColor Channel CONUS View"
            className="w-full max-w-2xl rounded-lg border us-white-border mt-4 mb-4 sepia-30 brightness-95"
            style={{ objectFit: 'contain' }}
          />
          <a
            href="https://www.weather.gov/crp/satellite/"
            target="_blank"
            rel="noopener noreferrer"
            className="us-white-text mt-3 mb-3 font-mono"
          >
            Satellite Imagery
          </a>
        </div>
      </div>
    </div>
  );
}

export default function WeatherForecast({ lat, lng, address, countyFIPS }: WeatherForecastProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [climate, setClimate] = useState<ClimateData | null>(null);
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateError, setClimateError] = useState<string | null>(null);
  
  // Use a ref to track the last request to avoid duplicate fetches
  const lastClimateRequest = React.useRef<string>('');

  const timeZone = data?.meta?.properties?.timeZone as string | undefined;

  // Get radarStation from point metadata if available
  const radarStation = useMemo(() => {
    if (data && data.meta && data.meta.properties && typeof data.meta.properties === 'object') {
      return data.meta.properties.radarStation as string | undefined;
    }
    return undefined;
  }, [data]);

  useEffect(() => {
    if (lat === 0 && lng === 0) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else {
          setData(json);
          console.log('Weather API response:', json);
        }
      })
      .catch(() => setError('Failed to fetch weather data'))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  // Fetch climate data automatically
  useEffect(() => {
    if (lat === 0 && lng === 0) {
      setClimate(null);
      setClimateError(null);
      return;
    }

    const zip = address?.zip;
    console.log('Climate useEffect triggered', { lat, lng, zip, countyFIPS });
    
    // Only continue if we have the essential parameters
    if ((!zip && !countyFIPS) || !lat || !lng) {
      console.warn('Missing required parameters for climate data fetch');
      setClimateError('Missing location information');
      return;
    }
    
    // Create a request signature to avoid duplicate requests
    const requestSignature = `${lat},${lng},${zip || ''},${countyFIPS || ''}`;
    
    // Skip if this is the same request we just made
    if (requestSignature === lastClimateRequest.current) {
      console.log('Skipping duplicate climate request:', requestSignature);
      return;
    }
    
    // Reset previous climate data
    setClimate(null);
    setClimateError(null);
    setClimateLoading(true);
    
    // Check if we have default location values to prevent using them accidentally
    const isDefaultLocation = Math.abs(lat - 39.8283) < 0.001 && Math.abs(lng - (-98.5795)) < 0.001;
    if (isDefaultLocation) {
      console.warn('Fetching climate data for default location - this may be unintended');
    }
    
    // Remember this request to prevent duplicates
    lastClimateRequest.current = requestSignature;
    
    const fetchUrl = `/api/climate?lat=${lat}&lng=${lng}${zip ? `&zip=${zip}` : ''}${countyFIPS ? `&countyFIPS=${countyFIPS}` : ''}`;
    console.log('Fetching climate data from:', fetchUrl);
    
    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) {
          console.error(`Climate API returned ${res.status}`);
          throw new Error(`Climate API error: ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.error) {
          console.error('Climate API returned error:', json.error);
          setClimateError(json.error);
        } else {
          console.log('Climate data received successfully:', json.station?.name);
          setClimate(json);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch climate data:', err);
        setClimateError(`Failed to fetch climate data: ${err.message}`);
      })
      .finally(() => setClimateLoading(false));
  }, [lat, lng, address?.zip, countyFIPS]); // Remove climate from dependencies

  // Log the climate station name and id when available
  useEffect(() => {
    if (climate && climate.station) {
      console.log('Climate station:', climate.station.name, 'ID:', climate.station.id);
    }
  }, [climate]);

  // Show instruction screen when no location is selected (lat and lng are 0)
  if (lat === 0 && lng === 0) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-[#16151d]">
        <div className="text-center">
          <img src="/icons/rain.svg" alt="Rain" className="w-32 h-32 mx-auto mb-4 opacity-50" />
          <p className="text-xl us-white-text">Select forecast location from the side panel</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loader-pixels"></div>;
  if (error) return <div className="text-red-400 p-4 text-center w-full">{error}</div>;
  if (!data) return null;

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Weather Forecast Section Header */}
      <div className="section-header text-2xl font-bold text-white mb-4 mt-15 orbitron-font-main">Weather Forecast</div>
      {/* ForecastHeader */}
      <div className="mb-6">
        <ForecastHeader
          daily={data.daily}
          lat={lat}
          lng={lng}
          address={typeof address === 'object' ? address : undefined}
          timeZone={timeZone}
        />
      </div>
      {/* HourlyForecastTable */}
      <div className="mb-6">
        <HourlyForecastTable hourly={data.hourly} timeZone={timeZone} />
      </div>
      {/* DailyForecastTable */}
      <div className="mb-6">
        <DailyForecastTable daily={data.daily} />
      </div>
      {/* Radar Imagery Section */}
      <RadarImagerySection radarStation={radarStation} />
      {/* GeoColor Imagery Section */}
      <GeoColorImagerySection />
      {/* ForecastCharts */}
      <div className="mb-6">
        <ForecastCharts hourly={data.hourly} timeZone={timeZone} />
      </div>
      {/* Weather Alerts Table (below charts) */}
      {data.meta && data.meta.properties?.county && (
        <WeatherAlertsTable countyUrl={data.meta.properties.county} />
      )}
      {/* Climate Data Section Header */}
      <div className="section-header text-2xl font-bold text-white mb-4 mt-8 orbitron-font-main">Climate Data</div>
      {/* ClimateCharts (at the bottom) */}
      <div className="mb-6">
        <ClimateCharts
          climate={climate}
          loading={climateLoading}
          error={climateError || ''}
        />
      </div>
    </div>
  );
} 