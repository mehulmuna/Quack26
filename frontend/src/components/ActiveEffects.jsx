export default function ActiveEffects({ effects }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Current Effects</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Chaos currently applied</h2>

      <div className="mt-5 space-y-3">
        {effects && effects.length > 0 ? (
          effects.map((effect) => (
            <div key={effect} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-cyan-50">
              <p className="font-medium">{effect}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-slate-300">
            No active effects
          </div>
        )}
      </div>
    </div>
  );
}
