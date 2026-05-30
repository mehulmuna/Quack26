export default function ExperimentPanel({ experiment }) {
  return (
    <section className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 via-slate-950/70 to-amber-300/10 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/60">Current Experiment</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Chaos in motion</h2>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
          {experiment.status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Target</p>
          <p className="mt-2 text-lg font-semibold text-white">{experiment.target}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Attack</p>
          <p className="mt-2 text-lg font-semibold text-white">{experiment.attack}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Progress</p>
          <p className="mt-2 text-lg font-semibold text-white">{experiment.progress}%</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Experiment progress</span>
          <span className="font-medium text-white">{experiment.progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-amber-300 transition-all duration-500"
            style={{ width: `${experiment.progress}%` }}
          />
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300">{experiment.impact}</p>
    </section>
  );
}
