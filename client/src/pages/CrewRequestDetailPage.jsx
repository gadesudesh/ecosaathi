import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Play,
  Check,
  User,
  Phone,
  FileText,
  Navigation,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import {
  getRequest,
  updateRequestStatus,
  getMyCrewRequests,
} from '../services/api';
import {
  wasteTypeLabel,
  formatDateTime,
  shortId,
  calculateDistanceKm,
  normalizePhoneNumber,
} from '../utils/helpers';
import usePageTitle from '../utils/usePageTitle';
import { useToast } from '../context/ToastContext';

// Visual 4-stage Status Timeline
function CrewStatusTimeline({ status }) {
  const steps = [
    { label: 'Request Submitted', key: 'PENDING' },
    { label: 'Crew Assigned', key: 'ASSIGNED' },
    { label: 'Collection In Progress', key: 'IN_PROGRESS' },
    { label: 'Collection Completed', key: 'COMPLETED' },
  ];

  const getStepIndex = (s) => {
    switch (s?.toUpperCase()) {
      case 'PENDING':
        return 0;
      case 'ASSIGNED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="py-4 px-2">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.key}
              className="flex items-center sm:flex-col sm:items-center gap-3 sm:gap-2 flex-1"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all z-10 ${
                  isDone
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-green-600 text-white ring-4 ring-green-100 scale-110 shadow-md'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isDone ? (
                  <Check size={16} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              <div className="sm:text-center">
                <p
                  className={`text-xs font-semibold ${
                    isCurrent
                      ? 'text-green-800'
                      : isDone
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block">
                    Current Stage
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CrewRequestDetailPage() {
  const { id } = useParams();
  usePageTitle('Pickup Task Details');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [request, setRequest] = useState(null);
  const [crew, setCrew] = useState(null);
  const [allAssigned, setAllAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch request details
      const [reqRes, crewRes] = await Promise.all([
        getRequest(id),
        getMyCrewRequests().catch(() => ({ data: { crew: null, data: [] } })),
      ]);

      const reqData = reqRes.data?.data || reqRes.data;
      setRequest(reqData);

      const crewInfo = crewRes.data?.crew || null;
      setCrew(crewInfo);
      setAllAssigned(crewRes.data?.data || []);
    } catch (err) {
      if (err.message?.includes('403') || err.message?.includes('authorized')) {
        setError("403: You don't have permission to manage this pickup request.");
      } else if (err.message?.includes('404')) {
        setError("404: We couldn't find this pickup request.");
      } else {
        setError(err.message || 'Failed to load pickup request details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Start Collection: ASSIGNED -> IN_PROGRESS
  const handleStartCollection = async () => {
    try {
      setActionLoading(true);
      const res = await updateRequestStatus(id, 'IN_PROGRESS');
      const updated = res.data?.data || res.data;
      setRequest((prev) => ({ ...prev, status: 'IN_PROGRESS' }));
      addToast('Collection started! Status changed to IN_PROGRESS.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to start collection.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Pickup: IN_PROGRESS -> COMPLETED
  const handleCompletePickup = async () => {
    try {
      setActionLoading(true);
      const res = await updateRequestStatus(id, 'COMPLETED');
      const updated = res.data?.data || res.data;
      setRequest((prev) => ({ ...prev, status: 'COMPLETED' }));
      setShowCompleteModal(false);
      addToast('Pickup completed successfully! Great work.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to complete pickup.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Find next assigned request in queue
  const nextPickup = allAssigned.find(
    (r) => r._id !== id && ['ASSIGNED', 'IN_PROGRESS'].includes(r.status)
  );

  const distKm =
    crew?.currentLocation && request?.location
      ? calculateDistanceKm(crew.currentLocation, request.location)
      : null;

  return (
    <DashboardLayout role="crew" title="Pickup Details">
      {/* ── Top Bar ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/crew/requests"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Pickup {shortId(id)}
              </h1>
              {request && <StatusBadge status={request.status} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              EcoSaathi Collection Task Management
            </p>
          </div>
        </div>

        {request && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <PriorityBadge
              level={request.priorityLevel}
              score={request.priorityScore}
            />
          </div>
        )}
      </div>

      {loading && <LoadingState message="Loading pickup details..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchDetails} />}

      {!loading && !error && request && (
        <div className="space-y-6">
          {/* ── Status Timeline Card ── */}
          <div className="card p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Collection Stage
            </h2>
            <CrewStatusTimeline status={request.status} />
          </div>

          {/* ── Completed Success State Banner ── */}
          {request.status === 'COMPLETED' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-950">
                    Pickup Completed
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Great work! Waste has been collected from {request.location?.address || 'the requested location'}.
                  </p>
                </div>
              </div>

              {nextPickup ? (
                <Link
                  to={`/crew/requests/${nextPickup._id}`}
                  className="btn-primary py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm text-xs self-start md:self-auto"
                >
                  <span>Go to Next Pickup ({shortId(nextPickup._id)})</span>
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <Link
                  to="/crew"
                  className="btn-secondary py-2.5 px-4 text-xs font-semibold rounded-lg self-start md:self-auto"
                >
                  Back to Dashboard
                </Link>
              )}
            </div>
          )}

          {/* ── Main Two-Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Map */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pickup Location & Interactive Map */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Pickup Location & Navigation
                    </h2>
                    <p className="text-xs text-slate-500">
                      {request.location?.address || 'Mumbai pickup coordinates'}
                    </p>
                  </div>
                  {distKm && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      📍 {distKm} km away from crew
                    </span>
                  )}
                </div>

                <MapView
                  requests={[request]}
                  crewLocation={crew}
                  height="340px"
                  zoom={14}
                />

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">GPS Coordinates: </span>
                    <span className="font-mono">
                      {request.location?.latitude?.toFixed(4)}, {request.location?.longitude?.toFixed(4)}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    🟢 Crew Marker · 📍 Pickup Marker
                  </span>
                </div>
              </div>

              {/* Waste & Request Details */}
              <div className="card p-5">
                <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                  Pickup Specifications
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Waste Material</p>
                    <p className="font-bold text-slate-900 text-base mt-0.5">
                      {wasteTypeLabel(request.wasteType)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Estimated Quantity</p>
                    <p className="font-bold text-slate-800 capitalize mt-0.5">
                      {request.quantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Urgency Level</p>
                    <p className="font-bold text-slate-800 capitalize mt-0.5">
                      {request.urgency}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Priority Score</p>
                    <p className="font-bold text-emerald-700 mt-0.5">
                      {request.priorityScore}/100 ({request.priorityLevel})
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Request Date</p>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {formatDateTime(request.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Current Status</p>
                    <p className="font-bold text-slate-800 mt-0.5 uppercase">
                      {request.status}
                    </p>
                  </div>
                </div>

                {request.description && (
                  <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FileText size={14} />
                      <span>Resident Instructions / Notes</span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      "{request.description}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Resident Contact & Action Control Panel */}
            <div className="space-y-6">
              {/* Resident Contact Info */}
              <div className="card p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <User size={16} className="text-green-600" />
                  <span>Resident Contact</span>
                </h2>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-slate-400">Name</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {request.resident?.name || 'Resident Member'}
                    </p>
                  </div>

                  {request.resident?.phone && (
                    <div>
                      <p className="text-slate-400">Phone</p>
                      <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                        <Phone size={13} className="text-slate-400" />
                        <span>{request.resident.phone}</span>
                      </p>
                      {(() => {
                        const resPhoneInfo = normalizePhoneNumber(request.resident.phone);
                        if (!resPhoneInfo) return null;
                        return (
                          <div className="pt-2">
                            <a
                              href={resPhoneInfo.telUri}
                              className="btn-secondary w-full py-2 px-3 text-xs font-bold text-slate-800 hover:text-green-700 hover:border-green-300 flex items-center justify-center gap-1.5 rounded-xl border-slate-200 transition-all shadow-xs"
                            >
                              <Phone size={13} className="text-green-600" />
                              <span>Call Resident</span>
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {request.resident?.address && (
                    <div>
                      <p className="text-slate-400">Address</p>
                      <p className="font-medium text-slate-700 mt-0.5">
                        {request.resident.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Crew Action Controls */}
              <div className="card p-5 border-2 border-green-100 bg-green-50/20">
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  Operational Controls
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Manage the pickup lifecycle according to on-ground collection progress.
                </p>

                {request.status === 'ASSIGNED' && (
                  <button
                    onClick={handleStartCollection}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Play size={16} />
                    <span>{actionLoading ? 'Starting...' : 'Start Collection'}</span>
                  </button>
                )}

                {request.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm animate-pulse"
                  >
                    <CheckCircle2 size={18} />
                    <span>Complete Pickup</span>
                  </button>
                )}

                {request.status === 'COMPLETED' && (
                  <div className="text-center py-2 text-xs font-semibold text-emerald-800 bg-emerald-100/60 rounded-lg p-2.5">
                    ✓ Task completed and recorded in EcoSaathi.
                  </div>
                )}

                {request.status === 'CANCELLED' && (
                  <div className="text-center py-2 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg p-2.5">
                    This pickup request was cancelled.
                  </div>
                )}
              </div>

              {/* Priority Explanation Card */}
              <div className="card p-4 bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Priority Assessment</span>
                </p>
                <p className="text-xs text-slate-600">
                  Priority level is evaluated using urgency, waste quantity, waiting time, and waste category to optimize municipal route safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal Before Completing ── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Complete this pickup?
                </h3>
                <p className="text-xs text-slate-500">
                  Request {shortId(id)} · {wasteTypeLabel(request?.wasteType)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that the waste has been collected from the requested location.
              This will notify the resident and mark this collection as completed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={actionLoading}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompletePickup}
                disabled={actionLoading}
                className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
              >
                {actionLoading ? 'Marking Complete...' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
