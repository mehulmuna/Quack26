const statusStyles = {
  Running: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Healthy: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  Degraded: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Offline: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

export default function ServiceCard({ service }) {
  const riskFillColor =
    service.risk >= 70 ? 'from-rose-500 to-orange-400' : service.risk >= 40 ? 'from-amber-400 to-yellow-300' : 'from-emerald-400 to-cyan-300';

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">{service.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Dependencies: {service.dependencies}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[service.status] ?? 'border-white/10 bg-white/5 text-slate-200'}`}>
          {service.status}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Risk score</span>
          <span className="font-medium text-white">{service.risk}/100</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-gradient-to-r ${riskFillColor}`} style={{ width: `${service.risk}%` }} />
        </div>
      </div>
    </article>
  );
}
