import React, { useEffect, Component } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { priorityMarkerColor, wasteTypeLabel, shortId } from '../../utils/helpers';

// Error Boundary for Map resilience
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('Map rendering fallback triggered:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 border border-slate-200 rounded-xl"
          style={{ height: this.props.height || '340px' }}
        >
          <MapPin className="text-slate-400 mb-2" size={32} />
          <p className="text-sm font-semibold text-slate-700">Map is temporarily unavailable.</p>
          <p className="text-xs text-slate-500 mt-1">Pickup coordinates and details remain fully accessible.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fix Leaflet icon asset loading
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MUMBAI = [19.076, 72.8777];

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';
const TILE_URL = GEOAPIFY_KEY
  ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = GEOAPIFY_KEY
  ? 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  : '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

// Helper for numbered stop markers or standard priority dot
function createStopIcon(index, level) {
  const color = priorityMarkerColor(level);
  if (index !== undefined && index !== null) {
    return L.divIcon({
      className: 'custom-stop-icon',
      html: `
        <div style="
          width: 30px; height: 30px;
          background: ${color};
          color: white;
          font-weight: 800;
          font-size: 13px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${index}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    });
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px; height: 18px;
        background: ${color};
        border: 2.5px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

// Crew Vehicle Marker icon
function createCrewIcon(status = 'AVAILABLE') {
  let bg = '#16a34a'; // green
  if (status === 'BUSY') bg = '#f59e0b'; // amber
  if (status === 'OFFLINE') bg = '#64748b'; // slate

  return L.divIcon({
    className: 'custom-crew-icon',
    html: `
      <div style="
        width: 36px; height: 36px;
        background: ${bg};
        color: white;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
      ">
        🚛
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

// Special Route Starting Point Marker icon
function createStartPointIcon() {
  return L.divIcon({
    className: 'custom-start-icon',
    html: `
      <div style="
        width: 36px; height: 36px;
        background: #0284c7;
        color: white;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">
        🏁
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

// Subcomponent to dynamically fit bounds or pan to focus
function MapAutoFit({ points = [], focusedPosition = null }) {
  const map = useMap();

  useEffect(() => {
    if (focusedPosition) {
      map.setView(focusedPosition, 15, { animate: true });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }
  }, [map, points, focusedPosition]);

  return null;
}

/**
 * MapView — Reusable Leaflet map with support for:
 *   - Pickup markers (with priority colors and optional numbering)
 *   - Route starting location marker (visually distinct, unnumbered)
 *   - Road route polylines (Geoapify actual road routing or approximate fallback)
 *   - Crew vehicle markers (singular or array of crews)
 *   - Auto-bounds fitting
 *   - Interactive action callbacks (e.g. onAssignCrew)
 */
export default function MapView({
  requests = [],
  crewLocation = null,
  crews = [],
  startLocation = null,
  routePolyline = [],
  routingMode = 'road', // 'road' | 'fallback'
  height = '400px',
  center,
  zoom = 12,
  numbered = false,
  focusedPosition = null,
  onAssignCrew = null,
  viewDetailBase = '/admin/requests',
}) {
  const mapCenter = center || MUMBAI;

  // Combine single crewLocation and crews list
  const allCrews = [];
  if (crewLocation?.latitude && crewLocation?.longitude) {
    allCrews.push(crewLocation);
  }
  crews.forEach((c) => {
    if (c.currentLocation?.latitude && c.currentLocation?.longitude) {
      allCrews.push({
        _id: c._id,
        name: c.name,
        vehicleNumber: c.vehicleNumber,
        status: c.status,
        assignedRequests: c.assignedRequests,
        latitude: c.currentLocation.latitude,
        longitude: c.currentLocation.longitude,
      });
    }
  });

  // Collect all valid lat/lng points for auto-fitting
  const points = [];
  if (startLocation?.latitude && startLocation?.longitude) {
    points.push([startLocation.latitude, startLocation.longitude]);
  }
  allCrews.forEach((c) => {
    if (c.latitude && c.longitude) points.push([c.latitude, c.longitude]);
  });
  requests.forEach((req) => {
    if (req.location?.latitude && req.location?.longitude) {
      points.push([req.location.latitude, req.location.longitude]);
    }
  });
  if (routePolyline?.length > 0) {
    routePolyline.forEach((p) => {
      if (Array.isArray(p) && p.length >= 2) points.push(p);
    });
  }

  const isFallback = routingMode === 'fallback';

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height }}>
      <MapErrorBoundary height={height}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <MapAutoFit points={points} focusedPosition={focusedPosition} />

        {/* ── Route Polyline ── */}
        {routePolyline && routePolyline.length >= 2 && (
          <>
            {isFallback ? (
              /* Approximate straight-line fallback route */
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: '#d97706',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: '8, 8',
                }}
              />
            ) : (
              /* Real Road Route Polyline */
              <>
                <Polyline
                  positions={routePolyline}
                  pathOptions={{
                    color: '#15803d',
                    weight: 6,
                    opacity: 0.85,
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={routePolyline}
                  pathOptions={{
                    color: '#22c55e',
                    weight: 3,
                    opacity: 0.95,
                  }}
                />
              </>
            )}
          </>
        )}

        {/* ── Route Starting Point Marker ── */}
        {startLocation?.latitude && startLocation?.longitude && (
          <Marker
            position={[startLocation.latitude, startLocation.longitude]}
            icon={createStartPointIcon()}
            zIndexOffset={2000}
          >
            <Popup>
              <div className="text-xs p-1 min-w-[170px]">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <span className="font-bold text-sky-800 text-sm">🏁 Starting Point</span>
                </div>
                <p className="font-semibold text-slate-800 mt-1">
                  {startLocation.label || 'Collection Starting Location'}
                </p>
                <p className="text-slate-400 text-[10px] mt-1 font-mono">
                  📍 {startLocation.latitude.toFixed(4)}, {startLocation.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Collection Crew Markers ── */}
        {allCrews.map((c, i) => (
          <Marker
            key={c._id || `crew-${i}`}
            position={[c.latitude, c.longitude]}
            icon={createCrewIcon(c.status)}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-xs p-1 min-w-[160px]">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-sm">
                    🚛 {c.name || 'Crew'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      c.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.status === 'BUSY'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">
                  Vehicle: <span className="font-semibold">{c.vehicleNumber || '—'}</span>
                </p>
                <p className="text-slate-600">
                  Assigned Pickups: <span className="font-bold">{c.assignedRequests?.length || 0}</span>
                </p>
                <p className="text-slate-400 text-[10px] mt-1 pt-1 border-t border-slate-100">
                  📍 {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Pickup Requests Markers ── */}
        {requests.map((req, index) => {
          const lat = req.location?.latitude;
          const lng = req.location?.longitude;
          if (!lat || !lng) return null;

          const isUnassigned = !req.assignedCrew && req.status === 'PENDING';
          const stopNumber = req.sequence || (numbered ? index + 1 : null);

          return (
            <Marker
              key={req._id || req.requestId || index}
              position={[lat, lng]}
              icon={createStopIcon(stopNumber, req.priorityLevel)}
              zIndexOffset={500}
            >
              <Popup>
                <div className="text-xs space-y-1.5 min-w-[190px] p-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800">
                      {stopNumber ? `STOP #${stopNumber} · ` : ''}{shortId(req._id || req.requestId)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        req.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : req.status === 'ASSIGNED'
                          ? 'bg-blue-100 text-blue-800'
                          : req.status === 'IN_PROGRESS'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p>
                    <span className="text-slate-500">Waste:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {wasteTypeLabel(req.wasteType)}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Priority:</span>{' '}
                    <span className="font-bold">{req.priorityLevel}</span> ({req.priorityScore ?? '—'}/100)
                  </p>

                  {req.selectionReason && (
                    <p className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-600">
                      💡 <strong>Order reason:</strong> {req.selectionReason}
                    </p>
                  )}

                  {req.location?.address && (
                    <p className="text-slate-500 text-[10px] line-clamp-1">
                      📍 {req.location.address}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`${viewDetailBase}/${req._id || req.requestId}`}
                      className="text-green-700 hover:text-green-900 font-bold text-xs"
                    >
                      View Details →
                    </Link>

                    {isUnassigned && onAssignCrew && (
                      <button
                        onClick={() => onAssignCrew(req)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-bold shadow-xs"
                      >
                        Assign Crew
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      </MapErrorBoundary>
    </div>
  );
}
