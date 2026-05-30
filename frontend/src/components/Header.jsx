export default function Header() {
  return (
    <header className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/55">Quack26 Control Center</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          AI Chaos Monkey
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
          A polished chaos engineering dashboard for service risk, agent actions, and experiment status.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 md:min-w-[280px]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Mode</p>
          <p className="mt-1 font-medium text-white">Demo-ready</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Backend</p>
          <p className="mt-1 font-medium text-white">Express</p>
        </div>
      </div>
    </header>
  );
}
