import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  RefreshCw,
  Clock,
  MapPin,
  TrendingDown,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Truck,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import MapView from '../components/maps/MapView';
import { LoadingState, ErrorState } from '../components/ui/States';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { getMyRoute, updateRequestStatus } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  wasteTypeLabel,
  shortId,
} from '../utils/helpers';
import usePageTitle from '../utils/usePageTitle';

export default function CrewRoutePage() {
  usePageTitle("Today's Smart Route");
  const { addToast } = useToast();

  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [focusedPosition, setFocusedPosition] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);

  const fetchRoute = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getMyRoute();
      setRouteData(res.data.data);
    } catch (err) {
      setError(err.message || 'Failed to generate smart collection route.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  const handleSelectStop = (stop) => {
    setSelectedRequestId(stop.requestId);
    if (stop.location?.latitude && stop.location?.longitude) {
      setFocusedPosition([stop.location.latitude, stop.location.longitude]);
    }
  };

  // Start collection on the next available stop
  const handleStartCollection = async (stop, e) => {
    e.stopPropagation();
    try {
      setActionLoadingId(stop.requestId);
      await updateRequestStatus(stop.requestId, 'IN_PROGRESS');
      addToast(`Collection started for ${shortId(stop.requestId)}!`, 'success');
      await fetchRoute(true);
    } catch (err) {
      addToast(err.message || 'Failed to start collection', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete collection on the in-progress stop
  const handleCompleteCollection = async (stop, e) => {
    e.stopPropagation();
    try {
      setActionLoadingId(stop.requestId);
      await updateRequestStatus(stop.requestId, 'COMPLETED');
      addToast(`Collection completed for ${shortId(stop.requestId)}!`, 'success');
      // Re-fetch route: the completed stop will disappear and remaining route recalculates
      await fetchRoute(true);
    } catch (err) {
      addToast(err.message || 'Failed to complete collection', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const isRoadMode = routeData?.routingMode === 'road';
  const hasStops = (routeData?.orderedStops || []).length > 0;

  return (
    <DashboardLayout
      role="crew"
      title="Today's Smart Route"
      actions={
        <button
          onClick={() => fetchRoute(true)}
          disabled={loading || refreshing}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          title="Recalculate route"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Recalculating...' : 'Refresh Route'}</span>
        </button>
      }
    >
      {/* ── Subtitle ── */}
      <div className="mb-4">
        <p className="text-xs text-slate-500">
          EcoSaathi prioritizes urgent pickups while reducing unnecessary travel.
        </p>
      </div>

      {loading && <LoadingState message="Planning smart collection route..." />}
      {!loading && error && <ErrorState message={error} onRetry={() => fetchRoute(false)} />}

      {!loading && !error && routeData && (
        <div className="space-y-5">
          {/* ── Route Summary KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Stops */}
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold">
                <Navigation size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{routeData.totalStops}</p>
                <p className="text-xs text-slate-400 font-medium">Collection Stops</p>
              </div>
            </div>

            {/* Road Distance */}
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {routeData.totalDistanceKm}{' '}
                  <span className="text-xs font-normal text-slate-400">km</span>
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {isRoadMode ? 'Road Distance' : 'Approx. Distance'}
                </p>
              </div>
            </div>

            {/* Estimated Travel Time */}
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {routeData.estimatedDurationMinutes}{' '}
                  <span className="text-xs font-normal text-slate-400">min</span>
                </p>
                <p className="text-xs text-slate-400 font-medium">Estimated Travel Time</p>
              </div>
            </div>

            {/* Priority Pickups */}
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {routeData.priorityPickupsCount}
                </p>
                <p className="text-xs text-slate-400 font-medium">Priority Pickups</p>
              </div>
            </div>
          </div>

          {/* ── Route Insights & Efficiency Card ── */}
          {hasStops && (
            <div className="card p-4 bg-gradient-to-r from-emerald-50/60 via-green-50/30 to-white border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Route Insights & Optimization
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isRoadMode
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isRoadMode ? '✓ Road Route' : '⚠ Approximate Route'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Approx. Distance Saved:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {routeData.distanceSavedKm > 0 ? `${routeData.distanceSavedKm} km` : '0 km'}
                      </strong>{' '}
                      · Approx. Efficiency Improvement:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {routeData.distanceSavedPercent > 0
                          ? `${routeData.distanceSavedPercent}%`
                          : 'Optimized'}
                      </strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExplainer(!showExplainer)}
                  className="text-xs text-slate-500 hover:text-green-700 font-medium flex items-center gap-1 self-start sm:self-auto"
                >
                  <HelpCircle size={14} />
                  <span>How it works</span>
                </button>
              </div>

              {/* Collapsible Explainer Box */}
              {showExplainer && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 text-xs text-slate-600 bg-white/70 p-3 rounded-lg leading-relaxed animate-fadeIn">
                  <p>
                    <strong>How does EcoSaathi optimize routes?</strong>
                  </p>
                  <p className="mt-1">
                    EcoSaathi considers pickup priority (60%), waiting time (20%), and geographic
                    proximity (20%) to create a practical collection sequence. Road routing is then
                    calculated using the selected stop order.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Unmapped Pickups Notice (if any missing coordinates) ── */}
          {routeData.unmappedRequestsCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
              <span>
                <strong>{routeData.unmappedRequestsCount} pickup</strong> could not be mapped
                because location information is unavailable. You can still access it from My
                Pickups.
              </span>
            </div>
          )}

          {/* ── Main Layout: Hero Map + Route Side Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── Left: Hero Map (7 Cols on Desktop) ── */}
            <div className="lg:col-span-7 card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {routeData.crew?.name || 'Crew Alpha'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({routeData.crew?.vehicleNumber || 'Vehicle Active'})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>🏁 Start Point</span>
                  <span>Numbered: Stops</span>
                  <span className={isRoadMode ? 'text-green-700 font-semibold' : 'text-amber-600'}>
                    {isRoadMode ? '━━ Road Route' : '┅┅ Approx'}
                  </span>
                </div>
              </div>

              <MapView
                requests={routeData.orderedStops}
                startLocation={routeData.startLocation}
                routePolyline={routeData.polyline}
                routingMode={routeData.routingMode}
                height="560px"
                numbered={true}
                focusedPosition={focusedPosition}
                viewDetailBase="/crew/requests"
              />
            </div>

            {/* ── Right: Ordered Stop List Side Panel (5 Cols on Desktop) ── */}
            <div className="lg:col-span-5 card overflow-hidden flex flex-col max-h-[620px]">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Ordered Stop List</h2>
                  <p className="text-[11px] text-slate-400">
                    Sequential stops planned for your shift
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  {routeData.totalStops} Stops
                </span>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {!hasStops ? (
                  <div className="p-10 text-center text-xs text-slate-400 space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-green-600 opacity-80" />
                    <p className="font-bold text-slate-700 text-sm">All pickups completed!</p>
                    <p>No active collection stops are currently assigned to your crew.</p>
                  </div>
                ) : (
                  routeData.orderedStops.map((stop) => {
                    const isSelected = selectedRequestId === stop.requestId;
                    const isInProgress = stop.status === 'IN_PROGRESS';
                    const isNextActionable = stop.sequence === 1;

                    return (
                      <div
                        key={stop.requestId}
                        onClick={() => handleSelectStop(stop)}
                        className={`p-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-green-50/80 border-l-4 border-l-green-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Stop Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                                isInProgress
                                  ? 'bg-purple-600 text-white ring-2 ring-purple-200 animate-pulse'
                                  : isSelected
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {stop.sequence}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-slate-800">
                                  {shortId(stop.requestId)}
                                </span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {wasteTypeLabel(stop.wasteType)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 capitalize">
                                Quantity: {stop.quantity || 'medium'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <PriorityBadge
                              level={stop.priorityLevel}
                              score={stop.priorityScore}
                            />
                            <StatusBadge status={stop.status} />
                          </div>
                        </div>

                        {/* Location & Reason */}
                        <div className="mt-2 text-xs text-slate-500 pl-9 space-y-1">
                          <p className="line-clamp-1">
                            📍 {stop.location?.address || 'Mumbai Pickup Point'}
                          </p>

                          {/* Explainable Why this stop tag */}
                          {stop.selectionReason && (
                            <p className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                              ⚡ {stop.selectionReason}
                            </p>
                          )}

                          {/* Action Bar */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400">
                              {stop.approxDistanceToStopKm
                                ? `~${stop.approxDistanceToStopKm} km to stop`
                                : 'Next stop'}
                            </span>

                            <div className="flex items-center gap-2">
                              <Link
                                to={`/crew/requests/${stop.requestId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-slate-600 hover:text-green-700 font-semibold"
                              >
                                View Pickup →
                              </Link>

                              {/* Start Collection button for the current stop */}
                              {isNextActionable && stop.status === 'ASSIGNED' && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === stop.requestId}
                                  onClick={(e) => handleStartCollection(stop, e)}
                                  className="btn-primary text-xs py-1 px-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center gap-1 shadow-xs"
                                >
                                  <Play size={10} />
                                  <span>Start</span>
                                </button>
                              )}

                              {/* Complete Collection button if in progress */}
                              {isInProgress && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === stop.requestId}
                                  onClick={(e) => handleCompleteCollection(stop, e)}
                                  className="btn-primary text-xs py-1 px-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded flex items-center gap-1 shadow-xs"
                                >
                                  <CheckCircle2 size={11} />
                                  <span>Complete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
