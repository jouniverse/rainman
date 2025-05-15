import { NextRequest, NextResponse } from 'next/server';

const NOAA_BASE = 'https://www.ncei.noaa.gov/cdo-web/api/v2';
const DATASET_ID = 'GSOM';
const DATA_TYPES = 'TAVG,TMIN,TMAX,PRCP';
const LIMIT = 1000;

// Add type for station
interface ClimateStation {
  id: string;
  name: string;
  mindate: string;
  maxdate: string;
  latitude: number;
  longitude: number;
}

interface ApiError {
  status: number;
  error: string;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to get years between two dates
function yearsBetween(date1: string, date2: string) {
  return (new Date(date2).getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

// Helper to check if date is within last N years
function isWithinLastNYears(date: string, n: number) {
  const d = new Date(date);
  const now = new Date();
  const nYearsAgo = new Date(now.getFullYear() - n, now.getMonth(), 1);
  return d >= nYearsAgo;
}

// Calculate startdate (20 years before last month)
const now = new Date();
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const startdate = new Date(lastMonth.getFullYear() - 20, lastMonth.getMonth(), 1).toISOString().slice(0, 10);

// Helper to fetch stations with given locationId and date param
async function fetchStations(token: string, locationId: string, dateParam: 'startdate' | 'enddate', dateValue: string) {
  const url = `${NOAA_BASE}/stations?datasetid=${DATASET_ID}&locationid=${locationId}&datatypeid=${DATA_TYPES}&${dateParam}=${dateValue}&limit=${LIMIT}`;
  const headers = { token };
  console.log(`Fetching stations: ${url}`);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    console.error('Stations fetch failed:', res.status, text);
    throw { status: res.status, error: `Failed to fetch stations: ${res.statusText}` };
  }
  const data = await res.json();
  return data.results || [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const zip = searchParams.get('zip');
    const countyFIPS = searchParams.get('countyFIPS');
    const token = process.env.NOAA_CLIMATE_API_TOKEN;
    
    // Identify request uniquely for debugging in logs
    const requestId = Math.random().toString(36).substring(2, 8);

    console.log(`[Climate API ${requestId}] Request with: lat=${lat}, lng=${lng}, zip=${zip || 'none'}, countyFIPS=${countyFIPS || 'none'}`);

    // Validate required parameters
    if (!lat || !lng) {
      console.error(`[Climate API ${requestId}] Missing required coordinates: lat=${lat}, lng=${lng}`);
      return NextResponse.json({ error: 'Missing required latitude or longitude parameters.' }, { status: 400 });
    }

    if (!token) {
      console.error(`[Climate API ${requestId}] Missing API token`);
      return NextResponse.json({ error: 'Missing API authentication token.' }, { status: 500 });
    }

    // Check if we're using the default center coordinates
    const isDefaultCenter = Math.abs(lat - 39.8283) < 0.001 && Math.abs(lng - (-98.5795)) < 0.001;
    if (isDefaultCenter) {
      console.warn(`[Climate API ${requestId}] Using default center coordinates - this may be unintended`);
    }

    // Validate countyFIPS format if provided
    if (countyFIPS && !/^\d{5}$/.test(countyFIPS)) {
      console.warn(`[Climate API ${requestId}] Potentially invalid countyFIPS format: ${countyFIPS}`);
    }

    let stations: ClimateStation[] = [];
    let searchType = '';
    
    // 1. Try ZIP + startdate
    if (zip) {
      try {
        stations = await fetchStations(token, `ZIP:${zip}`, 'startdate', startdate);
        searchType = 'ZIP+startdate';
        console.log(`[DEBUG] ZIP+startdate: found ${stations.length} stations`);
        stations.forEach(s => console.log(`[DEBUG] Station: ${s.id}, mindate: ${s.mindate}, maxdate: ${s.maxdate}`));
      } catch (error) {
        console.error('Error fetching stations by ZIP:', error);
        const apiError = error as ApiError;
        return NextResponse.json(apiError, { status: apiError.status || 500 });
      }
    }
    // 2. If no stations, try FIPS + startdate
    if ((!stations || stations.length === 0) && countyFIPS) {
      try {
        stations = await fetchStations(token, `FIPS:${countyFIPS}`, 'startdate', startdate);
        searchType = 'FIPS+startdate';
        console.log(`[DEBUG] FIPS+startdate: found ${stations.length} stations`);
        stations.forEach(s => console.log(`[DEBUG] Station: ${s.id}, mindate: ${s.mindate}, maxdate: ${s.maxdate}`));
      } catch (error) {
        console.error('Error fetching stations by FIPS+startdate:', error);
        const apiError = error as ApiError;
        return NextResponse.json(apiError, { status: apiError.status || 500 });
      }
    }
    // 3. If still no stations, try FIPS + enddate
    if ((!stations || stations.length === 0) && countyFIPS) {
      try {
        stations = await fetchStations(token, `FIPS:${countyFIPS}`, 'enddate', startdate);
        searchType = 'FIPS+enddate';
        console.log(`[DEBUG] FIPS+enddate: found ${stations.length} stations`);
        stations.forEach(s => console.log(`[DEBUG] Station: ${s.id}, mindate: ${s.mindate}, maxdate: ${s.maxdate}`));
      } catch (error) {
        console.error('Error fetching stations by FIPS+enddate:', error);
        const apiError = error as ApiError;
        return NextResponse.json(apiError, { status: apiError.status || 500 });
      }
    }
    if (!stations || stations.length === 0) {
      console.log(`[DEBUG] No stations found. searchType: ${searchType}`);
      return NextResponse.json({ error: 'No climate data available close to the selected location.' }, { status: 404 });
    }

    // 2. Sort stations by distance
    const stationsWithDist = (stations as ClimateStation[])
      .filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map((s) => ({
        ...s,
        distance: haversine(lat, lng, s.latitude, s.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);

    // 3. Iterate through stations by distance, fetch GSOM data for each
    let selectedStation = null;
    let selectedData: Record<string, unknown>[] = [];
    let warning: string | null = null;
    let fallbackStation = null;
    let fallbackData: Record<string, unknown>[] = [];
    let fallbackWindow = 0;
    let fallbackMaxdate = '';

    for (const s of stationsWithDist) {
      const mindate = s.mindate;
      const maxdate = s.maxdate;
      // Calculate 10-year window ending at maxdate, always using the 1st of the month
      const maxDateObj = new Date(maxdate);
      const minDateObj = new Date(mindate);
      // Round maxdate down to the 1st of the month
      const enddate10 = `${maxDateObj.getFullYear()}-${String(maxDateObj.getMonth() + 1).padStart(2, '0')}-01`;
      // Subtract 10 years, keep month, always 1st
      const startYear = maxDateObj.getFullYear() - 10;
      const startMonth = maxDateObj.getMonth() + 1;
      const startdate10 = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
      // Clamp to mindate if needed
      const startdateFinal = (new Date(startdate10) > minDateObj) ? startdate10 : mindate;
      const windowYears = yearsBetween(mindate, maxdate);
      const maxdateRecent = isWithinLastNYears(maxdate, 20);
      // Try to fetch GSOM data for this window
      let results: Record<string, unknown>[] = [];
      let offset = 1;
      let total = 0;
      try {
        do {
          const gsomUrl = `${NOAA_BASE}/data?datasetid=${DATASET_ID}&datatypeid=${DATA_TYPES}&stationid=${s.id}&startdate=${startdateFinal}&enddate=${enddate10}&limit=${LIMIT}&offset=${offset}`;
          console.log(`[DEBUG] Fetching GSOM data for station ${s.id}: ${gsomUrl}`);
          const dataRes = await fetch(gsomUrl, {
            headers: { token },
          });
          if (!dataRes.ok) {
            const text = await dataRes.text();
            console.error(`[DEBUG] GSOM fetch failed for station ${s.id}: status ${dataRes.status}, response: ${text}`);
            throw new Error('Failed to fetch climate data');
          }
          const data = await dataRes.json();
          if (data.results) results = results.concat(data.results);
          total = data.metadata?.resultset?.count || 0;
          offset += LIMIT;
        } while (results.length < total && total > 0);
      } catch (err) {
        console.log(`[DEBUG] Station ${s.name} (${s.id}): error fetching GSOM data, skipping.`, err instanceof Error ? err.message : err);
        continue; // Try next station
      }
      console.log(`Checked station: ${s.name} (${s.id}), window: ${windowYears.toFixed(1)} years, maxdate recent: ${maxdateRecent}, GSOM records: ${results.length}`);
      if (results.length > 0 && maxdateRecent) {
        if (windowYears >= 10) {
          selectedStation = s;
          selectedData = results;
          warning = null;
          break;
        } else if (windowYears >= 5) {
          selectedStation = s;
          selectedData = results;
          warning = 'Only 5 years of data available from the past 20 years.';
          break;
        }
      }
      // Track fallback: most recent maxdate or longest window
      if (!fallbackStation || new Date(maxdate) > new Date(fallbackMaxdate) || (windowYears > fallbackWindow)) {
        fallbackStation = s;
        fallbackData = results;
        fallbackWindow = windowYears;
        fallbackMaxdate = maxdate;
      }
    }
    // If no station meets criteria, use fallback
    if (!selectedStation && fallbackStation) {
      selectedStation = fallbackStation;
      selectedData = fallbackData;
      warning = 'No station with 5+ years of recent data found. Showing the closest station with the most data available.';
      // If data is older than 20 years, add warning
      if (!isWithinLastNYears(selectedStation.maxdate, 20)) {
        warning = 'No recent data available (older than 20 years).';
      }
    }
    if (!selectedStation) {
      return NextResponse.json({ error: 'No climate data available close to the selected location.' }, { status: 404 });
    }
    // Always show a warning if data is older than 20 years
    if (selectedStation && !isWithinLastNYears(selectedStation.maxdate, 20)) {
      warning = 'No recent data available (older than 20 years).';
    }
    // Return station info, distance, climate data, and warning if any
    return NextResponse.json({
      station: {
        id: selectedStation.id,
        name: selectedStation.name,
        mindate: selectedStation.mindate,
        maxdate: selectedStation.maxdate,
        latitude: selectedStation.latitude,
        longitude: selectedStation.longitude,
        distance: selectedStation.distance,
      },
      data: selectedData,
      warning,
    });
  } catch (error) {
    console.error('Error in GET function:', error);
    return NextResponse.json({ error: 'An error occurred while processing the request.' }, { status: 500 });
  }
} 