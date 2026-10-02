import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Mail, Lock, LogIn, AlertCircle, ArrowRight, ShieldCheck, Truck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || null;

  const redirectUser = (role) => {
    if (from && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'crew') navigate('/crew', { replace: true });
    else navigate('/resident', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name}!`, 'success');
      redirectUser(user.role);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click Demo Login for hackathon evaluation
  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    try {
      setLoading(true);
      setError(null);
      const user = await login(demoEmail, demoPassword);
      addToast(`Logged in as ${user.name} (${user.role})`, 'success');
      redirectUser(user.role);
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-slate-900 tracking-tight">EcoSaathi</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Smart Waste Collection for Cleaner Communities
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Main login card */}
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200 sm:px-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input pl-9 w-full"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-9 w-full"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-medium mt-2 shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Hackathon MVP */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              ⚡ Quick Demo 1-Click Login
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@ecoroute.demo', 'admin123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 hover:border-green-300 transition-colors group text-center"
              >
                <ShieldCheck size={16} className="text-slate-600 group-hover:text-green-600 mb-1" />
                <span className="text-xs font-medium text-slate-700 group-hover:text-green-800">Admin</span>
                <span className="text-[10px] text-slate-400">Full Access</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('crew@ecoroute.demo', 'crew123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 hover:border-green-300 transition-colors group text-center"
              >
                <Truck size={16} className="text-slate-600 group-hover:text-green-600 mb-1" />
                <span className="text-xs font-medium text-slate-700 group-hover:text-green-800">Crew</span>
                <span className="text-[10px] text-slate-400">Crew Alpha</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('rahul@ecoroute.demo', 'resident123')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 hover:border-green-300 transition-colors group text-center"
              >
                <User size={16} className="text-slate-600 group-hover:text-green-600 mb-1" />
                <span className="text-xs font-medium text-slate-700 group-hover:text-green-800">Resident</span>
                <span className="text-[10px] text-slate-400">Rahul Sharma</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-green-600 hover:text-green-700">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
