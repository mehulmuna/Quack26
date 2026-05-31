export default function Infrastructure({ infrastructure }) {
  function statusTone(status) {
    if (status === 'Running' || status === 'Healthy') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
    if (status === 'Degraded') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
    return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Infrastructure Status</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Containers and health</h2>

      <div className="mt-5 space-y-3">
        {infrastructure.containers.map((container) => (
          <div key={container.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="font-medium text-white">{container.name}</p>
              <p className="text-xs text-slate-400">Container state</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(container.status)}`}>
              {container.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-white">{infrastructure.summary.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
          <p className="text-xs text-emerald-100/70">Healthy</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-100">{infrastructure.summary.healthy}</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-center">
          <p className="text-xs text-amber-100/70">Degraded</p>
          <p className="mt-1 text-2xl font-semibold text-amber-100">{infrastructure.summary.degraded}</p>
        </div>
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-center">
          <p className="text-xs text-rose-100/70">Offline</p>
          <p className="mt-1 text-2xl font-semibold text-rose-100">{infrastructure.summary.offline}</p>
        </div>
      </div>
    </div>
  );
}
