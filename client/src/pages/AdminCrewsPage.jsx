import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Plus,
  AlertTriangle,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Hash,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  CrewStatusBadge,
  PriorityBadge,
  StatusBadge,
  VerificationStatusBadge,
} from '../components/ui/Badges';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import { getCrews, getRequests, getCrewRoute, verifyCrew, createCrew } from '../services/api';
import {
  wasteTypeLabel,
  shortId,
  getWorkloadBadge,
  formatDate,
  formatDateTime,
} from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import usePageTitle from '../utils/usePageTitle';

export default function AdminCrewsPage() {
  usePageTitle('Collection Crews & Verification');
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [crews, setCrews] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab State: 'active' | 'verification' | 'rejected'
  const initialTab = searchParams.get('tab') === 'verification' ? 'verification' : 'active';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Synchronize tab changes to search params
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'verification') {
      setSearchParams({ tab: 'verification' });
    } else {
      setSearchParams({});
    }
  };

  // Selected Crew for Details Modal
  const [selectedCrew, setSelectedCrew] = useState(null);

  // Review Crew Modal State (Part C)
  const [reviewingCrew, setReviewingCrew] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Add Crew Modal State (Part G)
  const [isAddCrewOpen, setIsAddCrewOpen] = useState(false);
  const [newCrewData, setNewCrewData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleNumber: '',
    password: '',
  });
  const [addCrewLoading, setAddCrewLoading] = useState(false);

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

  // Filter crews into active, pending verification, and rejected
  const activeCrews = crews.filter(
    (c) => c.verificationStatus === 'APPROVED' || !c.verificationStatus
  );
  const pendingCrews = crews.filter(
    (c) => c.verificationStatus === 'PENDING_VERIFICATION'
  );
  const rejectedCrews = crews.filter(
    (c) => c.verificationStatus === 'REJECTED'
  );

  const totalCrews = activeCrews.length;
  const availableCrews = activeCrews.filter((c) => c.status === 'AVAILABLE').length;
  const busyCrews = activeCrews.filter((c) => c.status === 'BUSY').length;
  const pendingCount = pendingCrews.length;

  // Approve Crew Handler (Part C4/C5/C6)
  const handleApproveCrew = async (crewId) => {
    try {
      setActionLoading(true);
      await verifyCrew(crewId, { status: 'APPROVED' });
      addToast('Crew member approved successfully.', 'success');
      setReviewingCrew(null);
      setConfirmingAction(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Unable to approve crew member.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Crew Handler (Part C7/C8)
  const handleRejectCrew = async (crewId) => {
    try {
      setActionLoading(true);
      await verifyCrew(crewId, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim() || 'Unable to verify submitted crew information.',
      });
      addToast('Crew application rejected.', 'info');
      setReviewingCrew(null);
      setConfirmingAction(null);
      setRejectionReason('');
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Unable to reject crew application.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Add Crew Handler (Part G)
  const handleCreateCrew = async (e) => {
    e.preventDefault();
    if (!newCrewData.name || !newCrewData.vehicleNumber) {
      addToast('Please provide crew name and vehicle number.', 'warning');
      return;
    }
    try {
      setAddCrewLoading(true);
      await createCrew(newCrewData);
      addToast('New collection crew created and approved successfully!', 'success');
      setIsAddCrewOpen(false);
      setNewCrewData({ name: '', email: '', phone: '', vehicleNumber: '', password: '' });
      await fetchData();
      setActiveTab('active');
    } catch (err) {
      addToast(err.message || 'Failed to create collection crew.', 'error');
    } finally {
      setAddCrewLoading(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddCrewOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm"
          >
            <Plus size={15} />
            <span>Add Crew</span>
          </button>
        </div>
      }
    >
      {/* ── Summary KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalCrews}</p>
            <p className="text-xs text-slate-400 font-medium">Active Fleet Crews</p>
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

        <div
          onClick={() => handleTabChange('verification')}
          className={`card p-4 flex items-center gap-3 cursor-pointer transition-all ${
            pendingCount > 0
              ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50'
              : 'hover:bg-slate-50'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Shield size={20} />
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                pendingCount > 0 ? 'text-amber-800' : 'text-slate-700'
              }`}
            >
              {pendingCount}
            </p>
            <p className="text-xs text-slate-500 font-medium">Verification Requests</p>
          </div>
        </div>
      </div>

      {/* ── Tabs Strip (Part C) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => handleTabChange('active')}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === 'active'
              ? 'text-green-700 border-b-2 border-green-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Crews ({activeCrews.length})
        </button>

        <button
          onClick={() => handleTabChange('verification')}
          className={`pb-3 px-3 text-sm font-semibold transition-all flex items-center gap-2 relative ${
            activeTab === 'verification'
              ? 'text-green-700 border-b-2 border-green-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Verification Requests</span>
          {pendingCount > 0 ? (
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2 py-0.2 rounded-full">
              {pendingCount}
            </span>
          ) : (
            <span className="text-xs font-normal text-slate-400">(0)</span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('rejected')}
          className={`pb-3 px-3 text-sm font-semibold transition-all relative ${
            activeTab === 'rejected'
              ? 'text-green-700 border-b-2 border-green-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Rejected ({rejectedCrews.length})
        </button>
      </div>

      {loading && <LoadingState message="Loading collection fleet data..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {/* ── TAB 1: ACTIVE CREWS (Part C9) ── */}
      {!loading && !error && activeTab === 'active' && (
        <>
          {activeCrews.length === 0 ? (
            <EmptyState
              icon={Truck}
              message="No approved collection crews are currently available."
              description="Approve pending verification requests or click '+ Add Crew' to onboard new crew members."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeCrews.map((crew) => {
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
          )}
        </>
      )}

      {/* ── TAB 2: VERIFICATION REQUESTS (Part C2) ── */}
      {!loading && !error && activeTab === 'verification' && (
        <>
          {pendingCrews.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              message="No crew applications are awaiting verification."
              description="All collection crew applications have been reviewed and approved."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Pending Crew Onboarding Queue ({pendingCrews.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and verify incoming collection crew registrations before assigning them pickups.
                  </p>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 text-xs font-semibold">
                      <th className="text-left px-5 py-3">Applicant Name</th>
                      <th className="text-left px-5 py-3">Contact</th>
                      <th className="text-left px-5 py-3">Vehicle Number</th>
                      <th className="text-left px-5 py-3">Applied Date</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-right px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingCrews.map((crew) => (
                      <tr key={crew._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900">{crew.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {shortId(crew._id)}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-slate-700 font-medium">{crew.user?.email || '—'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{crew.phone || crew.user?.phone || '—'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {crew.vehicleNumber || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {formatDate(crew.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <VerificationStatusBadge status={crew.verificationStatus} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setReviewingCrew(crew);
                              setConfirmingAction(null);
                            }}
                            className="btn-primary text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
                          >
                            Review Application
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {pendingCrews.map((crew) => (
                  <div key={crew._id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-sm">{crew.name}</p>
                      <VerificationStatusBadge status={crew.verificationStatus} />
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong>Email:</strong> {crew.user?.email || '—'}
                      </p>
                      <p>
                        <strong>Phone:</strong> {crew.phone || crew.user?.phone || '—'}
                      </p>
                      <p>
                        <strong>Vehicle:</strong>{' '}
                        <span className="font-mono font-semibold">{crew.vehicleNumber}</span>
                      </p>
                      <p className="text-slate-400">
                        <strong>Applied:</strong> {formatDate(crew.createdAt)}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setReviewingCrew(crew);
                          setConfirmingAction(null);
                        }}
                        className="btn-primary text-xs py-1.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
                      >
                        Review Application
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB 3: REJECTED APPLICATIONS ── */}
      {!loading && !error && activeTab === 'rejected' && (
        <>
          {rejectedCrews.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              message="No rejected crew applications."
              description="Any applications that are rejected will be archived here for record keeping."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Rejected Applications Archive ({rejectedCrews.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unapproved crew applicant records.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {rejectedCrews.map((crew) => (
                  <div key={crew._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{crew.name}</span>
                        <VerificationStatusBadge status="REJECTED" />
                      </div>
                      <p className="text-slate-500">
                        Vehicle: <strong className="font-mono text-slate-700">{crew.vehicleNumber}</strong> · Email: {crew.user?.email || '—'} · Phone: {crew.phone || '—'}
                      </p>
                      {crew.rejectionReason && (
                        <p className="text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 mt-1 max-w-lg">
                          <strong>Reason:</strong> {crew.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="text-slate-400 sm:text-right">
                      <p>Rejected on: {crew.verifiedAt ? formatDate(crew.verifiedAt) : 'Recently'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Review Crew Modal (Part C3 / C4 / C7) ── */}
      {reviewingCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Review Crew Application</h3>
                  <p className="text-xs text-slate-500">Verify candidate credentials before granting access</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewingCrew(null);
                  setConfirmingAction(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Applicant Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Truck size={13} className="text-slate-400" /> Crew / Driver Name:
                </span>
                <span className="font-bold text-slate-900">{reviewingCrew.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" /> Email Address:
                </span>
                <span className="font-semibold text-slate-800">{reviewingCrew.user?.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" /> Phone:
                </span>
                <span className="font-semibold text-slate-800">{reviewingCrew.phone || reviewingCrew.user?.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" /> Vehicle Number:
                </span>
                <span className="font-mono font-bold text-slate-900">{reviewingCrew.vehicleNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" /> Application Date:
                </span>
                <span className="text-slate-700">{formatDateTime(reviewingCrew.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Status:</span>
                <VerificationStatusBadge status={reviewingCrew.verificationStatus} />
              </div>
            </div>

            {/* In-Modal Confirmation State for APPROVE (Part C4) */}
            {confirmingAction === 'APPROVE' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 animate-fadeIn">
                <p className="font-bold text-emerald-900 text-sm">Approve this collection crew?</p>
                <p className="text-emerald-800">
                  Once approved, this crew member can receive EcoSaathi collection assignments and access the smart route engine.
                </p>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConfirmingAction(null)}
                    disabled={actionLoading}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleApproveCrew(reviewingCrew._id)}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                  >
                    {actionLoading ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </div>
            )}

            {/* In-Modal Confirmation State for REJECT (Part C7) */}
            {confirmingAction === 'REJECT' && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2.5 animate-fadeIn">
                <p className="font-bold text-red-900 text-sm">Reject Crew Application</p>
                <p className="text-red-700">
                  Provide an optional reason for rejecting this application:
                </p>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Unable to verify submitted vehicle registration or contact details"
                  className="w-full text-xs p-2.5 rounded-lg border border-red-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConfirmingAction(null)}
                    disabled={actionLoading}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRejectCrew(reviewingCrew._id)}
                    disabled={actionLoading}
                    className="btn-primary text-xs py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm"
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}

            {/* Default Review Modal Actions */}
            {!confirmingAction && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingAction('REJECT')}
                  className="btn-secondary text-xs py-2 px-3.5 text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold flex items-center gap-1.5"
                >
                  <UserX size={14} />
                  <span>Reject Application</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewingCrew(null)}
                    className="btn-secondary text-xs py-2 px-3.5"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingAction('APPROVE')}
                    className="btn-primary text-xs py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <UserCheck size={14} />
                    <span>Approve Crew</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Crew Modal (Part G) ── */}
      {isAddCrewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Collection Crew</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin-created crew members are automatically approved and ready for dispatch.
                </p>
              </div>
              <button
                onClick={() => setIsAddCrewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCrew} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Crew / Driver Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Crew Delta or Suresh Patil"
                  value={newCrewData.name}
                  onChange={(e) => setNewCrewData({ ...newCrewData, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="crew.delta@ecosaathi.demo"
                  value={newCrewData.email}
                  onChange={(e) => setNewCrewData({ ...newCrewData, email: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={newCrewData.phone}
                  onChange={(e) => setNewCrewData({ ...newCrewData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vehicle Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="MH01AB9999"
                  value={newCrewData.vehicleNumber}
                  onChange={(e) => setNewCrewData({ ...newCrewData, vehicleNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newCrewData.password}
                  onChange={(e) => setNewCrewData({ ...newCrewData, password: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Minimum 6 characters. Crew will use this to log in.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCrewOpen(false)}
                  disabled={addCrewLoading}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCrewLoading}
                  className="btn-primary text-xs py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {addCrewLoading ? 'Creating...' : 'Create & Approve Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Active Crew Details Modal ── */}
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
