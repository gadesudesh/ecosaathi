import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Layers,
  RefreshCw,
  Truck,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { LoadingState, ErrorState } from '../components/ui/States';
import { getRequestStats, getRequests } from '../services/api';
import {
  wasteTypeLabel,
  formatDateTime,
  formatDate,
  shortId,
} from '../utils/helpers';

// Coordinated EcoSaathi color palette
const PALETTE = {
  // Priority
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#16a34a',

  // Waste types
  organic: '#16a34a',
  plastic: '#0284c7',
  paper: '#7c3aed',
  'e-waste': '#e11d48',
  construction: '#d97706',
  mixed: '#64748b',

  // Statuses
  PENDING: '#d97706',
  ASSIGNED: '#2563eb',
  IN_PROGRESS: '#9333ea',
  COMPLETED: '#16a34a',
  CANCELLED: '#94a3b8',
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card p-5 flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card px-3 py-2 text-xs">
      <p className="font-semibold text-slate-800 mb-0.5">{label || item.name}</p>
      <p className="text-slate-600">
        Volume: <span className="font-bold text-green-700">{item.value} requests</span>
      </p>
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, reqRes] = await Promise.all([
        getRequestStats(),
        getRequests({ sort: 'newest' }),
      ]);
      setStats(statsRes.data.data);
      setRequests(reqRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch operations analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Completion Rate
  const total = stats?.total ?? requests.length ?? 0;
  const completed = stats?.completed ?? requests.filter((r) => r.status === 'COMPLETED').length ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Chart datasets from stats or computed from requests
  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pending', count: stats.pending, key: 'PENDING' },
      { name: 'Assigned', count: stats.assigned, key: 'ASSIGNED' },
      { name: 'In Progress', count: stats.inProgress, key: 'IN_PROGRESS' },
      { name: 'Completed', count: stats.completed, key: 'COMPLETED' },
      { name: 'Cancelled', count: stats.cancelled || 0, key: 'CANCELLED' },
    ].filter((d) => d.count > 0);
  }, [stats]);

  const wasteTypeData = useMemo(() => {
    if (stats?.byWasteType?.length) {
      return stats.byWasteType.map(({ _id, count }) => ({
        name: wasteTypeLabel(_id),
        count,
        key: _id,
      }));
    }
    // Fallback computed from requests
    const counts = {};
    requests.forEach((r) => {
      counts[r.wasteType] = (counts[r.wasteType] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: wasteTypeLabel(type),
      count,
      key: type,
    }));
  }, [stats, requests]);

  const priorityData = useMemo(() => {
    if (stats?.byPriorityLevel?.length) {
      return stats.byPriorityLevel.map(({ _id, count }) => ({
        name: _id,
        count,
        key: _id,
      }));
    }
    // Fallback computed from requests
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return order
      .map((level) => ({
        name: level,
        count: requests.filter((r) => r.priorityLevel === level).length,
        key: level,
      }))
      .filter((d) => d.count > 0);
  }, [stats, requests]);

  const urgencyData = useMemo(() => {
    if (stats?.byUrgency?.length) {
      return stats.byUrgency.map(({ _id, count }) => ({
        name: _id.charAt(0).toUpperCase() + _id.slice(1),
        count,
      }));
    }
    return [
      { name: 'High', count: requests.filter((r) => r.urgency === 'high').length },
      { name: 'Medium', count: requests.filter((r) => r.urgency === 'medium').length },
      { name: 'Low', count: requests.filter((r) => r.urgency === 'low').length },
    ].filter((d) => d.count > 0);
  }, [stats, requests]);

  // Derive Recent Activity from requests
  const recentActivity = useMemo(() => {
    const list = [];
    requests.forEach((req) => {
      const time = req.updatedAt || req.createdAt;
      const crewName = req.assignedCrew?.name || (typeof req.assignedCrew === 'object' ? req.assignedCrew?.name : null);

      if (req.status === 'COMPLETED') {
        list.push({
          id: `act-comp-${req._id}`,
          time,
          text: `Pickup ${shortId(req._id)} collection completed.`,
          detail: `${wasteTypeLabel(req.wasteType)} · ${req.location?.address || 'Mumbai'}`,
          type: 'completed',
        });
      } else if (req.status === 'IN_PROGRESS') {
        list.push({
          id: `act-prog-${req._id}`,
          time,
          text: `Collection in progress for ${shortId(req._id)}${crewName ? ` by ${crewName}` : ''}.`,
          detail: `${wasteTypeLabel(req.wasteType)} · Priority: ${req.priorityLevel}`,
          type: 'in_progress',
        });
      } else if (req.status === 'ASSIGNED') {
        list.push({
          id: `act-asgn-${req._id}`,
          time,
          text: `Pickup ${shortId(req._id)} assigned to ${crewName || 'collection crew'}.`,
          detail: `Priority: ${req.priorityLevel} · ${wasteTypeLabel(req.wasteType)}`,
          type: 'assigned',
        });
      } else {
        list.push({
          id: `act-new-${req._id}`,
          time: req.createdAt,
          text: `New ${wasteTypeLabel(req.wasteType)} pickup requested (${shortId(req._id)}).`,
          detail: `Priority: ${req.priorityLevel} · Resident: ${req.resident?.name || 'Resident'}`,
          type: 'pending',
        });
      }
    });

    list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return list.slice(0, 8);
  }, [requests]);

  return (
    <DashboardLayout
      role="admin"
      title="Analytics & Reporting"
      actions={
        <button
          onClick={fetchData}
          className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
          title="Refresh Analytics"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {loading && <LoadingState message="Aggregating operational analytics..." />}
      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && stats && (
        <div className="space-y-6">
          {/* Top KPI Strip with Completion Rate */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Completion Rate KPI Card */}
            <div className="card p-4 bg-emerald-50/50 border-emerald-200 col-span-2 sm:col-span-1 xl:col-span-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold mb-1">
                  <Percent size={14} /> Collection Completion Rate
                </div>
                <div className="text-3xl font-extrabold text-emerald-950">
                  {completionRate}%
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  {completed} of {total} requests fulfilled
                </p>
              </div>
              <div className="w-14 h-14 rounded-full border-4 border-emerald-600 bg-white flex items-center justify-center font-bold text-emerald-700 text-sm shadow-xs">
                {completionRate}%
              </div>
            </div>

            <div className="card p-4">
              <span className="text-xs text-slate-400 font-medium">Total Requests</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Logged in system</p>
            </div>

            <div className="card p-4">
              <span className="text-xs text-amber-600 font-medium">Pending Dispatch</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting crew</p>
            </div>

            <div className="card p-4">
              <span className="text-xs text-blue-600 font-medium">Assigned Jobs</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.assigned}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">In crew queues</p>
            </div>

            <div className="card p-4">
              <span className="text-xs text-purple-600 font-medium">In Progress</span>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inProgress}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Underway now</p>
            </div>
          </div>

          {/* 4 Core Charts in 2x2 Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart 1: Requests by Status */}
            <ChartCard
              title="Requests by Status"
              subtitle="Distribution of pickup requests across the collection workflow"
            >
              <div className="h-[240px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} barCategoryGap="25%">
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={PALETTE[entry.key] || '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Chart 2: Waste Type Distribution */}
            <ChartCard
              title="Waste Type Distribution"
              subtitle="Composition of material categories reported by residents"
            >
              <div className="h-[240px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteTypeData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {wasteTypeData.map((entry, i) => (
                        <Cell key={i} fill={PALETTE[entry.key] || '#16a34a'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Chart 3: Requests by Priority Level */}
            <ChartCard
              title="Requests by Priority Level"
              subtitle="Urgency tiers computed by the Priority Engine"
            >
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical" barCategoryGap="20%">
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={PALETTE[entry.key] || '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Chart 4: Requests by Urgency */}
            <ChartCard
              title="Urgency Breakdown"
              subtitle="Resident-reported initial collection urgency levels"
            >
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyData} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {urgencyData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={['#dc2626', '#d97706', '#16a34a'][i] || '#64748b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Recent Operations Activity Feed */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-green-600" />
                <h3 className="section-title">Recent Operational Activity</h3>
              </div>
              <span className="text-xs text-slate-400">Chronological event log</span>
            </div>

            <div className="space-y-3">
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition-colors text-xs"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      act.type === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : act.type === 'in_progress'
                        ? 'bg-purple-100 text-purple-700'
                        : act.type === 'assigned'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {act.type === 'completed' ? (
                      <CheckCircle2 size={15} />
                    ) : act.type === 'assigned' ? (
                      <Truck size={15} />
                    ) : act.type === 'in_progress' ? (
                      <Clock size={15} />
                    ) : (
                      <Layers size={15} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{act.text}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{act.detail}</p>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {formatDateTime(act.time)}
                  </span>
                </div>
              ))}

              {recentActivity.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">
                  No recent operational events recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
