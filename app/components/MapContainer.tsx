'use client';

import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { useEffect, useState } from 'react';

// Fix for default marker icon
const icon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapContainerProps {
  center: [number, number];
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapAutoCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [37.0902, -95.7129];

// Available basemap tile sources. Satellite uses Esri World Imagery (free, no API key required).
const BASEMAPS = {
  default: {
    label: 'Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
} as const;

type BasemapType = keyof typeof BASEMAPS;

export default function MapContainer({ center, onMapClick }: MapContainerProps) {
  const [basemap, setBasemap] = useState<BasemapType>('default');
  const isDefault = center[0] === DEFAULT_CENTER[0] && center[1] === DEFAULT_CENTER[1];
  const zoom = isDefault ? 4 : 10;
  return (
    <div className="relative h-full w-full">
      {/* Theme-matching filter applied to the whole map (tiles + marker), consistent with the sepia/brightness treatment used on radar/satellite imagery elsewhere */}
      <div className="h-full w-full sepia-30 brightness-95">
        <LeafletMap
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <MapAutoCenter center={center} zoom={zoom} />
          <TileLayer key={basemap} url={BASEMAPS[basemap].url} />
          <Marker position={center} icon={icon}>
            <Popup>
              Selected Location
            </Popup>
          </Marker>
          <MapClickHandler onMapClick={onMapClick} />
        </LeafletMap>
      </div>
      {/* Basemap toggle */}
      <div className="absolute top-2 right-2 z-[1000] flex rounded overflow-hidden border us-white-border font-mono text-xs shadow">
        {(Object.keys(BASEMAPS) as BasemapType[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBasemap(key)}
            className={`px-2 py-1 transition-colors ${
              basemap === key ? 'bg-lime-400 text-black' : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}