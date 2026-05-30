export default function StatCard({ label, value, trend }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/6 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <h3 className="text-3xl font-semibold text-white">{value}</h3>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
          {trend}
        </span>
      </div>
    </article>
  );
}
