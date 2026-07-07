import { Award, CheckCircle2, Target, TrendingUp, XCircle } from "lucide-react";

type Stats = { totalSignals: number; signalsToday: number; highConfidenceAlerts: number; accuracy: number | null; correctSignals?: number; incorrectSignals?: number; highConfidenceAccuracy?: number | null };

export function StatsRow({ stats }: { stats: Stats }) {
  const items = [
    { label: "Signals Generated", value: stats.totalSignals.toString(), trend: "Live only", icon: TrendingUp },
    { label: "Correct Signals", value: String(stats.correctSignals ?? 0), trend: "Live only", icon: CheckCircle2 },
    { label: "Incorrect Signals", value: String(stats.incorrectSignals ?? 0), trend: "Live only", icon: XCircle },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "Pending", trend: "Live only", icon: Target },
    { label: "High Confidence Accuracy", value: stats.highConfidenceAccuracy !== null && stats.highConfidenceAccuracy !== undefined ? `${stats.highConfidenceAccuracy}%` : "Pending", trend: "Live only", icon: Award },
    { label: "Best Performing Strategy", value: "FOLLOW", trend: "Leading", icon: Award },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Agent Performance</p>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {items.map(({ label, value, trend, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-bg/50 p-4">
            <Icon className="h-4 w-4 text-text-muted" />
            <p className="mt-4 text-xs text-text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-text">{value}</p>
            <p className="mt-2 text-xs text-signal-green">{trend}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
