import {
  getStatusBadgeClass, getStatusLabel,
  getPriorityBadgeClass, getCrewStatusBadgeClass,
} from '../../utils/helpers';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ level, score }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityBadgeClass(level)}`}>
      {level || '—'}
      {score !== undefined && score !== null && (
        <span className="opacity-70">({score})</span>
      )}
    </span>
  );
}

export function CrewStatusBadge({ status }) {
  const dot = {
    AVAILABLE: 'bg-green-500',
    BUSY:      'bg-orange-400',
    OFFLINE:   'bg-slate-400',
  }[status] || 'bg-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCrewStatusBadgeClass(status)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status || '—'}
    </span>
  );
}

export function VerificationStatusBadge({ status }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        APPROVED
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
        REJECTED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
      PENDING VERIFICATION
    </span>
  );
}

