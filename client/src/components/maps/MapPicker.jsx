import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Green marker for selected location
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

// Mumbai center
const MUMBAI = { lat: 19.076, lng: 72.8777 };

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';
const TILE_URL = GEOAPIFY_KEY
  ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = GEOAPIFY_KEY
  ? 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  : '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

// ── Click handler ─────────────────────────────────────────────────────────────
function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

/**
 * MapPicker — allows user to click map to select a location.
 *
 * Props:
 *   value        { lat, lng } — current selected coordinates
 *   onChange     (coords) => void
 *   height       CSS height string (default '360px')
 *   readonly     boolean — disable clicking
 */
export default function MapPicker({ value, onChange, height = '360px', readonly = false }) {
  const markerPos = value?.lat && value?.lng ? [value.lat, value.lng] : null;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer
        center={markerPos || [MUMBAI.lat, MUMBAI.lng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        {!readonly && <ClickHandler onLocationSelect={onChange} />}
        {markerPos && (
          <Marker position={markerPos} icon={greenIcon}>
            <Popup>
              <div className="text-xs">
                <strong>Selected Location</strong><br />
                Lat: {value.lat.toFixed(6)}<br />
                Lng: {value.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
