export default function StatCard({ label, value, accent }) {
  return (
    <article className="fade-up rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-4xl font-semibold text-white">{value}</p>
        <div className={`h-2 w-14 rounded-full bg-gradient-to-r ${accent}`} />
      </div>
    </article>
  );
}
