import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Send, AlertCircle, CheckCircle2, ArrowRight,
  Sparkles, ShieldAlert, ArrowLeft, Loader2, Info
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import MapPicker from '../components/maps/MapPicker';
import { createRequest } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../utils/usePageTitle';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { shortId } from '../utils/helpers';

const WASTE_TYPES = [
  { value: 'plastic',      label: 'Plastic',      icon: '🧴', desc: 'Bottles, containers, bags' },
  { value: 'paper',        label: 'Paper',        icon: '📄', desc: 'Cardboard, newspapers, boxes' },
  { value: 'glass',        label: 'Glass',        icon: '🍾', desc: 'Bottles, jars, glass pieces' },
  { value: 'metal',        label: 'Metal',        icon: '🥫', desc: 'Cans, scrap, foil, wires' },
  { value: 'organic',      label: 'Organic',      icon: '🌿', desc: 'Food waste, garden trimmings' },
  { value: 'e-waste',      label: 'E-Waste',      icon: '💻', desc: 'Batteries, electronics, cables' },
  { value: 'mixed',        label: 'Mixed Waste',  icon: '🗑️', desc: 'Non-segregated general trash' },
  { value: 'other',        label: 'Other',        icon: '📦', desc: 'Miscellaneous refuse' },
];

const QUANTITIES = [
  { value: 'small',  label: 'Small',  desc: '1–2 bags or 1 small bin' },
  { value: 'medium', label: 'Medium', desc: '3–5 bags or standard bin' },
  { value: 'large',  label: 'Large',  desc: 'Bulk waste or multiple large containers' },
];

const URGENCIES = [
  { value: 'low',    label: 'Low',    badge: 'Standard', desc: 'Flexible pickup time' },
  { value: 'medium', label: 'Medium', badge: 'Normal',   desc: 'Collect within 24–48 hours' },
  { value: 'high',   label: 'High',   badge: 'Urgent',   desc: 'Overflow / immediate collection needed' },
];

const INITIAL_FORM = {
  wasteType:   '',
  quantity:    'medium',
  urgency:     'medium',
  description: '',
  location:    { latitude: null, longitude: null, address: '' },
};

export default function RequestPickupPage() {
  usePageTitle('Request Pickup');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [createdRequest, setCreatedRequest] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  // Map click handler with non-blocking reverse geocoding
  const handleMapClick = useCallback((coords) => {
    const lat = parseFloat(coords.lat.toFixed(6));
    const lng = parseFloat(coords.lng.toFixed(6));

    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        latitude: lat,
        longitude: lng,
        address: prev.location.address || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      },
    }));
    setErrors((prev) => ({ ...prev, location: undefined }));

    // Attempt lightweight reverse geocode from OpenStreetMap Nominatim
    setGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.display_name) {
          const parts = data.display_name.split(', ');
          const shortAddress = parts.slice(0, 3).join(', ');
          setForm((prev) => ({
            ...prev,
            location: {
              ...prev.location,
              address: shortAddress || data.display_name,
            },
          }));
        }
      })
      .catch(() => {
        // Fallback gracefully without blocking
      })
      .finally(() => {
        setGeocoding(false);
      });
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.wasteType) {
      errs.wasteType = 'Please select a waste type';
    }
    if (!form.quantity) {
      errs.quantity = 'Please select estimated quantity';
    }
    if (!form.urgency) {
      errs.urgency = 'Please select urgency level';
    }
    if (form.location.latitude === null || form.location.longitude === null) {
      errs.location = 'Please tap on the map to select a pickup location';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      addToast('Please complete all required fields.', 'error');
      return;
    }

    try {
      setLoading(true);
      // Strictly send only wasteType, quantity, urgency, description, location
      // Backend automatically sets resident to req.user._id
      const payload = {
        wasteType: form.wasteType,
        quantity: form.quantity,
        urgency: form.urgency,
        description: form.description?.trim() || '',
        location: {
          latitude: form.location.latitude,
          longitude: form.location.longitude,
          address: form.location.address || `Coordinates: ${form.location.latitude}, ${form.location.longitude}`,
        },
      };

      const res = await createRequest(payload);
      if (res.data?.success && res.data?.data) {
        setCreatedRequest(res.data.data);
        addToast('Pickup request submitted successfully! 🎉', 'success');
      } else {
        throw new Error(res.data?.message || 'Failed to submit pickup request');
      }
    } catch (err) {
      addToast(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityExplanation = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'Your request was assigned CRITICAL priority due to immediate health/environmental hazards and high urgency.';
      case 'HIGH':
        return 'Your request received a HIGH priority because of its urgency, waste quantity and waiting time.';
      case 'MEDIUM':
        return 'Your request received a standard MEDIUM priority and is queued for scheduled collection.';
      default:
        return 'Your request received LOW priority and will be picked up during standard neighborhood collection rounds.';
    }
  };

  return (
    <DashboardLayout
      role="resident"
      title="Request a Waste Pickup"
      actions={
        <Link to="/resident" className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </Link>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Modal / State Screen */}
        {createdRequest ? (
          <div className="card p-6 sm:p-8 border-2 border-green-300 bg-gradient-to-b from-white to-green-50/30 shadow-card">
            <div className="text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pickup Request Submitted!</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Your request has been added to the EcoSaathi collection queue.
                </p>
              </div>

              {/* Request Summary Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-left space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Request ID
                    </span>
                    <p className="font-mono font-bold text-slate-900 text-sm">
                      {shortId(createdRequest._id)}
                    </p>
                  </div>
                  <StatusBadge status={createdRequest.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Waste Type:</span>
                    <p className="font-semibold text-slate-800 capitalize mt-0.5">
                      {createdRequest.wasteType}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Quantity:</span>
                    <p className="font-semibold text-slate-800 capitalize mt-0.5">
                      {createdRequest.quantity}
                    </p>
                  </div>
                </div>

                {/* Priority Breakdown Box */}
                <div className="bg-green-50/70 border border-green-200/80 rounded-lg p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-900">Assigned Priority</span>
                    <PriorityBadge
                      level={createdRequest.priorityLevel}
                      score={createdRequest.priorityScore}
                    />
                  </div>
                  <p className="text-xs text-green-800 mt-2 leading-relaxed">
                    {getPriorityExplanation(createdRequest.priorityLevel)}
                  </p>
                </div>

                {/* Location summary */}
                <div className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="truncate">
                    {createdRequest.location?.address ||
                      `${createdRequest.location?.latitude}, ${createdRequest.location?.longitude}`}
                  </span>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={`/resident/requests/${createdRequest._id}`}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm"
                >
                  <span>Track Request</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/resident"
                  className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm"
                >
                  <span>Back to Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Main Guided Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Page Header */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Request a Waste Pickup
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Tell us what needs to be collected and where we should pick it up.
              </p>
            </div>

            {/* 1. Waste Type Selector */}
            <div className="card p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="section-title">1. Select Waste Type *</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose the primary category of waste to be collected
                  </p>
                </div>
                {errors.wasteType && (
                  <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle size={13} />
                    {errors.wasteType}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {WASTE_TYPES.map(({ value, label, icon, desc }) => {
                  const isSelected = form.wasteType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, wasteType: value }));
                        setErrors((e) => ({ ...e, wasteType: undefined }));
                      }}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-green-600 bg-green-50/70 ring-2 ring-green-600 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{icon}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-green-600" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-900 block leading-tight">
                          {label}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Quantity & Urgency Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Quantity */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-title">2. Waste Quantity *</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Estimated volume to collect</p>
                  </div>
                  {errors.quantity && (
                    <span className="text-xs text-red-600 font-medium">{errors.quantity}</span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {QUANTITIES.map(({ value, label, desc }) => {
                    const isSelected = form.quantity === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, quantity: value }));
                          setErrors((e) => ({ ...e, quantity: undefined }));
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-green-600 bg-green-50/60 ring-1 ring-green-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-green-600 bg-green-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgency */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-title">3. Urgency Level *</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Impacts priority scoring</p>
                  </div>
                  {errors.urgency && (
                    <span className="text-xs text-red-600 font-medium">{errors.urgency}</span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {URGENCIES.map(({ value, label, badge, desc }) => {
                    const isSelected = form.urgency === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, urgency: value }));
                          setErrors((e) => ({ ...e, urgency: undefined }));
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-green-600 bg-green-50/60 ring-1 ring-green-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">{label}</p>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                value === 'high'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : value === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-green-600 bg-green-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Description (Optional) */}
            <div className="card p-5 space-y-2">
              <label className="section-title block">
                4. Description <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <p className="text-xs text-slate-400">
                Provide landmark details, gate codes, or special handling notes for the driver.
              </p>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tell us anything the collection team should know..."
                className="input w-full text-sm leading-relaxed"
                disabled={loading}
              />
            </div>

            {/* 4. Location Picker with Map */}
            <div className="card p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="section-title">5. Pickup Location *</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tap the map to select where the waste should be collected.
                  </p>
                </div>
                {errors.location && (
                  <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <AlertCircle size={13} />
                    {errors.location}
                  </span>
                )}
              </div>

              {/* Leaflet interactive Map */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                <MapPicker
                  value={
                    form.location.latitude && form.location.longitude
                      ? { lat: form.location.latitude, lng: form.location.longitude }
                      : null
                  }
                  onChange={handleMapClick}
                  height="340px"
                />
              </div>

              {/* Selected location card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    form.location.latitude ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <MapPin size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      📍 Selected Pickup Location
                    </p>
                    {geocoding && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Loader2 size={11} className="animate-spin" /> Resolving address...
                      </span>
                    )}
                  </div>
                  {form.location.latitude ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800">
                        {form.location.address || 'Location selected'}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        Coordinates: {form.location.latitude.toFixed(6)}, {form.location.longitude.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium mt-1">
                      Please select a pickup location on the map.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-md disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Submitting request...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Submit Pickup Request</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">
                Priority score will be auto-calculated by the EcoSaathi routing engine.
              </p>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
