import { NextRequest, NextResponse } from 'next/server';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const cache: Record<string, { timestamp: number; data: unknown }> = {};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat or lng parameter' }, { status: 400 });
  }
  const cacheKey = `${lat},${lng}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return NextResponse.json(cache[cacheKey].data);
  }
  const userAgent = process.env.USER_AGENT || 'usweather.info, jouni.dev@gmail.com';
  try {
    // 1. Fetch metadata
    const metaRes = await fetch(`https://api.weather.gov/points/${lat},${lng}`, {
      headers: { 'User-Agent': userAgent },
    });
    if (!metaRes.ok) throw new Error('Failed to fetch metadata');
    const meta = await metaRes.json();
    const forecastUrl = meta.properties?.forecast;
    const forecastHourlyUrl = meta.properties?.forecastHourly;
    // Extract countyFIPS from county URL if present
    let countyFIPS = undefined;
    if (meta.properties?.county) {
      // Example: "https://api.weather.gov/zones/county/CA037"
      const match = meta.properties.county.match(/county\/([A-Z]{2}(\d{3,6}))/);
      if (match) {
        // The FIPS is the numeric part (last 5 or 6 digits)
        countyFIPS = match[1].replace(/^[A-Z]+/, '');
      }
    }
    if (!forecastUrl || !forecastHourlyUrl) {
      return NextResponse.json({ error: 'Forecast URLs not found in metadata' }, { status: 500 });
    }
    // 2. Fetch daily forecast
    const dailyRes = await fetch(forecastUrl, { headers: { 'User-Agent': userAgent } });
    if (!dailyRes.ok) throw new Error('Failed to fetch daily forecast');
    const daily = await dailyRes.json();
    // 3. Fetch hourly forecast
    const hourlyRes = await fetch(forecastHourlyUrl, { headers: { 'User-Agent': userAgent } });
    if (!hourlyRes.ok) throw new Error('Failed to fetch hourly forecast');
    const hourly = await hourlyRes.json();
    // Add countyFIPS to meta.properties
    const metaWithFIPS = { ...meta, properties: { ...meta.properties, countyFIPS } };
    const result = { meta: metaWithFIPS, daily, hourly };
    cache[cacheKey] = { timestamp: now, data: result };
    return NextResponse.json(result);
  } catch (err: unknown) {
    let message = 'Failed to fetch weather data';
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 