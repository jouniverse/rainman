import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudHail,
  CloudLightning,
  Wind,
  Haze,
  Tornado,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps a NOAA "shortForecast" string (e.g. "Chance Showers And Thunderstorms",
 * "Mostly Cloudy", "Sunny") to a lucide-react icon component. NOAA does not
 * publish a definitive list of possible shortForecast values, so this uses
 * keyword matching ordered from most to least specific condition.
 */
export function getWeatherIcon(shortForecast?: string | null, isDaytime: boolean = true): LucideIcon {
  const text = (shortForecast || '').toLowerCase();

  if (text.includes('tornado') || text.includes('funnel cloud')) return Tornado;
  if (text.includes('thunder') || text.includes('t-storm') || text.includes('tstorm')) return CloudLightning;
  if (text.includes('snow') || text.includes('flurries') || text.includes('blizzard')) return CloudSnow;
  if (text.includes('sleet') || text.includes('ice') || text.includes('freezing') || text.includes('wintry mix')) return CloudHail;
  if (text.includes('drizzle')) return CloudDrizzle;
  if (text.includes('shower')) return CloudRainWind;
  if (text.includes('rain')) return CloudRain;
  if (text.includes('fog') || text.includes('mist')) return CloudFog;
  if (text.includes('haze') || text.includes('smoke') || text.includes('dust')) return Haze;
  if (text.includes('wind') || text.includes('breezy') || text.includes('blustery') || text.includes('gust')) return Wind;
  if (text.includes('overcast') || text.includes('mostly cloudy') || text.includes('cloudy')) return Cloud;
  if (text.includes('partly') || text.includes('mostly sunny') || text.includes('mostly clear')) {
    return isDaytime ? CloudSun : CloudMoon;
  }
  if (text.includes('clear') || text.includes('sunny') || text.includes('fair')) {
    return isDaytime ? Sun : Moon;
  }

  // Default fallback for unrecognized/empty forecast text
  return isDaytime ? CloudSun : CloudMoon;
}

interface WeatherIconProps {
  shortForecast?: string | null;
  isDaytime?: boolean;
  className?: string;
  strokeWidth?: number;
}

/** Renders the icon matching a shortForecast string. Drop-in replacement for the old <img icon /> usage. */
export default function WeatherIcon({
  shortForecast,
  isDaytime = true,
  className = 'w-8 h-8',
  strokeWidth = 1.5,
}: WeatherIconProps) {
  const Icon = getWeatherIcon(shortForecast, isDaytime);
  return <Icon className={className} strokeWidth={strokeWidth} aria-label={shortForecast || 'Weather'} />;
}
