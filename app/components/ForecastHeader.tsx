import React from 'react';
import { DateTime } from 'luxon';

interface Period {
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  icon?: string;
  name: string;
  startTime?: string;
}

interface DailyForecast {
  properties?: {
    periods?: Period[];
  };
}

interface ForecastHeaderProps {
  daily: unknown;
  lat: number;
  lng: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  timeZone?: string;
}

function getCurrentPeriod(periods: Period[]): Period | undefined {
  if (!periods || periods.length === 0) return undefined;
  return periods[0];
}

export default function ForecastHeader({ daily, lat, lng, address, timeZone }: ForecastHeaderProps) {
  // Get the first period's startTime for time zone info
  const periods: Period[] = (daily && typeof daily === 'object' && 'properties' in daily && Array.isArray((daily as DailyForecast).properties?.periods))
    ? ((daily as DailyForecast).properties?.periods as Period[])
    : [];
  const firstStartTime = periods[0]?.startTime;
  let now = DateTime.now();
  let tzAbbr = '';
  if (firstStartTime && timeZone) {
    now = DateTime.fromISO(firstStartTime, { zone: 'utc' }).setZone(timeZone) as DateTime<true>;
    tzAbbr = now.offsetNameShort;
  } else if (firstStartTime) {
    now = DateTime.fromISO(firstStartTime) as DateTime<true>;
    tzAbbr = now.offsetNameShort;
  }
  const current = getCurrentPeriod(periods);
  if (!current) return null;

  // Debug address data
  console.log('Address data:', address);

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 black-emerald-bg rounded-lg p-4 shadow">
      <div className="flex-1">
        <div className="text-lg text-gray-400">
          {now.toFormat('EEE, MMM d, yyyy, h:mm a')}
          {tzAbbr && <span className="ml-2">({tzAbbr})</span>}
        </div>
        <div className="text-3xl font-mono text-white">
          {current.temperature}&deg;{current.temperatureUnit}
        </div>
        <div className="text-xl text-gray-300">{current.shortForecast}</div>
        {/* Location info */}
        <div className="mt-2 text-gray-400 text-sm">
          {address && (
            <>
              <div>
                {address.state && `${address.state}`}
                {address.city && `${address.state ? ', ' : ''}${address.city}`}
                {address.zip && `${(address.state || address.city) ? ', ' : ''}${address.zip}`}
                {address.street && `${(address.state || address.city || address.zip) ? ', ' : ''}${address.street}`}
              </div>
              <div>
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </div>
            </>
          )}
        </div>
      </div>
      {current.icon && (
        <img src={current.icon} alt={current.shortForecast} className="w-20 h-20 sepia-60 rounded-lg border-2 us-white-border" />
      )}
    </div>
  );
} 