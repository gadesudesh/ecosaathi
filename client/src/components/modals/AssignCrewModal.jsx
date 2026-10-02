import React, { useState } from 'react';
import { Truck, Check, X, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { assignRequest } from '../../services/api';
import {
  shortId,
  wasteTypeLabel,
  calculateDistanceKm,
  getWorkloadBadge,
} from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

export default function AssignCrewModal({
  request,
  crews = [],
  isOpen,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [selectedCrewId, setSelectedCrewId] = useState(
    request?.assignedCrew?._id || request?.assignedCrew || ''
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const currentCrewId = request.assignedCrew?._id || request.assignedCrew;
  const isReassignment = Boolean(currentCrewId);

  // Only approved collection crews can be assigned pickup requests
  const approvedCrews = crews.filter(
    (c) => c.verificationStatus === 'APPROVED' || !c.verificationStatus
  );

  const handleAssign = async () => {
    if (!selectedCrewId) {
      addToast('Please select a collection crew', 'warning');
      return;
    }

    if (selectedCrewId === currentCrewId) {
      addToast('This request is already assigned to the selected crew.', 'info');
      onClose();
      return;
    }

    try {
      setSubmitting(true);
      await assignRequest(request._id, selectedCrewId);
      const chosen = crews.find((c) => c._id === selectedCrewId);
      addToast(
        `Request ${shortId(request._id)} assigned to ${chosen?.name || 'crew'} successfully!`,
        'success'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to assign collection crew', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isReassignment ? 'Reassign Collection Crew' : 'Assign Collection Crew'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pickup <span className="font-mono font-bold text-slate-700">{shortId(request._id)}</span> ·{' '}
              {wasteTypeLabel(request.wasteType)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pickup Location Reminder */}
        {request.location && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs flex items-start gap-2">
            <MapPin size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                {request.location.address || 'Mumbai Pickup'}
              </p>
              <p className="text-slate-400 text-[11px] font-mono">
                {request.location.latitude?.toFixed(4)}, {request.location.longitude?.toFixed(4)}
              </p>
            </div>
          </div>
        )}

        {/* Crew List with Workload & Haversine Distance */}
        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Available Collection Crews
          </p>

          {approvedCrews.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No approved collection crews are currently available for assignment.
            </div>
          ) : (
            approvedCrews.map((crew) => {
              const isSelected = selectedCrewId === crew._id;
              const isCurrent = currentCrewId === crew._id;
              const activeCount = crew.assignedRequests?.length || 0;
              const workload = getWorkloadBadge(activeCount);

              const dist =
                crew.currentLocation && request.location
                  ? calculateDistanceKm(crew.currentLocation, request.location)
                  : null;

              return (
                <div
                  key={crew._id}
                  onClick={() => setSelectedCrewId(crew._id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-green-600 bg-green-50/50 ring-2 ring-green-600/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Truck size={18} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">{crew.name}</p>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {crew.vehicleNumber || 'Vehicle Active'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            crew.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : crew.status === 'BUSY'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {crew.status}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${workload.colorClass}`}
                        >
                          {workload.level} ({activeCount} tasks)
                        </span>

                        {dist && (
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            · Approx. {dist} km away
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            * Distance is approx. straight-line. Smart routing coming in Phase 08.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={submitting || !selectedCrewId}
              className="btn-primary text-xs py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm"
            >
              {submitting
                ? 'Assigning...'
                : isReassignment
                ? 'Confirm Reassignment'
                : 'Assign Crew'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
