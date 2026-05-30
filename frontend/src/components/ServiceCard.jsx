const statusStyles = {
  Healthy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  Warning: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  Critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
};

export default function ServiceCard({ service }) {
  const riskFillColor =
    service.risk >= 75 ? 'from-rose-500 to-orange-400' : service.risk >= 50 ? 'from-amber-400 to-yellow-300' : 'from-emerald-400 to-cyan-300';

  return (
    <article className="group rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-slate-950/75">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Service</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{service.name}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[service.status] ?? 'border-white/10 bg-white/5 text-slate-200'}`}>
          {service.status}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Risk score</span>
          <span className="font-medium text-white">{service.risk}/100</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${riskFillColor}`}
            style={{ width: `${service.risk}%` }}
          />
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-400">{service.summary}</p>
      <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-slate-300">
        {service.incident}
      </div>
    </article>
  );
}
