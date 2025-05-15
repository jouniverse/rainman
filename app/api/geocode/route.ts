import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'address' or 'reverse'

  let apiUrl = '';

  if (type === 'address') {
    // Address geocoding
    const street = searchParams.get('street') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const zip = searchParams.get('zip') || '';
    apiUrl = `https://geocoding.geo.census.gov/geocoder/locations/address?street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip=${encodeURIComponent(zip)}&benchmark=4&format=json`;
  } else if (type === 'reverse') {
    // Reverse geocoding
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    apiUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  } else {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch from US Census Bureau API' }, { status: 500 });
  }
} 