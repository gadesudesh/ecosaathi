import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, PlusCircle, Filter, ArrowRight,
  Ban, AlertCircle, X, Check, Loader2, Calendar, MapPin
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState } from '../components/ui/States';
import { getRequests, cancelRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePageTitle } from '../utils/usePageTitle';
import { wasteTypeLabel, formatDate, formatDateTime, shortId } from '../utils/helpers';

const STATUS_TABS = [
  { id: 'ALL',         label: 'All' },
  { id: 'PENDING',     label: 'Pending' },
  { id: 'ASSIGNED',    label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED',   label: 'Completed' },
];

export default function MyRequestsPage() {
  usePageTitle('My Requests');
  const { addToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [wasteFilter, setWasteFilter] = useState('');
  const [sortOption, setSortOption]   = useState('newest');

  // Cancel modal state
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRequests({ sort: sortOption });
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [sortOption]);

  // Tab counts
  const counts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === 'PENDING').length,
    ASSIGNED: requests.filter((r) => r.status === 'ASSIGNED').length,
    IN_PROGRESS: requests.filter((r) => r.status === 'IN_PROGRESS').length,
    COMPLETED: requests.filter((r) => r.status === 'COMPLETED').length,
  };

  // Filtered requests based on activeTab & wasteFilter
  const filteredRequests = requests.filter((r) => {
    if (activeTab !== 'ALL' && r.status !== activeTab) return false;
    if (wasteFilter && r.wasteType !== wasteFilter) return false;
    return true;
  });

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!requestToCancel) return;
    try {
      setCancelling(true);
      const res = await cancelRequest(requestToCancel._id);
      if (res.data?.success) {
        addToast('Pickup request cancelled successfully.', 'success');
        // Update request in state
        setRequests((prev) =>
          prev.map((r) => (r._id === requestToCancel._id ? { ...r, status: 'CANCELLED', assignedCrew: null } : r))
        );
        setRequestToCancel(null);
      }
    } catch (err) {
      addToast(err.message || 'Could not cancel request.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <DashboardLayout
      role="resident"
      title="My Pickup Requests"
      actions={
        <Link
          to="/resident/request"
          className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm"
        >
          <PlusCircle size={15} />
          <span>New Request</span>
        </Link>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Pickup Requests
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track all your waste collection requests in one place.
          </p>
        </div>

        {/* Filter Tabs & Secondary Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = counts[tab.id] || 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-green-700/80 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Controls (Sort & Waste Type) */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <select
              value={wasteFilter}
              onChange={(e) => setWasteFilter(e.target.value)}
              className="input text-xs py-1.5 px-2.5 w-auto"
            >
              <option value="">All Waste Types</option>
              <option value="plastic">Plastic</option>
              <option value="paper">Paper</option>
              <option value="glass">Glass</option>
              <option value="metal">Metal</option>
              <option value="organic">Organic</option>
              <option value="e-waste">E-Waste</option>
              <option value="mixed">Mixed Waste</option>
              <option value="other">Other</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="input text-xs py-1.5 px-2.5 w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Highest Priority</option>
            </select>
          </div>
        </div>

        {/* Requests List Card */}
        <div className="card">
          {loading && <LoadingState message="Loading your pickup requests..." />}
          {!loading && error && <ErrorState message={error} onRetry={fetchRequests} />}

          {/* Empty state: 0 total requests */}
          {!loading && !error && requests.length === 0 && (
            <div className="p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
                <ClipboardList size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No pickup requests yet.</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Schedule your first waste pickup with EcoSaathi to keep your neighborhood clean.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/resident/request"
                  className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-5 rounded-xl shadow-sm"
                >
                  <PlusCircle size={15} />
                  <span>Request a Pickup</span>
                </Link>
              </div>
            </div>
          )}

          {/* Empty state: Filter returns 0 */}
          {!loading && !error && requests.length > 0 && filteredRequests.length === 0 && (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <p className="text-sm font-semibold text-slate-700">No requests found</p>
              <p className="text-xs text-slate-400">
                No pickup requests match the selected {activeTab !== 'ALL' ? `"${activeTab}"` : ''} status filter.
              </p>
              <button
                onClick={() => {
                  setActiveTab('ALL');
                  setWasteFilter('');
                }}
                className="btn-secondary text-xs py-1 px-3 mt-2"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Desktop Table View */}
          {!loading && !error && filteredRequests.length > 0 && (
            <div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 text-xs">
                      <th className="text-left px-5 py-3 font-semibold">Request ID</th>
                      <th className="text-left px-5 py-3 font-semibold">Waste Details</th>
                      <th className="text-left px-5 py-3 font-semibold">Priority</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-left px-5 py-3 font-semibold">Location</th>
                      <th className="text-left px-5 py-3 font-semibold">Date</th>
                      <th className="text-right px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const canCancel = ['PENDING', 'ASSIGNED'].includes(req.status);
                      return (
                        <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs text-slate-600 font-semibold">
                            {shortId(req._id)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {wasteTypeLabel(req.wasteType)}
                            </span>
                            <span className="text-[11px] text-slate-400 capitalize">
                              Qty: {req.quantity} · Urgency: {req.urgency}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <PriorityBadge level={req.priorityLevel} score={req.priorityScore} />
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600 max-w-[180px] truncate">
                            {req.location?.address || `${req.location?.latitude}, ${req.location?.longitude}`}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(req.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/resident/requests/${req._id}`}
                                className="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors"
                              >
                                View Details
                              </Link>
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={() => setRequestToCancel(req)}
                                  className="text-xs text-slate-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                  title="Cancel pickup request"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRequests.map((req) => {
                  const canCancel = ['PENDING', 'ASSIGNED'].includes(req.status);
                  return (
                    <div key={req._id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {shortId(req._id)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge level={req.priorityLevel} score={req.priorityScore} />
                          <StatusBadge status={req.status} />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-base text-slate-900">
                          {wasteTypeLabel(req.wasteType)}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="capitalize">Qty: {req.quantity}</span>
                          <span>·</span>
                          <span className="capitalize">Urgency: {req.urgency}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">
                          {req.location?.address || `${req.location?.latitude}, ${req.location?.longitude}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400">
                          {formatDate(req.createdAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setRequestToCancel(req)}
                              className="text-xs text-red-600 font-medium hover:underline px-2 py-1"
                            >
                              Cancel
                            </button>
                          )}
                          <Link
                            to={`/resident/requests/${req._id}`}
                            className="btn-primary text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1"
                          >
                            <span>Details</span>
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {requestToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Cancel Pickup Request?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel request{' '}
                <strong className="text-slate-700">{shortId(requestToCancel._id)}</strong> (
                {wasteTypeLabel(requestToCancel.wasteType)})?
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                This action cannot be undone and will remove the pickup from collection queues.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setRequestToCancel(null)}
                className="btn-secondary w-full py-2 text-xs font-semibold"
              >
                No, Keep Request
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
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
