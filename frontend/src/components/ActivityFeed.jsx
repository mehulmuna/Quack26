export default function ActivityFeed({ events }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Agent Activity</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">What the chaos engine is doing</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          Live feed
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {events.map((event) => (
          <article key={`${event.time}-${event.title}`} className="flex gap-4 rounded-2xl border border-white/8 bg-white/4 p-4 transition hover:border-cyan-300/25 hover:bg-white/6">
            <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-semibold text-cyan-100">
              {event.time}
            </div>
            <div>
              <h3 className="text-base font-medium text-white">{event.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{event.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
