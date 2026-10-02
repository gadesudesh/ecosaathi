import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle2, PlusCircle, ArrowRight,
  MapPin, Calendar, Sparkles, CheckCheck, Truck
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/cards/StatCard';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState } from '../components/ui/States';
import { getRequests } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../utils/usePageTitle';
import { wasteTypeLabel, formatDateTime, formatDate, shortId } from '../utils/helpers';

export default function ResidentDashboard() {
  usePageTitle('Resident Dashboard');
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      // Single API call for dashboard efficiency
      const res = await getRequests({ sort: 'newest' });
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Compute metrics from resident's requests
  const activeRequests = requests.filter(r => ['ASSIGNED', 'IN_PROGRESS'].includes(r.status));
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');

  // Find the most relevant current request (In Progress > Assigned > Pending)
  const currentRequest =
    requests.find(r => r.status === 'IN_PROGRESS') ||
    requests.find(r => r.status === 'ASSIGNED') ||
    requests.find(r => r.status === 'PENDING') ||
    null;

  // Latest 5 requests for the recent list
  const recentRequests = requests.slice(0, 5);

  return (
    <DashboardLayout
      role="resident"
      title="Resident Dashboard"
      actions={
        <Link
          to="/resident/request"
          className="btn-primary inline-flex items-center gap-2 py-2 px-4 shadow-sm"
        >
          <PlusCircle size={16} />
          <span>Request Waste Pickup</span>
        </Link>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Top Greeting & Hero Banner */}
        <div className="bg-gradient-to-r from-green-50 via-white to-green-50/40 border border-green-200/70 rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Hello, {user?.name || 'Resident'} 👋
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600">
              Let's keep our community cleaner, one pickup at a time.
            </p>
          </div>
          <Link
            to="/resident/request"
            className="btn-primary inline-flex items-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-xl shadow-sm self-stretch sm:self-auto justify-center flex-shrink-0"
          >
            <PlusCircle size={18} />
            <span>Request Waste Pickup</span>
          </Link>
        </div>

        {/* Resident Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 border-l-4 border-l-amber-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Requests
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '—' : activeRequests.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Assigned or in progress</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck size={20} />
            </div>
          </div>

          <div className="card p-5 border-l-4 border-l-blue-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '—' : pendingRequests.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting crew dispatch</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>

          <div className="card p-5 border-l-4 border-l-green-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Completed
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '—' : completedRequests.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Successfully collected</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCheck size={20} />
            </div>
          </div>
        </div>

        {/* Current Pickup Card */}
        {loading ? (
          <div className="card p-6">
            <LoadingState message="Checking current pickup status..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRequests} />
        ) : currentRequest ? (
          <div className="card p-6 border-2 border-green-200/80 bg-gradient-to-br from-white via-white to-green-50/20 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
                  Current Pickup
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge level={currentRequest.priorityLevel} score={currentRequest.priorityScore} />
                <StatusBadge status={currentRequest.status} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2 space-y-2">
                <h4 className="text-xl font-bold text-slate-900">
                  {wasteTypeLabel(currentRequest.wasteType)}
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span>
                      {currentRequest.location?.address ||
                        `${currentRequest.location?.latitude?.toFixed(4)}, ${currentRequest.location?.longitude?.toFixed(4)}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Requested: {formatDateTime(currentRequest.createdAt)}</span>
                  </span>
                </div>
                {currentRequest.assignedCrew && (
                  <p className="text-xs text-green-700 font-medium pt-1">
                    🚛 Assigned to: {currentRequest.assignedCrew.name || 'Collection Team'}
                  </p>
                )}
              </div>

              <div className="flex md:justify-end">
                <Link
                  to={`/resident/requests/${currentRequest._id}`}
                  className="btn-primary w-full md:w-auto inline-flex items-center justify-center gap-2 py-2 px-5 rounded-xl text-sm"
                >
                  <span>Track Request</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state: No active pickup */
          <div className="card p-7 text-center bg-slate-50/50 border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800">You're all clear!</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No active waste pickups at the moment. Need something collected?
            </p>
            <div className="mt-4">
              <Link
                to="/resident/request"
                className="btn-primary inline-flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-xl"
              >
                <PlusCircle size={15} />
                <span>Request a Pickup</span>
              </Link>
            </div>
          </div>
        )}

        {/* Recent Requests Section */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="section-title">Recent Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your latest waste pickup requests</p>
            </div>
            {requests.length > 5 && (
              <Link
                to="/resident/requests"
                className="text-xs font-semibold text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <span>View all ({requests.length})</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>

          {!loading && !error && requests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ClipboardList size={22} />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No pickup requests yet.</h4>
              <p className="text-xs text-slate-500 mt-1">Schedule your first waste pickup with EcoSaathi.</p>
              <div className="mt-4">
                <Link to="/resident/request" className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl">
                  <PlusCircle size={14} />
                  <span>Request a Pickup</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 text-xs">
                      <th className="text-left px-5 py-3 font-semibold">Request ID</th>
                      <th className="text-left px-5 py-3 font-semibold">Waste Type</th>
                      <th className="text-left px-5 py-3 font-semibold">Priority</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-left px-5 py-3 font-semibold">Date</th>
                      <th className="text-right px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {shortId(req._id)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {wasteTypeLabel(req.wasteType)}
                        </td>
                        <td className="px-5 py-3.5">
                          <PriorityBadge level={req.priorityLevel} score={req.priorityScore} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {formatDate(req.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/resident/requests/${req._id}`}
                            className="text-xs font-semibold text-green-600 hover:text-green-700 inline-flex items-center gap-1"
                          >
                            <span>View Details</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="sm:hidden divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <Link
                    key={req._id}
                    to={`/resident/requests/${req._id}`}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors block"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{shortId(req._id)}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {wasteTypeLabel(req.wasteType)}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(req.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <PriorityBadge level={req.priorityLevel} score={req.priorityScore} />
                      <span className="text-xs text-green-600 font-semibold inline-flex items-center gap-1">
                        Details <ArrowRight size={11} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
