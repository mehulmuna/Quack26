export default function ActivityFeed({ events }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Agent Activity Feed</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">What the agent did</h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {events.map((event) => (
          <div key={`${event.time}-${event.message}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-cyan-200">{event.time}</p>
            <p className="mt-1 text-sm text-slate-100">{event.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
