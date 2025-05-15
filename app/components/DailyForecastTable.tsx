"use client";
import React, { useState } from 'react';
import Image from 'next/image';

interface DailyForecastTableProps {
  daily: {
    properties: {
      periods: Period[];
    };
  };
}

interface Period {
  number: number;
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  probabilityOfPrecipitation?: { value: number | null };
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  icon?: string;
}

function getDayLabel(day: Period | null, night: Period | null) {
  const period = day || night;
  if (!period) return '';
  if (period.name === 'Today' || period.name === 'Tonight') return period.name;
  if (period.name) {
    if (period.name.endsWith('Night')) {
      return period.name.replace(' Night', '');
    }
    return period.name;
  }
  // Fallback: use weekday from startTime
  if (period.startTime) {
    return new Date(period.startTime).toLocaleDateString('en-US', { weekday: 'long' });
  }
  return '';
}

export default function DailyForecastTable({ daily }: DailyForecastTableProps) {
  // Type guard for daily
  const periods: Period[] = (daily && 'properties' in daily && daily.properties?.periods)
    ? daily.properties.periods
    : [];

  // Group periods by day (pair day and night)
  const days: { label: string; day: Period | null; night: Period | null }[] = [];
  for (let i = 0; i < periods.length; ) {
    let day: Period | null = null;
    let night: Period | null = null;
    if (periods[i].isDaytime) {
      day = periods[i];
      if (periods[i + 1] && !periods[i + 1].isDaytime) {
        night = periods[i + 1];
        i += 2;
      } else {
        i += 1;
      }
    } else {
      night = periods[i];
      i += 1;
    }
    const label = getDayLabel(day, night);
    days.push({ label, day, night });
  }

  const [tableOpen, setTableOpen] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [openSub, setOpenSub] = useState<{ dayIdx: number; type: 'day' | 'night' } | null>(null);

  return (
    <div className="w-full mb-6">
      <div className="midnight-sky-bg shadow p-2 pt-4 border us-white-border">
        <button
          className="w-full text-left font-mono text-gray-200 mb-2 flex items-center justify-between text-lg hover:bg-gray-700 rounded px-2 py-2"
          onClick={() => setTableOpen((v) => !v)}
        >
          <span className="us-white-text">7-Day Daily Forecast</span>
          <Image 
            src={tableOpen ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
            alt={tableOpen ? 'Open' : 'Closed'} 
            width={16} 
            height={16}
            className={`transition-transform duration-300 ${tableOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${tableOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="divide-y divide-gray-700">
            {days.map(({ label, day, night }, idx) => (
              <div key={idx}>
                {/* Day group header */}
                <button
                  className="w-full text-left py-2 px-2 font-bold text-lg text-white hover:bg-gray-700 rounded flex items-center justify-between"
                  onClick={() => setOpenDay(openDay === idx ? null : idx)}
                >
                  <span>{label}</span>
                  <Image 
                    src={openDay === idx ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
                    alt={openDay === idx ? 'Open' : 'Closed'} 
                    width={16} 
                    height={16}
                    className={`transition-transform duration-300 ${openDay === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openDay === idx ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4">
                    {/* Day period */}
                    {day && (
                      <div className="mb-2">
                        <button
                          className="w-full text-left py-1 px-2 text-white hover:bg-gray-700 rounded flex items-center justify-between"
                          onClick={() => setOpenSub(openSub?.dayIdx === idx && openSub.type === 'day' ? null : { dayIdx: idx, type: 'day' })}
                        >
                          <span className="flex items-center gap-2">
                            {day.icon && <img src={day.icon} alt={day.shortForecast} className="w-8 h-8 rounded-sm sepia-60 border us-white-border" />}
                            <span className="font-semibold">Day</span>
                            <span className="text-sm">{day.shortForecast}</span>
                          </span>
                          <Image 
                            src={openSub?.dayIdx === idx && openSub.type === 'day' ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
                            alt={openSub?.dayIdx === idx && openSub.type === 'day' ? 'Open' : 'Closed'} 
                            width={16} 
                            height={16}
                            className={`transition-transform duration-300 ${openSub?.dayIdx === idx && openSub.type === 'day' ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-200 mt-1">
                          <div>Temp: <span className="font-mono">{day.temperature}&deg;{day.temperatureUnit}</span></div>
                          <div>Precip: <span className="font-mono">{day.probabilityOfPrecipitation?.value ?? '-'}%</span></div>
                          <div>Wind: <span className="font-mono">{day.windSpeed} {day.windDirection}</span></div>
                          <div></div>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSub?.dayIdx === idx && openSub.type === 'day' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="mt-2 text-gray-300 text-sm midnight-sky-bg p-2 border us-white-border">
                            {day.detailedForecast}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Night period */}
                    {night && (
                      <div className="mb-2">
                        <button
                          className="w-full text-left py-1 px-2 text-white hover:bg-gray-700 rounded flex items-center justify-between"
                          onClick={() => setOpenSub(openSub?.dayIdx === idx && openSub.type === 'night' ? null : { dayIdx: idx, type: 'night' })}
                        >
                          <span className="flex items-center gap-2">
                            {night.icon && <img src={night.icon} alt={night.shortForecast} className="w-8 h-8 rounded-sm sepia-60 border us-white-border" />}
                            <span className="font-semibold">Night</span>
                            <span className="text-sm">{night.shortForecast}</span>
                          </span>
                          <Image 
                            src={openSub?.dayIdx === idx && openSub.type === 'night' ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
                            alt={openSub?.dayIdx === idx && openSub.type === 'night' ? 'Open' : 'Closed'} 
                            width={16} 
                            height={16}
                            className={`transition-transform duration-300 ${openSub?.dayIdx === idx && openSub.type === 'night' ? 'rotate-180' : ''}`}
                          />
                        </button>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-200 mt-1">
                          <div>Temp: <span className="font-mono">{night.temperature}&deg;{night.temperatureUnit}</span></div>
                          <div>Precip: <span className="font-mono">{night.probabilityOfPrecipitation?.value ?? '-'}%</span></div>
                          <div>Wind: <span className="font-mono">{night.windSpeed} {night.windDirection}</span></div>
                          <div></div>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSub?.dayIdx === idx && openSub.type === 'night' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="mt-2 mb-2 text-gray-300 text-sm midnight-sky-bg p-2 border us-white-border">
                            {night.detailedForecast}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 