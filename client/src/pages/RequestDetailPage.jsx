import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Truck, Clock, CheckCircle2,
  AlertCircle, XCircle, Ban, ShieldAlert, Sparkles, Loader2,
  Phone, MessageCircle
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState } from '../components/ui/States';
import MapPicker from '../components/maps/MapPicker';
import { getRequest, cancelRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePageTitle } from '../utils/usePageTitle';
import {
  wasteTypeLabel, formatDateTime, formatDate, shortId, normalizePhoneNumber
} from '../utils/helpers';

const TIMELINE_STEPS = [
  { key: 'PENDING',     title: 'Request Submitted',       desc: 'Your request is in the collection queue' },
  { key: 'ASSIGNED',    title: 'Crew Assigned',           desc: 'A collection crew has been assigned to your pickup' },
  { key: 'IN_PROGRESS', title: 'Collection In Progress',  desc: 'Crew is en route or active at your location' },
  { key: 'COMPLETED',   title: 'Collection Completed',    desc: 'Waste has been successfully collected' },
];

export default function RequestDetailPage() {
  usePageTitle('Request Details');
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      const res = await getRequest(id);
      setRequest(res.data.data);
    } catch (err) {
      const msg = err.message || 'Failed to load request';
      setError(msg);
      if (msg.includes('403') || msg.toLowerCase().includes('permission')) {
        setErrorCode(403);
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setErrorCode(404);
      } else if (msg.includes('401')) {
        setErrorCode(401);
      } else {
        setErrorCode(500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleCancelRequest = async () => {
    try {
      setCancelling(true);
      const res = await cancelRequest(id);
      if (res.data?.success) {
        addToast('Pickup request cancelled successfully.', 'success');
        setRequest(res.data.data);
        setShowCancelModal(false);
      }
    } catch (err) {
      addToast(err.message || 'Failed to cancel request', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Determine current timeline active step index
  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING':     return 0;
      case 'ASSIGNED':    return 1;
      case 'IN_PROGRESS': return 2;
      case 'COMPLETED':   return 3;
      default:            return -1;
    }
  };

  const currentStepIndex = request ? getStepIndex(request.status) : -1;
  const isCancelled = request?.status === 'CANCELLED';
  const isCompleted = request?.status === 'COMPLETED';
  const canCancel = request && ['PENDING', 'ASSIGNED'].includes(request.status);

  const getPriorityExplanation = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'Your request was assigned CRITICAL priority due to immediate safety, environmental hazard, or severe overflow.';
      case 'HIGH':
        return 'Your request received a high priority because of its urgency, waste quantity and waiting time.';
      case 'MEDIUM':
        return 'Your request received standard priority and is scheduled for routine neighborhood collection.';
      default:
        return 'Your request received standard low priority for non-hazardous recyclable or minor volume pickup.';
    }
  };

  return (
    <DashboardLayout
      role="resident"
      title="Request Details"
      actions={
        <Link
          to="/resident/requests"
          className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
        >
          <ArrowLeft size={14} />
          <span>Back to Requests</span>
        </Link>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {loading && <LoadingState message="Loading pickup request details..." />}

        {/* Error Handling */}
        {!loading && error && (
          <div className="card p-8 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {errorCode === 403
                  ? "You don't have permission to access this request."
                  : errorCode === 404
                  ? "We couldn't find this pickup request."
                  : errorCode === 401
                  ? 'Your session has expired. Please sign in again.'
                  : 'Something went wrong. Please try again.'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link to="/resident/requests" className="btn-secondary text-xs py-2 px-4 rounded-xl">
                My Requests
              </Link>
              <button onClick={fetchRequest} className="btn-primary text-xs py-2 px-4 rounded-xl">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Request Details View */}
        {!loading && !error && request && (
          <>
            {/* Header Banner */}
            <div className="card p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4 border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {shortId(request._id)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    Requested on {formatDateTime(request.createdAt)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {wasteTypeLabel(request.wasteType)}
                </h2>
                <p className="text-xs text-slate-500 capitalize">
                  Estimated Quantity: <strong className="text-slate-700">{request.quantity}</strong> · Urgency:{' '}
                  <strong className="text-slate-700">{request.urgency}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge level={request.priorityLevel} score={request.priorityScore} />
                <StatusBadge status={request.status} />
              </div>
            </div>

            {/* Completed Success Banner */}
            {isCompleted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">✓ Pickup Completed</h3>
                  <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                    Your waste has been successfully collected by our field team. Thank you for contributing to a cleaner community!
                  </p>
                  {request.updatedAt && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Completed at: {formatDateTime(request.updatedAt)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cancelled Banner */}
            {isCancelled && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950">Pickup Request Cancelled</h3>
                  <p className="text-xs sm:text-sm text-rose-800 mt-0.5">
                    This request was cancelled and has been removed from collection crew dispatches.
                  </p>
                </div>
              </div>
            )}

            {/* Two-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Status Timeline & Actions (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Visual Status Timeline */}
                <div className="card p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="section-title">Collection Timeline</h3>
                    <span className="text-xs font-semibold text-slate-400">
                      Current Status: <strong className="text-slate-700">{request.status}</strong>
                    </span>
                  </div>

                  {!isCancelled ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const isDone = currentStepIndex > idx;
                        const isCurrent = currentStepIndex === idx;

                        return (
                          <div key={step.key} className="relative flex items-start gap-4">
                            {/* Marker Node */}
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

                            {/* Step Description */}
                            <div className="space-y-0.5">
                              <p
                                className={`text-sm font-bold ${
                                  isCurrent
                                    ? 'text-green-700 font-extrabold'
                                    : isDone
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      Timeline inactive because this request was cancelled.
                    </div>
                  )}
                </div>

                {/* Assigned Crew Card with Contact Capabilities */}
                <div className="card p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="section-title">Your Collection Crew</h3>
                    {request.assignedCrew && (
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        request.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : request.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {request.status === 'IN_PROGRESS'
                          ? 'Collection In Progress'
                          : request.status === 'COMPLETED'
                          ? 'Pickup Completed'
                          : 'Assigned for Pickup'}
                      </span>
                    )}
                  </div>

                  {request.assignedCrew ? (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">
                            <Truck size={24} />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900">
                              {request.assignedCrew.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Vehicle:{' '}
                              <strong className="text-slate-700 font-mono font-bold">
                                {request.assignedCrew.vehicleNumber || 'Standard Van'}
                              </strong>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Status:{' '}
                              <span className="font-semibold text-slate-700">
                                {request.status === 'IN_PROGRESS'
                                  ? 'On the way / Collection in progress'
                                  : request.status === 'COMPLETED'
                                  ? 'Pickup completed'
                                  : 'Assigned for pickup'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Crew Actions (Only active when ASSIGNED or IN_PROGRESS) */}
                      {(request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS') && (
                        (() => {
                          const crewPhoneInfo = normalizePhoneNumber(request.assignedCrew.phone);
                          if (crewPhoneInfo) {
                            const displayCode = request.requestId || shortId(request._id);
                            const prefilledMessage = `Hello, I'm contacting you regarding my EcoSaathi pickup request #${displayCode}.`;
                            return (
                              <div className="pt-1">
                                <p className="text-[11px] text-slate-500 mb-2 font-medium">
                                  Coordinate with your assigned collection crew:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <a
                                    href={crewPhoneInfo.telUri}
                                    className="btn-secondary py-2.5 px-4 text-xs font-bold text-slate-800 hover:text-green-700 hover:border-green-300 flex items-center justify-center gap-2 rounded-xl border-slate-200 transition-all shadow-xs"
                                  >
                                    <Phone size={15} className="text-green-600" />
                                    <span>Call Crew</span>
                                  </a>

                                  <a
                                    href={crewPhoneInfo.getWhatsAppUrl(prefilledMessage)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2.5 px-4 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 flex items-center justify-center gap-2 rounded-xl transition-all shadow-xs"
                                  >
                                    <MessageCircle size={15} className="text-emerald-700" />
                                    <span>Message on WhatsApp</span>
                                  </a>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                                Contact information is currently unavailable.
                              </div>
                            );
                          }
                        })()
                      )}

                      {request.status === 'COMPLETED' && (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center font-medium">
                          Pickup completed.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-5 text-center">
                      <p className="text-xs font-bold text-slate-700">
                        A collection crew will be assigned soon.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        EcoSaathi dispatchers prioritize pickups dynamically. Once assigned, you can contact the crew directly.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cancel Request Action (if eligible) */}
                {canCancel && (
                  <div className="card p-5 border-red-100 bg-red-50/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Need to cancel this pickup?</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        You can cancel as long as collection is not in progress.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="btn-secondary text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-semibold py-1.5 px-3.5 flex-shrink-0"
                    >
                      <Ban size={13} className="mr-1 inline" />
                      Cancel Request
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Request Summary, Priority & Map (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Priority Breakdown Card */}
                <div className="card p-5 space-y-3 bg-gradient-to-br from-white to-green-50/20">
                  <div className="flex items-center justify-between">
                    <span className="section-title">Priority Assessment</span>
                    <PriorityBadge level={request.priorityLevel} score={request.priorityScore} />
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {request.priorityScore ?? '—'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ 100 Priority Score</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                    {getPriorityExplanation(request.priorityLevel)}
                  </p>
                </div>

                {/* Request Details Info */}
                <div className="card p-5 space-y-3">
                  <h3 className="section-title">Request Summary</h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Waste Type</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {wasteTypeLabel(request.wasteType)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Quantity</span>
                      <span className="font-semibold text-slate-800 capitalize">{request.quantity}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Urgency</span>
                      <span className="font-semibold text-slate-800 capitalize">{request.urgency}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Created Date</span>
                      <span className="font-semibold text-slate-800">
                        {formatDateTime(request.createdAt)}
                      </span>
                    </div>
                    {request.description && (
                      <div className="py-2 space-y-1">
                        <span className="text-slate-400 block">Notes / Description:</span>
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                          {request.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Read-Only Location Map */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="section-title">Pickup Location</h3>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Read Only</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                    <MapPicker
                      value={
                        request.location?.latitude && request.location?.longitude
                          ? { lat: request.location.latitude, lng: request.location.longitude }
                          : null
                      }
                      height="220px"
                      readonly={true}
                    />
                  </div>

                  <div className="text-xs text-slate-600 flex items-start gap-2 pt-1">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {request.location?.address || 'Pickup Point'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {request.location?.latitude?.toFixed(6)}, {request.location?.longitude?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Cancel This Pickup Request?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel request{' '}
                <strong className="text-slate-700">{shortId(request._id)}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                This will remove the request from the collection schedule.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className="btn-secondary w-full py-2 text-xs font-semibold"
              >
                No, Keep Request
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelRequest}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
