import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  Filter,
  ArrowUpDown,
  Truck,
  ExternalLink,
  MapPin,
  RefreshCw,
  Clock,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import AssignCrewModal from '../components/modals/AssignCrewModal';
import { getRequests, getCrews } from '../services/api';
import {
  wasteTypeLabel,
  formatDate,
  shortId,
  formatWaitingTime,
} from '../utils/helpers';

const STATUS_OPTIONS = ['', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const PRIORITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const WASTE_OPTIONS = ['', 'plastic', 'organic', 'paper', 'e-waste', 'construction', 'mixed'];

const PRIORITY_ORDER = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'newest' | 'oldest'

  // Assignment Modal
  const [selectedRequestForAssign, setSelectedRequestForAssign] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reqRes, crewRes] = await Promise.all([
        getRequests(),
        getCrews(),
      ]);
      setRequests(reqRes.data.data || []);
      setCrews(crewRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & Search & Sort pipeline
  const filteredAndSortedRequests = useMemo(() => {
    let result = [...requests];

    // Search by Request ID or Location
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const idMatch =
          r._id?.toLowerCase().includes(q) ||
          r.requestId?.toLowerCase().includes(q) ||
          shortId(r._id).toLowerCase().includes(q);
        const addressMatch = r.location?.address?.toLowerCase().includes(q);
        const residentName = r.resident?.name?.toLowerCase().includes(q);
        return idMatch || addressMatch || residentName;
      });
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter) {
      result = result.filter((r) => r.priorityLevel === priorityFilter);
    }

    // Waste Type filter
    if (wasteTypeFilter) {
      result = result.filter((r) => r.wasteType === wasteTypeFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        const prioA = PRIORITY_ORDER[a.priorityLevel] || 99;
        const prioB = PRIORITY_ORDER[b.priorityLevel] || 99;
        if (prioA !== prioB) return prioA - prioB;
        // Within same priority: oldest request first
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [requests, searchQuery, statusFilter, priorityFilter, wasteTypeFilter, sortBy]);

  const openAssignModal = (req) => {
    setSelectedRequestForAssign(req);
    setIsAssignModalOpen(true);
  };

  return (
    <DashboardLayout
      role="admin"
      title="Pickup Requests"
      actions={
        <button
          onClick={fetchData}
          className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
          title="Refresh Table"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {/* Search & Filters Bar */}
      <div className="card p-4 mb-6 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by Request ID, address, or resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-green-500 outline-none text-slate-800"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-green-500 outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-green-500 outline-none"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Waste Type */}
            <select
              value={wasteTypeFilter}
              onChange={(e) => setWasteTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-green-500 outline-none"
            >
              <option value="">All Waste Types</option>
              {WASTE_OPTIONS.filter(Boolean).map((w) => (
                <option key={w} value={w}>
                  {wasteTypeLabel(w)}
                </option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-green-500 outline-none font-medium"
              >
                <option value="priority">Priority (Critical First)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table Card */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="section-title">Operations Registry</h2>
            <p className="text-[11px] text-slate-400">
              Showing {filteredAndSortedRequests.length} of {requests.length} total pickup requests
            </p>
          </div>
          {(statusFilter || priorityFilter || wasteTypeFilter || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPriorityFilter('');
                setWasteTypeFilter('');
                setSortBy('priority');
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading && <LoadingState message="Loading pickup requests..." />}
        {!loading && error && <ErrorState message={error} onRetry={fetchData} />}
        {!loading && !error && filteredAndSortedRequests.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            message="No pickup requests match the current search or filters."
          />
        )}

        {!loading && !error && filteredAndSortedRequests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Request ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Waste Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Quantity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Waiting Time
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Assigned Crew
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Created
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedRequests.map((req) => {
                  const isUnassigned = !req.assignedCrew && req.status === 'PENDING';
                  const isEligibleForReassign =
                    req.status === 'ASSIGNED' && Boolean(req.assignedCrew);
                  const isCompletedOrCancelled = ['COMPLETED', 'CANCELLED'].includes(req.status);
                  const isInProgress = req.status === 'IN_PROGRESS';

                  const crewObj =
                    typeof req.assignedCrew === 'object'
                      ? req.assignedCrew
                      : crews.find((c) => c._id === req.assignedCrew);

                  return (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* ID */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                        <Link
                          to={`/admin/requests/${req._id}`}
                          className="font-bold text-green-700 hover:text-green-800 hover:underline"
                        >
                          {shortId(req._id)}
                        </Link>
                      </td>

                      {/* Waste Type */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 text-xs whitespace-nowrap">
                        {wasteTypeLabel(req.wasteType)}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 capitalize whitespace-nowrap">
                        {req.quantity || '—'}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PriorityBadge level={req.priorityLevel} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[150px] truncate">
                        <span title={req.location?.address}>
                          {req.location?.address ||
                            `${req.location?.latitude?.toFixed(3)}, ${req.location?.longitude?.toFixed(3)}`}
                        </span>
                      </td>

                      {/* Waiting Time */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatWaitingTime(req.createdAt)}
                      </td>

                      {/* Assigned Crew */}
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        {crewObj ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            <span className="font-semibold text-slate-800">{crewObj.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({crewObj.vehicleNumber || 'active'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(req.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/requests/${req._id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-green-700 hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <ExternalLink size={14} />
                          </Link>

                          {isUnassigned && (
                            <button
                              onClick={() => openAssignModal(req)}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
                            >
                              Assign Crew
                            </button>
                          )}

                          {isEligibleForReassign && (
                            <button
                              onClick={() => openAssignModal(req)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold transition-colors"
                            >
                              Reassign
                            </button>
                          )}

                          {isInProgress && (
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              In Progress
                            </span>
                          )}

                          {isCompletedOrCancelled && (
                            <span className="text-[11px] text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
