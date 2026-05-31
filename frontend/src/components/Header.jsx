export default function Header({ dashboard }) {
  return (
    <header className="surface-glow rounded-[2rem] border border-white/10 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">????</p>
          <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">NAME? TBD? </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            A single dashboard that shows test stats, service risk, reports, issues, infrastructure status, and current effects.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            {dashboard.activeExperiment.status}
          </span>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
            {dashboard.activeExperiment.attack}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            {dashboard.infrastructure.summary.total} containers live
          </span>
        </div>
      </div>
    </header>
  );
}
