"use client";
import React from 'react';
import Image from 'next/image';
import { DateTime } from 'luxon';

interface HourlyPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: string;
  dewpoint?: { value: number | null; unitCode?: string };
  windSpeed?: string;
  windDirection?: string;
  icon?: string;
  shortForecast?: string;
}

interface HourlyForecastTableProps {
  hourly: unknown;
  timeZone?: string;
}

export default function HourlyForecastTable({ hourly, timeZone }: HourlyForecastTableProps) {
  // Type guard for hourly
  const periods: HourlyPeriod[] = (hourly && typeof hourly === 'object' && 'properties' in hourly && (hourly as { properties?: { periods?: HourlyPeriod[] } }).properties?.periods)
    ? (hourly as { properties: { periods: HourlyPeriod[] } }).properties.periods
    : [];

  // Helper to get weekday abbreviation in forecast location's local time
  const getWeekday = (dateStr: string) => {
    return DateTime.fromISO(dateStr, { zone: 'utc' }).setZone(timeZone || 'utc').toFormat('EEE');
  };
  // Helper to get hour in forecast location's local time (from ISO string) -> use AM/PM, without AM/PM
  const getHour = (dateStr: string) => {
    return DateTime.fromISO(dateStr, { zone: 'utc' }).setZone(timeZone || 'utc').toFormat('h');
  };

  // Helper to get AM/PM in forecast location's local time (from ISO string)
  const getAMPM = (dateStr: string) => {
    return DateTime.fromISO(dateStr, { zone: 'utc' }).setZone(timeZone || 'utc').toFormat('a');
  };

  // Extract units from the first period
  const tempUnit = periods[0]?.temperatureUnit || '°F';
  // Dew point units are converted to Fahrenheit later when they are processed
  const dewpointUnit = periods[0]?.dewpoint?.unitCode === 'wmoUnit:degC' ? 'F' : '°C';
  const windUnit = periods[0]?.windSpeed?.includes('mph') ? 'mph' : '';

  // Icon mapping for each row
  const rowIcons: Record<string, string> = {
    temperature: '/icons/temperature.svg',
    dewpoint: '/icons/dew-point.svg',
    windspeed: '/icons/wind-speed.svg',
    winddirection: '/icons/wind-direction.svg',
  };

  // Units for each row
  const units = {
    temperature: tempUnit,
    dewpoint: dewpointUnit,
    windspeed: windUnit,
    winddirection: '-',
  };

  return (
    <div className="w-full mb-6">
      <div className="midnight-sky-bg shadow p-4 border us-white-border">
        <div className="font-mono text-gray-200 mb-2 orbitron-font-sub">Hourly Forecast (7 days)</div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-[900px] align-top">
            <table className="w-full text-center text-sm text-white">
              <tbody>
                {/* Weekday row */}
                <tr className="text-gray-400">
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">{getWeekday(p.startTime)}</td>
                  ))}
                </tr>
                {/* Hour row */}
                <tr className="text-gray-400">
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">{getHour(p.startTime)}</td>
                  ))}
                </tr>
                {/* AM/PM row */}
                <tr className="text-gray-400">
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">{getAMPM(p.startTime)}</td>
                  ))}
                </tr>
                {/* Weather icon row */}
                <tr>
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}></td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">
                      {p.icon && <img src={p.icon} alt={p.shortForecast} className="w-8 h-8 mx-auto notch sepia-60" />}
                    </td>
                  ))}
                </tr>
                {/* Temperature row */}
                <tr>
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={rowIcons.temperature} alt="Temperature" width={32} height={32} style={{ objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <noscript><div style={{ width: 32, height: 32, background: '#fbbf24' }} /></noscript>
                    </div>
                  </td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    {units.temperature}
                  </td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">{p.temperature}</td>
                  ))}
                </tr>
                {/* Add four empty rows above the current sticky rows */}
                {/* Dewpoint row */}
                <tr>
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={rowIcons.dewpoint} alt="Dew Point" width={32} height={32} style={{ objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <noscript><div style={{ width: 32, height: 32, background: '#38bdf8' }} /></noscript>
                    </div>
                  </td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    {units.dewpoint}
                  </td>
                  {/* convert dewpoint to fahrenheit */}
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">
                      {typeof p.dewpoint?.value === 'number' && p.dewpoint.value !== null ? Math.round((p.dewpoint.value * 9/5) + 32) : ''}
                    </td>
                  ))}
                </tr>
                {/* Windspeed row */}
                <tr>
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={rowIcons.windspeed} alt="Wind Speed" width={32} height={32} style={{ objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <noscript><div style={{ width: 32, height: 32, background: '#f472b6' }} /></noscript>
                    </div>
                  </td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    {units.windspeed}
                  </td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">{p.windSpeed ? parseInt(p.windSpeed) : ''}</td>
                  ))}
                </tr>
                {/* Wind direction row */}
                <tr>
                  <td className="midnight-sky-bg sticky left-0 z-10" style={{ left: 0, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={rowIcons.winddirection} alt="Wind Direction" width={32} height={32} style={{ objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <noscript><div style={{ width: 32, height: 32, background: '#a3e635' }} /></noscript>
                    </div>
                  </td>
                  <td className="midnight-sky-bg sticky left-8 z-10 border-r us-white-border" style={{ left: 32, zIndex: 10, width: 32, minWidth: 32, maxWidth: 32, padding: 0 }}>
                    {units.winddirection}
                  </td>
                  {periods.map((p, i) => (
                    <td key={i} className="min-w-[38px] border-r us-white-border">{p.windDirection}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 