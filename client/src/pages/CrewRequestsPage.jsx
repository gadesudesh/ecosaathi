import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  Filter,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import MapView from '../components/maps/MapView';
import {
  getMyCrewRequests,
  updateRequestStatus,
} from '../services/api';
import {
  wasteTypeLabel,
  formatDateTime,
  shortId,
  calculateDistanceKm,
  sortCrewPickups,
} from '../utils/helpers';
import usePageTitle from '../utils/usePageTitle';
import { useToast } from '../context/ToastContext';

export default function CrewRequestsPage() {
  usePageTitle("Today's Pickups");
  const { addToast } = useToast();

  const [crew, setCrew] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Complete confirmation modal state
  const [completingRequest, setCompletingRequest] = useState(null);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyCrewRequests();
      const list = res.data?.data || res.data || [];
      const crewInfo = res.data?.crew || null;

      setCrew(crewInfo);
      setRequests(sortCrewPickups(list));
    } catch (err) {
      setError(err.message || 'Failed to load assigned collection pickups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  // Quick Action: Start Collection
  const handleStartCollection = async (reqId) => {
    try {
      setActionLoadingId(reqId);
      await updateRequestStatus(reqId, 'IN_PROGRESS');
      addToast('Collection started! Status set to IN_PROGRESS.', 'success');
      await fetchPickups();
    } catch (err) {
      addToast(err.message || 'Failed to start collection.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Complete Pickup (from modal)
  const handleConfirmComplete = async () => {
    if (!completingRequest) return;
    try {
      setActionLoadingId(completingRequest._id);
      await updateRequestStatus(completingRequest._id, 'COMPLETED');
      addToast('Pickup completed successfully! Great work.', 'success');
      setCompletingRequest(null);
      await fetchPickups();
    } catch (err) {
      addToast(err.message || 'Failed to complete pickup.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter tabs
  const tabs = [
    { key: 'ALL', label: 'All Tasks', count: requests.length },
    { key: 'IN_PROGRESS', label: 'In Progress', count: requests.filter((r) => r.status === 'IN_PROGRESS').length },
    { key: 'ASSIGNED', label: 'Assigned', count: requests.filter((r) => r.status === 'ASSIGNED').length },
    { key: 'COMPLETED', label: 'Completed', count: requests.filter((r) => r.status === 'COMPLETED').length },
  ];

  const filteredRequests = requests.filter((r) => {
    const matchesTab = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      r.wasteType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r._id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <DashboardLayout role="crew" title="Today's Collection Tasks">
      {/* ── Top Header ── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Today's Pickups
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Assigned collection tasks organized in priority order.
          </p>
        </div>

        <button
          onClick={fetchPickups}
          disabled={loading}
          className="btn-secondary self-start md:self-auto text-xs flex items-center gap-1.5 py-2 px-3"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      {loading && <LoadingState message="Loading today's pickups..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchPickups} />}

      {!loading && !error && (
        <div className="space-y-6">
          {/* ── Filter Tabs & Search Bar ── */}
          <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.key
                      ? 'bg-green-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusFilter === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search pickups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input text-xs pl-8 py-1.5 w-full"
              />
            </div>
          </div>

          {/* ── Pickups List ── */}
          <div className="card overflow-hidden">
            {filteredRequests.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                message={
                  statusFilter === 'ALL'
                    ? "You're all caught up!"
                    : `No ${statusFilter.toLowerCase()} pickups found.`
                }
                description="Assigned tasks matching this filter will appear here."
              />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold">
                        <th className="text-left px-5 py-3">#</th>
                        <th className="text-left px-5 py-3">ID</th>
                        <th className="text-left px-5 py-3">Waste Type</th>
                        <th className="text-left px-5 py-3">Quantity</th>
                        <th className="text-left px-5 py-3">Priority</th>
                        <th className="text-left px-5 py-3">Location & Distance</th>
                        <th className="text-left px-5 py-3">Status</th>
                        <th className="text-left px-5 py-3">Requested</th>
                        <th className="text-right px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((req, idx) => {
                        const dist =
                          crew?.currentLocation && req.location
                            ? calculateDistanceKm(crew.currentLocation, req.location)
                            : null;

                        return (
                          <tr
                            key={req._id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              req.status === 'IN_PROGRESS' ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="px-5 py-4 font-bold text-xs text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700">
                              {shortId(req._id)}
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {wasteTypeLabel(req.wasteType)}
                            </td>
                            <td className="px-5 py-4 text-slate-600 capitalize">
                              {req.quantity}
                            </td>
                            <td className="px-5 py-4">
                              <PriorityBadge
                                level={req.priorityLevel}
                                score={req.priorityScore}
                              />
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-medium text-slate-800 max-w-[200px] truncate">
                                {req.location?.address || 'Mumbai'}
                              </p>
                              {dist && (
                                <p className="text-[11px] text-green-700 font-semibold">
                                  {dist} km away
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={req.status} />
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                              {formatDateTime(req.createdAt)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {req.status === 'ASSIGNED' && (
                                  <button
                                    onClick={() => handleStartCollection(req._id)}
                                    disabled={actionLoadingId === req._id}
                                    className="px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                                  >
                                    <Play size={12} />
                                    <span>Start</span>
                                  </button>
                                )}

                                {req.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={() => setCompletingRequest(req)}
                                    disabled={actionLoadingId === req._id}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors animate-pulse"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Complete</span>
                                  </button>
                                )}

                                {req.status === 'COMPLETED' && (
                                  <span className="text-xs text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-md">
                                    ✓ Done
                                  </span>
                                )}

                                <Link
                                  to={`/crew/requests/${req._id}`}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                                >
                                  View
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredRequests.map((req, idx) => {
                    const dist =
                      crew?.currentLocation && req.location
                        ? calculateDistanceKm(crew.currentLocation, req.location)
                        : null;

                    return (
                      <div
                        key={req._id}
                        className={`p-4 space-y-3 ${
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
                            {wasteTypeLabel(req.wasteType)} ({req.quantity})
                          </span>
                          <PriorityBadge
                            level={req.priorityLevel}
                            score={req.priorityScore}
                          />
                        </div>

                        <div className="text-xs text-slate-500">
                          <p className="truncate">📍 {req.location?.address || 'Mumbai'}</p>
                          {dist && (
                            <p className="text-green-700 font-semibold mt-0.5">
                              {dist} km away
                            </p>
                          )}
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(req.createdAt)}
                          </span>

                          <div className="flex items-center gap-2">
                            {req.status === 'ASSIGNED' && (
                              <button
                                onClick={() => handleStartCollection(req._id)}
                                disabled={actionLoadingId === req._id}
                                className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                <Play size={12} />
                                <span>Start</span>
                              </button>
                            )}

                            {req.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => setCompletingRequest(req)}
                                disabled={actionLoadingId === req._id}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                <CheckCircle2 size={13} />
                                <span>Complete</span>
                              </button>
                            )}

                            <Link
                              to={`/crew/requests/${req._id}`}
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <span>Details</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Complete Pickup Confirmation Modal ── */}
      {completingRequest && (
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
                  Request {shortId(completingRequest._id)} · {wasteTypeLabel(completingRequest.wasteType)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that the waste has been collected from the requested location.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletingRequest(null)}
                disabled={actionLoadingId === completingRequest._id}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={actionLoadingId === completingRequest._id}
                className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
              >
                {actionLoadingId === completingRequest._id ? 'Saving...' : 'Complete Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
