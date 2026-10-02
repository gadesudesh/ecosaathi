import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, ClipboardList, Truck,
  Map, Users, BarChart3, LogOut, Menu, X, Leaf, Shield, UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ── Nav config per role ───────────────────────────────────────────────────────
const NAV = {
  resident: [
    { to: '/resident',         label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/resident/request', label: 'Request Pickup', icon: PlusCircle },
    { to: '/resident/requests',label: 'My Requests',    icon: ClipboardList },
  ],
  crew: [
    { to: '/crew',          label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/crew/requests', label: 'Pickups',      icon: ClipboardList },
    { to: '/crew/route',    label: 'Smart Route',  icon: Map },
  ],
  admin: [
    { to: '/admin',           label: 'Overview',         icon: LayoutDashboard },
    { to: '/admin/requests',  label: 'Requests',         icon: ClipboardList },
    { to: '/admin/crews',     label: 'Collection Crews', icon: Truck },
    { to: '/admin/analytics', label: 'Analytics',        icon: BarChart3 },
  ],
};

const ROLE_LABELS = { resident: 'Resident', crew: 'Collection Crew', admin: 'Admin' };

const ROLE_BADGE_STYLES = {
  resident: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  crew: 'bg-blue-50 text-blue-700 border-blue-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ role, onClose }) {
  const { user, logout } = useAuth();
  let nav = NAV[role] || NAV.resident;
  if (role === 'crew' && user?.crewProfile && user.crewProfile.verificationStatus !== 'APPROVED') {
    nav = [
      { to: '/crew', label: 'Verification Status', icon: Shield },
    ];
  }
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <Leaf className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm leading-none">EcoSaathi</span>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Cleaner Communities</p>
          </div>
        </NavLink>
        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/resident' || to === '/crew' || to === '/admin'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-green-600' : 'text-slate-400'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Role switcher — only visible to Admins who have permission to preview all dashboards */}
      {user?.role === 'admin' && (
        <div className="px-3 py-2 border-t border-slate-100 space-y-0.5">
          <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Shield size={11} className="text-purple-500" />
            Admin View Switcher
          </p>
          {Object.keys(NAV).map((r) => (
            <button
              key={r}
              onClick={() => navigate(`/${r}`)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                r === role ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {ROLE_LABELS[r]} View
            </button>
          ))}
        </div>
      )}

      {/* User profile & Logout area */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700 font-bold text-xs uppercase">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.name || 'User'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                  ROLE_BADGE_STYLES[user?.role] || 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {ROLE_LABELS[user?.role] || user?.role || 'Guest'}
              </span>
              {user?.role === 'crew' && user?.crewProfile && (
                <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                  · {user.crewProfile.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── DashboardLayout ────────────────────────────────────────────────────────────
export default function DashboardLayout({ role, title, actions, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar role={role} />
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar role={role} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3.5 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={18} />
            </button>
            <h1 className="page-title">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                <span className="text-xs text-slate-500">
                  Signed in as <strong className="text-slate-700 font-semibold">{user.name}</strong>
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
