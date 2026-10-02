import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
  Filter,
  RefreshCw,
  MapPin,
  Calendar,
  Navigation,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/cards/StatCard';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import AssignCrewModal from '../components/modals/AssignCrewModal';
import { getRequestStats, getRequests, getCrews, getCrewRoute } from '../services/api';
import {
  wasteTypeLabel,
  formatDate,
  shortId,
  formatWaitingTime,
  getWorkloadBadge,
} from '../utils/helpers';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map filters
  const [mapStatusFilter, setMapStatusFilter] = useState('ALL');
  const [mapPriorityFilter, setMapPriorityFilter] = useState('ALL');
  const [mapWasteFilter, setMapWasteFilter] = useState('ALL');

  // Crew Route Overlay state (Section 28)
  const [selectedRouteCrewId, setSelectedRouteCrewId] = useState(null);
  const [routeOverlayData, setRouteOverlayData] = useState(null);
  const [loadingRouteCrewId, setLoadingRouteCrewId] = useState(null);

  // Assign modal state
  const [selectedRequestForAssign, setSelectedRequestForAssign] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, reqRes, crewRes] = await Promise.all([
        getRequestStats(),
        getRequests({ sort: 'priority' }),
        getCrews(),
      ]);
      setStats(statsRes.data.data);
      setRequests(reqRes.data.data || []);
      setCrews(crewRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter requests for the operations map
  const filteredMapRequests = useMemo(() => {
    return requests.filter((r) => {
      if (mapStatusFilter !== 'ALL' && r.status !== mapStatusFilter) return false;
      if (mapPriorityFilter !== 'ALL' && r.priorityLevel !== mapPriorityFilter) return false;
      if (mapWasteFilter !== 'ALL' && r.wasteType !== mapWasteFilter) return false;
      return true;
    });
  }, [requests, mapStatusFilter, mapPriorityFilter, mapWasteFilter]);

  // Compute Operations Alerts dynamically
  const operationsAlerts = useMemo(() => {
    const alerts = [];
    const now = Date.now();

    // 1. Critical requests unassigned
    const criticalUnassigned = requests.filter(
      (r) => r.priorityLevel === 'CRITICAL' && r.status === 'PENDING'
    );
    if (criticalUnassigned.length > 0) {
      alerts.push({
        id: 'crit-unassigned',
        type: 'critical',
        title: 'Critical Attention Required',
        message: `${criticalUnassigned.length} critical pickup ${
          criticalUnassigned.length === 1 ? 'request is' : 'requests are'
        } still unassigned.`,
        actionRequest: criticalUnassigned[0],
      });
    }

    // 2. High requests unassigned
    const highUnassigned = requests.filter(
      (r) => r.priorityLevel === 'HIGH' && r.status === 'PENDING'
    );
    if (highUnassigned.length > 0) {
      alerts.push({
        id: 'high-unassigned',
        type: 'warning',
        title: 'High Priority Pending',
        message: `${highUnassigned.length} high-priority ${
          highUnassigned.length === 1 ? 'request awaits' : 'requests await'
        } crew assignment.`,
      });
    }

    // 3. Requests pending for more than 12 hours
    const stalePending = requests.filter((r) => {
      if (r.status !== 'PENDING' || !r.createdAt) return false;
      const hours = (now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
      return hours >= 12;
    });
    if (stalePending.length > 0) {
      alerts.push({
        id: 'stale-pending',
        type: 'warning',
        title: 'Extended Waiting Time',
        message: `${stalePending.length} pickup ${
          stalePending.length === 1 ? 'request has' : 'requests have'
        } been pending for over 12 hours.`,
      });
    }

    // 4. Crew high workload warning (>= 6 active tasks)
    crews.forEach((c) => {
      const activeCount = c.assignedRequests?.length || 0;
      if (activeCount >= 6) {
        alerts.push({
          id: `crew-load-${c._id}`,
          type: 'warning',
          title: 'Heavy Crew Workload',
          message: `${c.name} currently has a high workload with ${activeCount} active assignments.`,
        });
      }
    });

    // 5. Active collections in progress
    const inProgressCount = requests.filter((r) => r.status === 'IN_PROGRESS').length;
    if (inProgressCount > 0) {
      alerts.push({
        id: 'in-progress-info',
        type: 'info',
        title: 'Live Collections Active',
        message: `${inProgressCount} collection ${
          inProgressCount === 1 ? 'request is' : 'requests are'
        } currently in progress across Mumbai.`,
      });
    }

    // 6. Completed summary
    const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;
    if (completedCount > 0) {
      alerts.push({
        id: 'completed-info',
        type: 'info',
        title: 'Collections Fulfilled',
        message: `${completedCount} total waste collection orders have been successfully completed.`,
      });
    }

    // 7. Pending crew verification alert (E1)
    const pendingCrewsCount = crews.filter(
      (c) => c.verificationStatus === 'PENDING_VERIFICATION'
    ).length;
    if (pendingCrewsCount > 0) {
      alerts.unshift({
        id: 'crew-pending-verifications',
        type: 'warning',
        title: 'Crew Verification Alert',
        message: `${pendingCrewsCount} collection crew ${
          pendingCrewsCount === 1 ? 'application is' : 'applications are'
        } awaiting verification.`,
        actionLink: '/admin/crews?tab=verification',
        actionLabel: 'Review Applications →',
      });
    }

    return alerts;
  }, [requests, crews]);

  const pendingCrewsCount = crews.filter(
    (c) => c.verificationStatus === 'PENDING_VERIFICATION'
  ).length;
  const activeCrewsCount = crews.filter(
    (c) => (c.verificationStatus === 'APPROVED' || !c.verificationStatus) && c.status !== 'OFFLINE'
  ).length;
  const priorityQueue = requests.slice(0, 7);

  const openAssignModal = (req) => {
    setSelectedRequestForAssign(req);
    setIsAssignModalOpen(true);
  };

  const handleToggleCrewRoute = async (crewId) => {
    if (selectedRouteCrewId === crewId) {
      setSelectedRouteCrewId(null);
      setRouteOverlayData(null);
      return;
    }

    try {
      setLoadingRouteCrewId(crewId);
      const res = await getCrewRoute(crewId);
      setSelectedRouteCrewId(crewId);
      setRouteOverlayData(res.data.data);
    } catch (err) {
      console.warn('Failed to load crew route overlay:', err.message);
    } finally {
      setLoadingRouteCrewId(null);
    }
  };

  return (
    <DashboardLayout
      role="admin"
      title="Operations Overview"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={15} />
          </button>
          <Link to="/admin/requests" className="btn-primary inline-flex items-center gap-1.5 text-xs">
            <ClipboardList size={14} />
            Manage Requests
          </Link>
        </div>
      }
    >
      {/* Subheading */}
      <div className="mb-5">
        <p className="text-xs text-slate-500">
          Monitor waste collection activity, dispatch crews, and oversee live operations across EcoSaathi.
        </p>
      </div>

      {loading && <LoadingState message="Connecting to operations control center..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && (
        <div className="space-y-6">
          {/* 1. KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <StatCard
              icon={ClipboardList}
              label="Total Requests"
              value={stats?.total ?? requests.length}
              color="green"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats?.pending ?? requests.filter((r) => r.status === 'PENDING').length}
              color="amber"
            />
            <StatCard
              icon={TrendingUp}
              label="Assigned"
              value={stats?.assigned ?? requests.filter((r) => r.status === 'ASSIGNED').length}
              color="blue"
            />
            <StatCard
              icon={AlertCircle}
              label="In Progress"
              value={stats?.inProgress ?? requests.filter((r) => r.status === 'IN_PROGRESS').length}
              color="violet"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats?.completed ?? requests.filter((r) => r.status === 'COMPLETED').length}
              color="green"
            />
            <StatCard
              icon={Truck}
              label="Active Crews"
              value={activeCrewsCount}
              color="slate"
            />
          </div>

          {/* Pending Crew Verifications Card (Part E) */}
          {pendingCrewsCount > 0 && (
            <div className="card p-4 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">Pending Crew Verifications</h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      {pendingCrewsCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pendingCrewsCount === 1
                      ? '1 collection crew application is awaiting administrator verification.'
                      : `${pendingCrewsCount} collection crew applications are awaiting administrator verification.`}
                  </p>
                </div>
              </div>
              <Link
                to="/admin/crews?tab=verification"
                className="btn-primary text-xs py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
              >
                <span>Review Applications</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {/* 2. Operations Map & Alerts Main Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map Column (2 cols on desktop) */}
            <div className="lg:col-span-2 card p-5 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="section-title">Operations Map</h2>
                    <p className="text-[11px] text-slate-400">
                      Live spatial overview of pickup locations and fleet crews
                    </p>
                  </div>

                  {/* Compact Map Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Critical
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Low
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <span className="text-xs">🚛</span> Collection Crew
                    </span>
                  </div>
                </div>

                {/* Map Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
                    <Filter size={13} /> Filters:
                  </div>

                  {/* Status Filter */}
                  <select
                    value={mapStatusFilter}
                    onChange={(e) => setMapStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-green-500 outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={mapPriorityFilter}
                    onChange={(e) => setMapPriorityFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-green-500 outline-none"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>

                  {/* Waste Type Filter */}
                  <select
                    value={mapWasteFilter}
                    onChange={(e) => setMapWasteFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-green-500 outline-none"
                  >
                    <option value="ALL">All Waste Types</option>
                    <option value="plastic">Plastic</option>
                    <option value="organic">Organic</option>
                    <option value="paper">Paper</option>
                    <option value="e-waste">E-Waste</option>
                    <option value="construction">Construction</option>
                    <option value="mixed">Mixed</option>
                  </select>

                  <span className="text-[11px] text-slate-400 ml-auto">
                    Showing <strong>{filteredMapRequests.length}</strong> of {requests.length} requests
                  </span>
                </div>
              </div>

              {/* Route Overlay Notice */}
              {routeOverlayData && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2 text-emerald-950 font-medium">
                    <Navigation size={14} className="text-emerald-700" />
                    <span>
                      Smart Route Overlay for <strong>{routeOverlayData.crew?.name}</strong> ·{' '}
                      {routeOverlayData.totalStops} stops · {routeOverlayData.totalDistanceKm} km · ~
                      {routeOverlayData.estimatedDurationMinutes} min ({routeOverlayData.routingMode === 'road' ? 'Road Route' : 'Approximate'})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRouteCrewId(null);
                      setRouteOverlayData(null);
                    }}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline ml-2"
                  >
                    Hide Route
                  </button>
                </div>
              )}

              {/* Map Canvas */}
              <MapView
                requests={filteredMapRequests}
                crews={crews}
                startLocation={routeOverlayData?.startLocation || null}
                routePolyline={routeOverlayData?.polyline || []}
                routingMode={routeOverlayData?.routingMode || 'road'}
                height="440px"
                onAssignCrew={openAssignModal}
                viewDetailBase="/admin/requests"
              />
            </div>

            {/* Operations Alerts Column */}
            <div className="card p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h2 className="section-title">Operations Alerts</h2>
                    <p className="text-[11px] text-slate-400">Live operational notifications</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {operationsAlerts.length} Active
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 flex-1">
                {operationsAlerts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <CheckCircle2 size={24} className="mx-auto text-green-500 mb-2 opacity-80" />
                    Operations are running smoothly. No alerts at this time.
                  </div>
                ) : (
                  operationsAlerts.map((alert) => {
                    const isCrit = alert.type === 'critical';
                    const isWarn = alert.type === 'warning';
                    const isInfo = alert.type === 'info';

                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          isCrit
                            ? 'bg-red-50/60 border-red-200 text-red-950'
                            : isWarn
                            ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                            : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isCrit ? (
                            <ShieldAlert size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                          ) : isWarn ? (
                            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Info size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                  isCrit
                                    ? 'bg-red-200/60 text-red-800'
                                    : isWarn
                                    ? 'bg-amber-200/60 text-amber-800'
                                    : 'bg-emerald-200/60 text-emerald-800'
                                }`}
                              >
                                {alert.type}
                              </span>
                            </div>
                            <p className="font-bold mt-1 text-slate-900">{alert.title}</p>
                            <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                              {alert.message}
                            </p>

                            {alert.actionRequest && (
                              <button
                                onClick={() => openAssignModal(alert.actionRequest)}
                                className="mt-2 text-[11px] font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1"
                              >
                                Assign Crew Now →
                              </button>
                            )}
                            {alert.actionLink && (
                              <Link
                                to={alert.actionLink}
                                className="mt-2 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
                              >
                                {alert.actionLabel || 'Review →'}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 3. Priority Queue & Crew Workload Rows */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Priority Queue (2 cols) */}
            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="section-title">Priority Queue</h2>
                  <p className="text-[11px] text-slate-400">
                    High priority requests requiring attention & dispatch
                  </p>
                </div>
                <Link
                  to="/admin/requests"
                  className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center gap-1"
                >
                  All Requests <ArrowRight size={13} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Priority</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Waiting Time</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Location</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priorityQueue.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          <Link
                            to={`/admin/requests/${req._id}`}
                            className="font-bold text-slate-800 hover:text-green-700"
                          >
                            {shortId(req._id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium text-xs whitespace-nowrap">
                          {wasteTypeLabel(req.wasteType)}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge level={req.priorityLevel} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {formatWaitingTime(req.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[130px] truncate">
                          {req.location?.address || 'Mumbai'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {req.status === 'PENDING' ? (
                            <button
                              onClick={() => openAssignModal(req)}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
                            >
                              Assign Crew
                            </button>
                          ) : (
                            <Link
                              to={`/admin/requests/${req._id}`}
                              className="text-xs text-slate-600 hover:text-green-700 font-semibold"
                            >
                              View →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                    {priorityQueue.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                          No active pickup requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Crew Workload Status (1 col) */}
            <div className="card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <h2 className="section-title">Crew Workload</h2>
                    <p className="text-[11px] text-slate-400">Active capacity & vehicles</p>
                  </div>
                  <Link
                    to="/admin/crews"
                    className="text-xs text-green-700 hover:text-green-800 font-semibold"
                  >
                    Manage →
                  </Link>
                </div>

                <div className="space-y-3">
                  {crews.map((crew) => {
                    const activeCount = crew.assignedRequests?.length || 0;
                    const workload = getWorkloadBadge(activeCount);

                    return (
                      <div
                        key={crew._id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                            {crew.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 text-xs">{crew.name}</p>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  crew.status === 'AVAILABLE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : crew.status === 'BUSY'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {crew.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {crew.vehicleNumber || 'No vehicle'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${workload.colorClass}`}
                          >
                            {workload.level}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            <strong>{activeCount}</strong> active · <strong>{crew.completedRequests || 0}</strong> done
                          </p>
                          <button
                            type="button"
                            onClick={() => handleToggleCrewRoute(crew._id)}
                            disabled={loadingRouteCrewId === crew._id}
                            className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                              selectedRouteCrewId === crew._id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Navigation size={10} />
                            <span>
                              {loadingRouteCrewId === crew._id
                                ? 'Loading...'
                                : selectedRouteCrewId === crew._id
                                ? 'Hide Route'
                                : 'Show Route'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {crews.length === 0 && (
                    <p className="py-8 text-center text-xs text-slate-400">
                      No collection crews registered.
                    </p>
                  )}
                </div>
              </div>

              {/* Workload Legend */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>0-2: Light</span>
                <span>3-5: Moderate</span>
                <span>6+: High</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Crew Modal */}
      {isAssignModalOpen && selectedRequestForAssign && (
        <AssignCrewModal
          request={selectedRequestForAssign}
          crews={crews}
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedRequestForAssign(null);
          }}
          onSuccess={fetchData}
        />
      )}
    </DashboardLayout>
  );
}
