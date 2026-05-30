export default function ExperimentPanel({ experiment }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Active Experiment</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Current attacks in progress</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${experiment.status === 'Running' || experiment.status === 'Healthy' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : experiment.status === 'Degraded' ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-200'}`}>
          {experiment.status}
        </span>
      </div>

      <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Target</p>
          <p className="mt-2 text-xl font-medium text-white">{experiment.target}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Attack</p>
            <p className="mt-2 text-sm text-slate-100">{experiment.attack}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Duration</p>
            <p className="mt-2 text-sm text-slate-100">{experiment.duration}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Expected impact</p>
            <p className="mt-2 text-sm text-slate-100">{experiment.expectedImpact}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Progress</span>
            <span className="font-medium text-white">{experiment.progress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300" style={{ width: `${experiment.progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-cyan-100">{experiment.message}</p>
        </div>
      </div>
    </section>
  );
}
