export default function Issues({ issues }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Issues Found</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Problem cards</h2>

      <div className="mt-5 space-y-3">
        {issues.map((issue) => (
          <article key={`${issue.severity}-${issue.title}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs ${issue.severity === 'HIGH' ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : issue.severity === 'MEDIUM' ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-slate-400/30 bg-slate-400/10 text-slate-200'}`}>
                {issue.severity}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-100">{issue.title}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
