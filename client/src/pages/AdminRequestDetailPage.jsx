import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Zap,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import AssignCrewModal from '../components/modals/AssignCrewModal';
import { getRequest, getCrews } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  wasteTypeLabel,
  formatDateTime,
  formatDate,
  shortId,
  formatWaitingTime,
  getWorkloadBadge,
} from '../utils/helpers';

const TIMELINE_STEPS = [
  { key: 'PENDING', title: 'Request Submitted', desc: 'Pickup entered EcoSaathi system and calculated for priority.' },
  { key: 'ASSIGNED', title: 'Crew Assigned', desc: 'Assigned to a collection crew for scheduled pickup.' },
  { key: 'IN_PROGRESS', title: 'Collection In Progress', desc: 'Crew is active or en route at this location.' },
  { key: 'COMPLETED', title: 'Collection Completed', desc: 'Waste safely picked up and cleared from location.' },
];

export default function AdminRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [request, setRequest] = useState(null);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reqRes, crewRes] = await Promise.all([
        getRequest(id),
        getCrews(),
      ]);
      setRequest(reqRes.data.data);
      setCrews(crewRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'ASSIGNED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return -1;
    }
  };

  const currentStepIndex = request ? getStepIndex(request.status) : -1;
  const isCancelled = request?.status === 'CANCELLED';
  const isCompleted = request?.status === 'COMPLETED';
  const isInProgress = request?.status === 'IN_PROGRESS';
  const isPending = request?.status === 'PENDING';
  const isAssigned = request?.status === 'ASSIGNED';

  // Can assign if PENDING; can reassign if ASSIGNED (not in progress)
  const canAssign = isPending;
  const canReassign = isAssigned && !isInProgress;

  const assignedCrewObj =
    request?.assignedCrew && typeof request.assignedCrew === 'object'
      ? request.assignedCrew
      : crews.find((c) => c._id === request?.assignedCrew);

  const breakdown = request?.priorityBreakdown;

  return (
    <DashboardLayout
      role="admin"
      title="Request Operations Detail"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <Link
            to="/admin/requests"
            className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <ArrowLeft size={14} />
            <span>Back to Requests</span>
          </Link>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {loading && <LoadingState message="Loading request operations details..." />}
        {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

        {!loading && !error && request && (
          <>
            {/* Header Operations Card */}
            <div className="card p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4 border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {shortId(request._id)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    Requested on {formatDateTime(request.createdAt)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-medium">
                    Waiting: {formatWaitingTime(request.createdAt)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {wasteTypeLabel(request.wasteType)} Pickup
                </h2>
                <p className="text-xs text-slate-500 capitalize">
                  Estimated Quantity: <strong className="text-slate-700">{request.quantity}</strong> · Urgency:{' '}
                  <strong className="text-slate-700">{request.urgency}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge level={request.priorityLevel} score={request.priorityScore} />
                <StatusBadge status={request.status} />

                {canAssign && (
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="btn-primary text-xs py-1.5 px-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm ml-2"
                  >
                    Assign Crew
                  </button>
                )}

                {canReassign && (
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="btn-secondary text-xs py-1.5 px-3.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-bold rounded-lg shadow-xs ml-2"
                  >
                    Reassign Crew
                  </button>
                )}
              </div>
            </div>

            {/* In Progress Notice */}
            {isInProgress && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
                <Clock className="text-purple-600 flex-shrink-0" size={18} />
                <p className="text-xs text-purple-900">
                  <strong>Collection In Progress:</strong> Assigned crew is actively handling this pickup. Reassignment is locked to protect ongoing collection operations.
                </p>
              </div>
            )}

            {/* Completed Notice */}
            {isCompleted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={18} />
                <p className="text-xs text-emerald-900">
                  <strong>Pickup Completed:</strong> Waste has been collected and processed by{' '}
                  <strong>{assignedCrewObj?.name || 'the collection crew'}</strong>.
                </p>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Details & Priority Explanation (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Priority Explanation & Factor Breakdown Card */}
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      <h3 className="section-title">Priority Engine Analysis</h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Backend Source of Truth
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <div className="text-3xl font-extrabold text-slate-900">
                      {request.priorityScore ?? '—'}
                      <span className="text-sm font-semibold text-slate-400"> / 100</span>
                    </div>
                    <PriorityBadge level={request.priorityLevel} />
                  </div>

                  {/* Factor Breakdown */}
                  {breakdown && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Urgency Factor
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {breakdown.urgency?.weighted ?? breakdown.urgencyPoints ?? '—'} <span className="text-[10px] font-normal text-slate-400">pts</span>
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize">{request.urgency}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Quantity Factor
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {breakdown.quantity?.weighted ?? breakdown.quantityPoints ?? '—'} <span className="text-[10px] font-normal text-slate-400">pts</span>
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize">{request.quantity}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Waste Type
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {breakdown.wasteType?.weighted ?? breakdown.wasteTypePoints ?? '—'} <span className="text-[10px] font-normal text-slate-400">pts</span>
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize">{request.wasteType}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Waiting Time
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {breakdown.waitingTime?.weighted ?? breakdown.waitingPoints ?? '—'} <span className="text-[10px] font-normal text-slate-400">pts</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {breakdown.waitingTime?.raw ?? breakdown.hoursWaiting ?? 0}h elapsed
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 leading-relaxed bg-amber-50/50 border border-amber-200/50 rounded-xl p-3">
                    Calculated by the EcoSaathi Priority Engine based on urgency tier, estimated volume, material recyclability & decomposition risk, and cumulative elapsed waiting time.
                  </p>
                </div>

                {/* 2. Resident Details Card */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <User size={16} className="text-slate-500" />
                    <h3 className="section-title">Resident Information</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Name</span>
                      <p className="font-semibold text-slate-800 text-sm">
                        {request.resident?.name || 'Resident'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Email</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" />
                        {request.resident?.email || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Contact Phone</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        {request.resident?.phone || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Submitted On</span>
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  {request.description && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 block mb-1">Resident Description / Notes:</span>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {request.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Assigned Collection Crew */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-slate-500" />
                      <h3 className="section-title">Assigned Crew Status</h3>
                    </div>
                    {assignedCrewObj && (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {assignedCrewObj.status}
                      </span>
                    )}
                  </div>

                  {assignedCrewObj ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {assignedCrewObj.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{assignedCrewObj.name}</p>
                            <p className="text-xs text-slate-500 font-mono">
                              Vehicle: <strong className="text-slate-700">{assignedCrewObj.vehicleNumber || 'MH01AB1001'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          {(() => {
                            const badge = getWorkloadBadge(assignedCrewObj.assignedRequests?.length || 0);
                            return (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.colorClass}`}>
                                {badge.level} ({assignedCrewObj.assignedRequests?.length || 0} active)
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {canReassign && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-bold underline"
                          >
                            Reassign to a different crew →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center">
                      <p className="text-xs font-bold text-slate-700">No collection crew assigned yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                        This request is pending dispatch. Review available crews and assign.
                      </p>
                      <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="btn-primary text-xs py-1.5 px-4 font-bold"
                      >
                        Assign Collection Crew
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Leaflet Map & Timeline (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. Map Location Card */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="section-title">Geographic Location</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {request.location?.latitude?.toFixed(4)}, {request.location?.longitude?.toFixed(4)}
                    </span>
                  </div>

                  <MapView
                    requests={[request]}
                    crews={assignedCrewObj ? [assignedCrewObj] : []}
                    height="260px"
                    center={
                      request.location?.latitude && request.location?.longitude
                        ? [request.location.latitude, request.location.longitude]
                        : undefined
                    }
                    zoom={14}
                  />

                  <div className="text-xs text-slate-600 flex items-start gap-2 pt-1">
                    <MapPin size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {request.location?.address || 'Pickup Point'}
                      </p>
                      {assignedCrewObj?.currentLocation && (
                        <p className="text-[11px] text-blue-600 mt-1 font-medium">
                          🚛 Crew vehicle is stationed at {assignedCrewObj.name} location
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Status Progression Timeline */}
                <div className="card p-5 space-y-4">
                  <h3 className="section-title">Status Progression</h3>

                  {!isCancelled ? (
                    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const isDone = currentStepIndex > idx;
                        const isCurrent = currentStepIndex === idx;

                        return (
                          <div key={step.key} className="relative flex items-start gap-3">
                            <div
                              className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isDone
                                  ? 'bg-green-600 border-green-600 text-white'
                                  : isCurrent
                                  ? 'bg-white border-green-600 ring-4 ring-green-100 text-green-600'
                                  : 'bg-white border-slate-300 text-transparent'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 size={12} className="stroke-[3]" />
                              ) : isCurrent ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                              ) : null}
                            </div>

                            <div>
                              <p
                                className={`text-xs font-bold ${
                                  isCurrent
                                    ? 'text-green-700'
                                    : isDone
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                      This pickup request has been cancelled.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Assign / Reassign Crew Modal */}
      {isAssignModalOpen && request && (
        <AssignCrewModal
          request={request}
          crews={crews}
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={fetchData}
        />
      )}
    </DashboardLayout>
  );
}
