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
