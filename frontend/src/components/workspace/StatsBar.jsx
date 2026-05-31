import { Wrench, Coins, Clock } from "lucide-react";

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-muted/40">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold font-mono text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function StatsBar({ toolsCalled = 0, tokensUsed = 0, duration = 0 }) {
  const formatDuration = (s) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const formatTokens = (t) => {
    if (!t || t <= 0) return "-";
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return t.toString();
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatItem icon={Wrench} label="Tools Called" value={toolsCalled} color="text-primary" />
      <StatItem icon={Coins} label="Tokens Used" value={formatTokens(tokensUsed)} color="text-accent" />
      <StatItem icon={Clock} label="Duration" value={formatDuration(duration)} color="text-chart-3" />
    </div>
  );
}