import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf, ArrowRight, MapPin, Zap, Route, CheckCircle2,
  ChevronRight, LogIn, LayoutDashboard, LogOut, Phone, ShieldCheck,
  BarChart3, Compass, Sparkles, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'crew'
      ? '/crew'
      : '/resident';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800">
      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-xs">
              <Leaf size={16} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight">EcoSaathi</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200/60 px-2 py-0.5 rounded-full">
                Clean Communities
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={dashboardPath}
                  className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl shadow-xs"
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard ({user.name.split(' ')[0]})</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="btn-secondary text-xs py-2 px-2.5 text-slate-500 hover:text-red-600 rounded-xl"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 rounded-xl font-bold"
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-2 px-4 rounded-xl font-bold shadow-xs"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-green-50/70 via-white to-white pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-100/70 border border-green-200/80 rounded-full px-4 py-1.5 text-xs font-bold text-green-800 mb-8 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            <span>Smart Waste Collection for Cleaner Communities</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
            Smarter Waste Collection.
            <br />
            <span className="text-green-600">Cleaner Communities.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            EcoSaathi connects residents, collection crews and administrators through
            priority-based waste collection and intelligent route planning.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to={isAuthenticated ? "/resident/request" : "/login"}
              className="w-full sm:w-auto btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <MapPin size={16} />
              <span>Request a Pickup</span>
            </Link>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl"
            >
              <span>Explore EcoSaathi</span>
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1.5">
              Streamlined Lifecycle
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How EcoSaathi Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="card p-6 bg-white border border-slate-200/80 rounded-2xl relative shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-extrabold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Report</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Residents report waste and select the pickup location.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card p-6 bg-white border border-slate-200/80 rounded-2xl relative shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Prioritize</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                EcoSaathi prioritizes requests based on urgency and operational factors.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card p-6 bg-white border border-slate-200/80 rounded-2xl relative shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Collect</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Collection crews follow priority-aware smart routes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Smart Features ────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1.5">
              Platform Architecture
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Intelligent Core Capabilities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card p-6 hover:border-green-200 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-4">
                <Zap size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Smart Priority</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated multi-factor calculation analyzing waste type hazard, volume, urgency, and waiting time to classify critical pickups.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-6 hover:border-green-200 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Compass size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Location Intelligence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive Leaflet geospatial mapping with Geoapify reverse-geocoded addresses across Mumbai urban sectors.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-6 hover:border-green-200 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Route size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Smart Route Planning</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deterministic priority-aware route optimizer generating ordered stops, real road geometry, and travel time estimates.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card p-6 hover:border-green-200 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Operations Dashboard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live monitoring control center for administrators to dispatch crews, inspect route sequences, and analyze citywide KPIs.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card p-6 hover:border-green-200 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Phone size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Resident–Crew Contact</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Privacy-protected direct Calling and WhatsApp communication between residents and assigned crews for hassle-free coordination.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card p-6 hover:border-green-200 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Resilient Architecture</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Role-based access control (RBAC), automatic API failure fallback, and in-memory optimization caching for continuous uptime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Impact & Benefits ─────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-green-900 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Measurable Community Impact</h2>
            <p className="text-xs text-green-200/80 mt-2">
              Transforming municipal waste handling into a responsive, efficient public utility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-4">
              <p className="text-3xl sm:text-4xl font-extrabold text-green-400">~24%</p>
              <p className="text-sm font-bold mt-1 text-white">Route Efficiency Gain</p>
              <p className="text-xs text-slate-300 mt-1">Reduced unnecessary travel distance through geographic-priority ordering.</p>
            </div>
            <div className="p-4">
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-400">&lt; 2 hrs</p>
              <p className="text-sm font-bold mt-1 text-white">Critical Waste Response</p>
              <p className="text-xs text-slate-300 mt-1">Priority protection rule ensures critical hazards are serviced first.</p>
            </div>
            <div className="p-4">
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-400">100%</p>
              <p className="text-sm font-bold mt-1 text-white">Digital Transparency</p>
              <p className="text-xs text-slate-300 mt-1">Full audit trail from resident submission to on-ground collection completion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Role Access ─────────────────────────────────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Designed for Every Stakeholder</h2>
          <p className="text-xs text-slate-500 mb-8">Access dedicated portals tailored for each operational role</p>

          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              to="/resident"
              className="card p-5 hover:border-green-300 hover:shadow-card-hover transition-all text-left group bg-white"
            >
              <span className="text-2xl">🏠</span>
              <p className="mt-3 font-bold text-slate-900 group-hover:text-green-700 transition-colors">
                Resident Portal
              </p>
              <p className="text-xs text-slate-500 mt-1">Submit waste pickups, track status in real-time, and contact assigned crews.</p>
            </Link>

            <Link
              to="/crew"
              className="card p-5 hover:border-green-300 hover:shadow-card-hover transition-all text-left group bg-white"
            >
              <span className="text-2xl">🚛</span>
              <p className="mt-3 font-bold text-slate-900 group-hover:text-green-700 transition-colors">
                Collection Crew
              </p>
              <p className="text-xs text-slate-500 mt-1">Follow smart road routes, view numbered stop sequences, and update progress.</p>
            </Link>

            <Link
              to="/admin"
              className="card p-5 hover:border-green-300 hover:shadow-card-hover transition-all text-left group bg-white"
            >
              <span className="text-2xl">📊</span>
              <p className="mt-3 font-bold text-slate-900 group-hover:text-green-700 transition-colors">
                Admin Control Center
              </p>
              <p className="text-xs text-slate-500 mt-1">Assign collection crews, inspect operations maps, and monitor city analytics.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 py-8 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center">
              <Leaf size={12} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">EcoSaathi</span>
            <span className="text-slate-300">|</span>
            <span>Smart Waste Collection for Cleaner Communities</span>
          </div>
          <p className="text-slate-400">
            Hackathon MVP · React + Leaflet + Express + MongoDB Atlas
          </p>
        </div>
      </footer>
    </div>
  );
}
