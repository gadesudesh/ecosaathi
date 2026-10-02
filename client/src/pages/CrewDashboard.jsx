import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/cards/StatCard';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import { getMyCrewRequests, updateMyCrewStatus } from '../services/api';
import {
  wasteTypeLabel,
  formatDateTime,
  shortId,
  calculateDistanceKm,
  priorityAccentClass,
  sortCrewPickups,
} from '../utils/helpers';
import usePageTitle from '../utils/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function CrewDashboard() {
  usePageTitle('Crew Dashboard');
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [crew, setCrew] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Single efficient call to fetch crew and requests
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyCrewRequests();
      const payload = res.data?.data || res.data || [];
      const crewInfo = res.data?.crew || null;

      setCrew(crewInfo);
      setRequests(sortCrewPickups(payload));
    } catch (err) {
      setError(err.message || 'Failed to load collection crew tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update crew status (AVAILABLE, BUSY, OFFLINE)
  const handleStatusChange = async (newStatus) => {
    if (crew?.status === newStatus || updatingStatus) return;

    // Frontend guard: cannot set to AVAILABLE if any task is IN_PROGRESS
    const hasInProgress = requests.some((r) => r.status === 'IN_PROGRESS');
    if (newStatus === 'AVAILABLE' && hasInProgress) {
      addToast('Cannot set status to Available while a collection is In Progress.', 'warning');
      return;
    }

    try {
      setUpdatingStatus(true);
      const res = await updateMyCrewStatus(newStatus);
      const updatedCrew = res.data?.data || res.data;
      setCrew((prev) => ({ ...prev, status: updatedCrew.status || newStatus }));
      addToast(`Crew status updated to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update crew status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // KPIs calculation from single response
  const assignedCount = requests.filter((r) => r.status === 'ASSIGNED').length;
  const inProgressReq = requests.find((r) => r.status === 'IN_PROGRESS');
  const inProgressCount = inProgressReq ? 1 : 0;
  const completedCount =
    (crew?.completedRequests ?? 0) ||
    requests.filter((r) => r.status === 'COMPLETED').length;
  const highPriorityCount = requests.filter(
    (r) =>
      ['CRITICAL', 'HIGH'].includes(r.priorityLevel?.toUpperCase()) &&
      ['ASSIGNED', 'IN_PROGRESS'].includes(r.status)
  ).length;

  // Next pickup is the top ASSIGNED request if no IN_PROGRESS task
  const nextAssignedReq = requests.find((r) => r.status === 'ASSIGNED');
  const primaryTask = inProgressReq || nextAssignedReq || null;

  // Active requests for map stops
  const activeRequests = requests.filter((r) =>
    ['ASSIGNED', 'IN_PROGRESS'].includes(r.status)
  );

  const effectiveVerificationStatus =
    crew?.verificationStatus || user?.crewProfile?.verificationStatus || 'APPROVED';

  // ── Pending Verification Screen ──
  if (!loading && effectiveVerificationStatus === 'PENDING_VERIFICATION') {
    return (
      <DashboardLayout role="crew" title="Verification Status">
        <div className="max-w-2xl mx-auto my-8">
          <div className="card p-8 text-center border border-amber-200 bg-white shadow-sm rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
              <Clock size={32} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
              Verification Pending
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Verification Pending
            </h2>
            <p className="text-slate-700 font-medium mb-1">
              Your EcoSaathi collection crew account is awaiting administrator approval.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Once verified, you'll be able to receive and manage collection assignments.
            </p>

            {/* Crew summary details */}
            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 text-xs space-y-2 mb-6 max-w-md mx-auto">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-semibold text-slate-800">{user?.name || crew?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-800">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-800">{crew?.phone || user?.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Vehicle Number:</span>
                <span className="font-mono font-semibold text-slate-800">{crew?.vehicleNumber || user?.crewProfile?.vehicleNumber || '—'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2.5 px-4"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Check Status</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
                className="btn-primary text-xs py-2.5 px-5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Rejected Screen ──
  if (!loading && effectiveVerificationStatus === 'REJECTED') {
    return (
      <DashboardLayout role="crew" title="Verification Status">
        <div className="max-w-2xl mx-auto my-8">
          <div className="card p-8 text-center border border-red-200 bg-white shadow-sm rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-xs">
              <AlertTriangle size={32} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 mb-3">
              Application Not Approved
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Application Not Approved
            </h2>
            <p className="text-slate-700 font-medium mb-4">
              Your application to join the EcoSaathi collection fleet could not be approved at this time.
            </p>

            {(crew?.rejectionReason || user?.crewProfile?.rejectionReason) && (
              <div className="bg-red-50/50 rounded-xl p-4 text-left border border-red-100 text-xs mb-6 max-w-md mx-auto">
                <span className="font-bold text-red-800 block mb-1">Reason provided:</span>
                <p className="text-red-700">{crew?.rejectionReason || user?.crewProfile?.rejectionReason}</p>
              </div>
            )}

            <button
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="btn-primary text-xs py-2.5 px-5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="crew" title="Collection Crew Operations">
      {/* ── Top Header Greeting ── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Good morning, {user?.name || crew?.name || 'Crew Member'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here are your waste collection tasks for today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="Refresh tasks"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/crew/route"
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm"
          >
            <Navigation size={14} />
            <span>Open Collection Map</span>
          </Link>
        </div>
      </div>

      {/* ── Crew Profile & Operational Status Card ── */}
      {crew && (
        <div className="mb-6 card p-4 md:p-5 bg-gradient-to-r from-emerald-50/60 via-white to-slate-50 border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-sm">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">{crew.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {crew.vehicleNumber || 'Vehicle Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Completed Total: <span className="font-semibold text-slate-700">{completedCount} pickups</span>
                {crew.currentLocation?.latitude && (
                  <span className="ml-2 text-slate-400">
                    · GPS: {crew.currentLocation.latitude.toFixed(3)}, {crew.currentLocation.longitude.toFixed(3)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 px-2">Status:</span>
            {['AVAILABLE', 'BUSY', 'OFFLINE'].map((st) => {
              const active = crew.status === st;
              let activeClass = 'bg-slate-100 text-slate-700 font-bold';
              if (active) {
                if (st === 'AVAILABLE') activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                if (st === 'BUSY') activeClass = 'bg-amber-500 text-white font-bold shadow-xs';
                if (st === 'OFFLINE') activeClass = 'bg-slate-600 text-white font-bold shadow-xs';
              }
              return (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={updatingStatus}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${activeClass} ${
                    !active ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-50' : ''
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading && <LoadingState message="Loading today's collection tasks..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={ClipboardList}
              label="Assigned Pickups"
              value={assignedCount}
              color="green"
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={inProgressCount}
              color="amber"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedCount}
              color="blue"
            />
            <StatCard
              icon={AlertTriangle}
              label="High Priority"
              value={highPriorityCount}
              color="rose"
            />
          </div>

          {/* ── Primary Highlight Card: Current Collection OR Next Pickup ── */}
          {primaryTask ? (
            <div
              className={`card p-5 mb-6 border shadow-sm transition-all ${
                inProgressReq
                  ? 'border-amber-300 bg-amber-50/25 ring-2 ring-amber-400/20'
                  : 'border-slate-200 hover:border-green-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      inProgressReq
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {inProgressReq ? 'Current Collection In Progress' : 'Next Pickup in Queue'}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {shortId(primaryTask._id)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <PriorityBadge
                    level={primaryTask.priorityLevel}
                    score={primaryTask.priorityScore}
                  />
                  <StatusBadge status={primaryTask.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-400">Waste Material & Quantity</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {wasteTypeLabel(primaryTask.wasteType)}
                  </p>
                  <p className="text-xs text-slate-600 capitalize">
                    Quantity: <span className="font-semibold">{primaryTask.quantity}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Pickup Location</p>
                  <div className="flex items-start gap-1.5 mt-0.5">
                    <MapPin size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                        {primaryTask.location?.address || 'Mumbai pickup location'}
                      </p>
                      {crew?.currentLocation && primaryTask.location && (
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          📍 {calculateDistanceKm(crew.currentLocation, primaryTask.location)} km away
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Requested By</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {primaryTask.resident?.name || 'Resident'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(primaryTask.createdAt)}
                  </p>
                </div>
              </div>

              {primaryTask.description && (
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 mb-4 border border-slate-100">
                  <span className="font-semibold text-slate-700">Resident Note: </span>
                  {primaryTask.description}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Link
                  to={`/crew/requests/${primaryTask._id}`}
                  className="btn-primary flex items-center gap-2 py-2 px-5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  <span>{inProgressReq ? 'View Current Pickup' : 'View Pickup Details'}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="card p-8 mb-6 text-center border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">You're all caught up!</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                There are no active collection requests assigned to you at the moment.
              </p>
            </div>
          )}

          {/* ── Active Route Map Preview ── */}
          {activeRequests.length > 0 && (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Today's Active Stops Map</h2>
                  <p className="text-xs text-slate-500">
                    Showing crew vehicle position and {activeRequests.length} active collection locations.
                  </p>
                </div>
                <Link to="/crew/route" className="text-xs font-semibold text-green-700 hover:underline">
                  Full View →
                </Link>
              </div>
              <MapView
                requests={activeRequests}
                crewLocation={crew}
                height="320px"
                numbered={true}
              />
            </div>
          )}

          {/* ── Today's Pickups Table / Cards ── */}
          <div className="card">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Today's Pickups</h2>
                <p className="text-xs text-slate-400">
                  Priority-ordered collection queue ({requests.length} total)
                </p>
              </div>
              <Link
                to="/crew/requests"
                className="text-xs font-semibold text-green-700 hover:underline"
              >
                View All Pickups →
              </Link>
            </div>

            {requests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                message="No collection requests found."
                description="Assigned requests will appear here as they are queued."
              />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 text-xs font-semibold">
                        <th className="text-left px-5 py-3">Stop</th>
                        <th className="text-left px-5 py-3">ID</th>
                        <th className="text-left px-5 py-3">Waste Type</th>
                        <th className="text-left px-5 py-3">Quantity</th>
                        <th className="text-left px-5 py-3">Priority</th>
                        <th className="text-left px-5 py-3">Location & Distance</th>
                        <th className="text-left px-5 py-3">Status</th>
                        <th className="text-right px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.slice(0, 6).map((req, idx) => {
                        const dist = crew?.currentLocation && req.location
                          ? calculateDistanceKm(crew.currentLocation, req.location)
                          : null;

                        return (
                          <tr
                            key={req._id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              req.status === 'IN_PROGRESS' ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="px-5 py-3.5 font-bold text-xs text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                              {shortId(req._id)}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-900">
                              {wasteTypeLabel(req.wasteType)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 capitalize">
                              {req.quantity}
                            </td>
                            <td className="px-5 py-3.5">
                              <PriorityBadge level={req.priorityLevel} score={req.priorityScore} />
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-xs font-medium text-slate-800 max-w-[200px] truncate">
                                {req.location?.address || 'Mumbai'}
                              </p>
                              {dist && (
                                <p className="text-[11px] text-green-700 font-semibold">
                                  {dist} km away
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={req.status} />
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Link
                                to={`/crew/requests/${req._id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800 hover:underline"
                              >
                                <span>{req.status === 'IN_PROGRESS' ? 'Open' : 'View'}</span>
                                <ArrowRight size={13} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {requests.slice(0, 6).map((req, idx) => {
                    const dist = crew?.currentLocation && req.location
                      ? calculateDistanceKm(crew.currentLocation, req.location)
                      : null;

                    return (
                      <div
                        key={req._id}
                        className={`p-4 space-y-2.5 ${
                          req.status === 'IN_PROGRESS' ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-600">
                              {shortId(req._id)}
                            </span>
                          </div>
                          <StatusBadge status={req.status} />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {wasteTypeLabel(req.wasteType)}
                          </span>
                          <PriorityBadge level={req.priorityLevel} score={req.priorityScore} />
                        </div>

                        <div className="text-xs text-slate-500">
                          <p className="truncate">📍 {req.location?.address || 'Mumbai'}</p>
                          {dist && (
                            <p className="text-green-700 font-semibold mt-0.5">
                              {dist} km away
                            </p>
                          )}
                        </div>

                        <div className="pt-1 flex justify-end">
                          <Link
                            to={`/crew/requests/${req._id}`}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <span>Manage Pickup</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
