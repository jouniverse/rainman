'use client';

import { useEffect, useState } from 'react';
import WeatherIcon from '../lib/weatherIcons';

interface WeatherWidgetProps {
  temperature: number;
  temperatureUnit?: string;
  precipitationPercent?: number | null;
  shortForecast?: string;
  isDaytime?: boolean;
  size?: number;
}

/**
 * Single-location "ring graph" weather widget, adapted from
 * freezer/weather-widget. Shows a precipitation-chance ring around the
 * current condition icon and temperature.
 */
export default function WeatherWidget({
  temperature,
  temperatureUnit = 'F',
  precipitationPercent,
  shortForecast,
  isDaytime = true,
  size = 140,
}: WeatherWidgetProps) {
  const hasPrecip = precipitationPercent !== null && precipitationPercent !== undefined;
  const percent = Math.max(0, Math.min(1, (precipitationPercent ?? 0) / 100));
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setAnimating(true), 50);
    return () => clearTimeout(id);
  }, [percent]);

  const center = size / 2;
  const radius = size * 0.41;
  const strokeWidth = size * 0.07;
  const circumference = 2 * Math.PI * radius;
  const arcPercent = 2 / 3;
  const startAngle = 90 + (360 * (1 - arcPercent)) / 2;
  const transform = `rotate(${startAngle}, ${center}, ${center})`;
  const arcLength = circumference * arcPercent;
  const gapLength = circumference * (1 - arcPercent);
  const percentAnimated = animating ? percent : 0;
  const offset = circumference - arcLength * percentAnimated;

  const label = hasPrecip
    ? percentAnimated > 0
      ? `${Math.round(percent * 100)}% chance of ${(shortForecast || 'precipitation').toLowerCase()}`
      : `No precipitation expected, ${(shortForecast || '').toLowerCase()}`
    : shortForecast || '';

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      title={label}
    >
      <svg className="block w-full h-full" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <title>{label}</title>
        <g fill="none" strokeLinecap="round" strokeWidth={strokeWidth} transform={transform}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeDasharray={`${arcLength} ${gapLength}`}
            className="stroke-white/15"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            className="stroke-lime-400 transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
        <WeatherIcon shortForecast={shortForecast} isDaytime={isDaytime} className="w-7 h-7 text-lime-300" />
        <span className="font-mono text-xl text-white leading-none">
          {Math.round(temperature)}&deg;{temperatureUnit}
        </span>
        {hasPrecip && (
          <span className="text-[10px] text-gray-300 font-mono leading-none">{Math.round(percent * 100)}% precip</span>
        )}
      </div>
    </div>
  );
}
