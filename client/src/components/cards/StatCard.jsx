// KPI stat card used on dashboards
export default function StatCard({ icon: Icon, label, value, sub, color = 'green' }) {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  border: 'border-amber-100' },
    blue:   { bg: 'bg-sky-50',    icon: 'text-sky-600',    border: 'border-sky-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-500',    border: 'border-red-100' },
    slate:  { bg: 'bg-slate-100', icon: 'text-slate-500',  border: 'border-slate-200' },
  };
  const c = colors[color] || colors.green;

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium leading-none mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}
