import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, User, Mail, Lock, Phone, Truck, UserPlus, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage({ defaultRole }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { addToast } = useToast();

  const initialRole = defaultRole || searchParams.get('role') || 'resident';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    vehicleNumber: '',
    role: initialRole === 'crew' ? 'crew' : 'resident',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (form.role === 'crew' && !form.vehicleNumber?.trim()) {
      setError('Vehicle number is required for crew registration');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newUser = await register(form);

      if (newUser.role === 'crew') {
        addToast(`Crew application submitted! Awaiting administrator verification.`, 'info');
        navigate('/crew', { replace: true });
      } else {
        addToast(`Account created! Welcome, ${newUser.name}.`, 'success');
        navigate('/resident', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-slate-900 tracking-tight">EcoSaathi</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Create an account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Join EcoSaathi for smart waste collection & cleaner communities
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-7 px-6 shadow-card rounded-2xl border border-slate-200 sm:px-8">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Maya Patel"
                  className="input pl-9 w-full"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="maya@example.com"
                  className="input pl-9 w-full"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="input pl-9 w-full"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="input pl-9 w-full"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                I am registering as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role: 'resident' }))}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    form.role === 'resident'
                      ? 'border-green-600 bg-green-50/60 ring-1 ring-green-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">Resident</span>
                  <span className="text-[11px] text-slate-500">Request waste pickup & track status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role: 'crew' }))}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    form.role === 'crew'
                      ? 'border-green-600 bg-green-50/60 ring-1 ring-green-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">Crew Member</span>
                  <span className="text-[11px] text-slate-500">Collection driver / field team</span>
                </button>
              </div>
            </div>

            {/* Crew-specific fields & verification notice */}
            {form.role === 'crew' && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Vehicle Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Truck size={16} />
                    </div>
                    <input
                      type="text"
                      name="vehicleNumber"
                      required={form.role === 'crew'}
                      value={form.vehicleNumber}
                      onChange={handleChange}
                      placeholder="e.g. MH01AB1234"
                      className="input pl-9 w-full font-mono uppercase"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Admin Verification Required:</strong> New collection crew accounts undergo administrator approval before being assigned collection routes.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-medium mt-2 shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Register Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-green-600 hover:text-green-700">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
