import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  RefreshCw,
  Phone,
  Shield,
  Activity,
  Navigation,
  Sparkles,
  TrendingDown,
  Layers,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CrewStatusBadge, PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import { getCrews, getRequests, getCrewRoute } from '../services/api';
import {
  wasteTypeLabel,
  shortId,
  getWorkloadBadge,
  formatDate,
} from '../utils/helpers';

export default function AdminCrewsPage() {
  const [crews, setCrews] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Crew for Details Modal
  const [selectedCrew, setSelectedCrew] = useState(null);

  // Smart Route Inspection Modal State
  const [smartRouteCrew, setSmartRouteCrew] = useState(null);
  const [smartRouteData, setSmartRouteData] = useState(null);
  const [smartRouteLoading, setSmartRouteLoading] = useState(false);
  const [smartRouteError, setSmartRouteError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [crewRes, reqRes] = await Promise.all([getCrews(), getRequests()]);
      setCrews(crewRes.data.data || []);
      setRequests(reqRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch collection crews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCrews = crews.length;
  const availableCrews = crews.filter((c) => c.status === 'AVAILABLE').length;
  const busyCrews = crews.filter((c) => c.status === 'BUSY').length;
  const offlineCrews = crews.filter((c) => c.status === 'OFFLINE').length;

  // Fetch Smart Route for inspection by Admin
  const handleOpenSmartRoute = async (crew) => {
    try {
      setSmartRouteCrew(crew);
      setSmartRouteLoading(true);
      setSmartRouteError(null);
      setSmartRouteData(null);
      const res = await getCrewRoute(crew._id);
      setSmartRouteData(res.data.data);
    } catch (err) {
      setSmartRouteError(err.message || 'Failed to load smart collection route.');
    } finally {
      setSmartRouteLoading(false);
    }
  };

  // Get active assigned requests for a crew
  const getCrewAssignedRequests = (crew) => {
    if (!crew) return [];
    const assignedIds = (crew.assignedRequests || []).map((id) =>
      typeof id === 'object' ? id._id : id
    );
    return requests.filter(
      (r) =>
        assignedIds.includes(r._id) ||
        (r.assignedCrew?._id || r.assignedCrew) === crew._id
    );
  };

  return (
    <DashboardLayout
      role="admin"
      title="Collection Crews"
      actions={
        <button
          onClick={fetchData}
          className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
          title="Refresh Data"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalCrews}</p>
            <p className="text-xs text-slate-400 font-medium">Total Fleet Crews</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{availableCrews}</p>
            <p className="text-xs text-slate-400 font-medium">Available for Dispatch</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{busyCrews}</p>
            <p className="text-xs text-slate-400 font-medium">Active on Route</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-500">{offlineCrews}</p>
            <p className="text-xs text-slate-400 font-medium">Offline</p>
          </div>
        </div>
      </div>

      {loading && <LoadingState message="Loading collection fleet data..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}
      {!loading && !error && crews.length === 0 && (
        <EmptyState
          icon={Truck}
          message="No collection crews registered. Run database seed to populate crews."
        />
      )}

      {/* Crews Grid */}
      {!loading && !error && crews.length > 0 && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {crews.map((crew) => {
              const activeCount = crew.assignedRequests?.length || 0;
              const workload = getWorkloadBadge(activeCount);

              return (
                <div
                  key={crew._id}
                  className="card p-5 hover:shadow-card-hover transition-all duration-200 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center text-lg font-bold">
                          {crew.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{crew.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold border border-slate-200">
                              {crew.vehicleNumber || 'Standard'}
                            </span>
                            {crew.phone && (
                              <span className="text-[11px] text-slate-400">· {crew.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <CrewStatusBadge status={crew.status} />
                    </div>

                    {/* Workload Indicator Badge */}
                    <div className="mb-4 flex items-center justify-between bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-600">
                        Operational Workload:
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${workload.colorClass}`}
                      >
                        {workload.level}
                      </span>
                    </div>

                    {/* Operational Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-center border border-slate-100">
                        <p className="text-xl font-bold text-slate-800">{activeCount}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active Pickups</p>
                      </div>
                      <div className="bg-emerald-50/60 rounded-xl px-3 py-2.5 text-center border border-emerald-100">
                        <p className="text-xl font-bold text-emerald-700">
                          {crew.completedRequests || 0}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                          Completed Pickups
                        </p>
                      </div>
                    </div>

                    {/* Current Stored Location */}
                    {crew.currentLocation?.latitude && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-4 px-1">
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="font-mono truncate">
                          {crew.currentLocation.latitude.toFixed(4)},{' '}
                          {crew.currentLocation.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenSmartRoute(crew)}
                      className="btn-primary text-xs py-1.5 px-2.5 flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-xs"
                      title="Inspect Smart Collection Route"
                    >
                      <Navigation size={12} />
                      <span>Smart Route</span>
                    </button>

                    <button
                      onClick={() => setSelectedCrew(crew)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-semibold hover:border-green-600 hover:text-green-700"
                    >
                      <span>Details</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Crew Details Modal */}
      {selectedCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center font-bold text-lg">
                  {selectedCrew.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedCrew.name}</h3>
                    <CrewStatusBadge status={selectedCrew.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vehicle:{' '}
                    <strong className="text-slate-800 font-mono">
                      {selectedCrew.vehicleNumber || '—'}
                    </strong>{' '}
                    · Completed:{' '}
                    <strong className="text-emerald-700">
                      {selectedCrew.completedRequests || 0}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCrew(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Crew Stored Location on Leaflet Map */}
            {selectedCrew.currentLocation?.latitude && selectedCrew.currentLocation?.longitude && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1.5">
                  Stored Fleet Station Location
                </p>
                <MapView
                  crews={[selectedCrew]}
                  height="200px"
                  center={[
                    selectedCrew.currentLocation.latitude,
                    selectedCrew.currentLocation.longitude,
                  ]}
                  zoom={14}
                />
              </div>
            )}

            {/* Assigned Requests List */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Assigned Requests ({getCrewAssignedRequests(selectedCrew).length})
                </p>
                {(() => {
                  const badge = getWorkloadBadge(
                    getCrewAssignedRequests(selectedCrew).length
                  );
                  return (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.colorClass}`}
                    >
                      {badge.level} WORKLOAD
                    </span>
                  );
                })()}
              </div>

              {getCrewAssignedRequests(selectedCrew).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No active requests currently assigned to this crew.
                </div>
              ) : (
                <div className="space-y-2">
                  {getCrewAssignedRequests(selectedCrew).map((req) => (
                    <div
                      key={req._id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-700">
                          {shortId(req._id)}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {wasteTypeLabel(req.wasteType)}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {req.location?.address || 'Mumbai Pickup'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <PriorityBadge level={req.priorityLevel} />
                        <StatusBadge status={req.status} />
                        <Link
                          to={`/admin/requests/${req._id}`}
                          className="text-green-700 hover:text-green-900 font-bold ml-1"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const c = selectedCrew;
                  setSelectedCrew(null);
                  handleOpenSmartRoute(c);
                }}
                className="btn-primary text-xs py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-1.5"
              >
                <Navigation size={13} />
                <span>View Smart Route</span>
              </button>
              <button
                onClick={() => setSelectedCrew(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Smart Route Inspection Modal ── */}
      {smartRouteCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center font-bold">
                  <Navigation size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {smartRouteCrew.name} — Smart Collection Route
                    </h3>
                    {smartRouteData && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          smartRouteData.routingMode === 'road'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {smartRouteData.routingMode === 'road' ? 'Road Route' : 'Approximate'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Vehicle: {smartRouteCrew.vehicleNumber || 'Standard'} · Status: {smartRouteCrew.status}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSmartRouteCrew(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {smartRouteLoading && <LoadingState message="Calculating priority-aware smart route..." />}
            {!smartRouteLoading && smartRouteError && (
              <ErrorState
                message={smartRouteError}
                onRetry={() => handleOpenSmartRoute(smartRouteCrew)}
              />
            )}

            {!smartRouteLoading && !smartRouteError && smartRouteData && (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-xl font-bold text-slate-900">{smartRouteData.totalStops}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Stops</p>
                  </div>
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-center">
                    <p className="text-xl font-bold text-blue-900">
                      {smartRouteData.totalDistanceKm} km
                    </p>
                    <p className="text-[11px] text-blue-600 font-medium">
                      {smartRouteData.routingMode === 'road' ? 'Road Distance' : 'Approx. Distance'}
                    </p>
                  </div>
                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-center">
                    <p className="text-xl font-bold text-purple-900">
                      {smartRouteData.estimatedDurationMinutes} min
                    </p>
                    <p className="text-[11px] text-purple-600 font-medium">Estimated Travel Time</p>
                  </div>
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-center">
                    <p className="text-xl font-bold text-emerald-900">
                      {smartRouteData.distanceSavedPercent > 0
                        ? `+${smartRouteData.distanceSavedPercent}%`
                        : 'Optimized'}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Efficiency Improvement
                    </p>
                  </div>
                </div>

                {/* Map Display */}
                <div className="card p-3">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-bold text-slate-700">Spatial Collection Route</span>
                    <span className="text-[11px] text-slate-400">
                      🏁 Starting Point · Numbered Stops 1..{smartRouteData.totalStops}
                    </span>
                  </div>
                  <MapView
                    requests={smartRouteData.orderedStops}
                    startLocation={smartRouteData.startLocation}
                    routePolyline={smartRouteData.polyline}
                    routingMode={smartRouteData.routingMode}
                    height="320px"
                    numbered={true}
                    viewDetailBase="/admin/requests"
                  />
                </div>

                {/* Ordered Stops Table */}
                <div className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Planned Sequence of Stops</span>
                    <span className="text-slate-400">Ordered by Priority-Aware Heuristic</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {smartRouteData.orderedStops.map((stop) => (
                      <div
                        key={stop.requestId}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-[10px]">
                            {stop.sequence}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-slate-800">
                              {shortId(stop.requestId)}
                            </span>
                            <span className="text-slate-600 font-medium ml-1.5">
                              {wasteTypeLabel(stop.wasteType)}
                            </span>
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              📍 {stop.location?.address || 'Mumbai'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            {stop.selectionReason}
                          </span>
                          <PriorityBadge level={stop.priorityLevel} />
                          <StatusBadge status={stop.status} />
                        </div>
                      </div>
                    ))}
                    {smartRouteData.orderedStops.length === 0 && (
                      <p className="p-6 text-center text-xs text-slate-400">
                        No active stops assigned to this crew.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSmartRouteCrew(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
