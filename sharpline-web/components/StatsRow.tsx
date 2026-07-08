import { Award, CheckCircle2, Target, TrendingUp, XCircle } from "lucide-react";

type Stats = { totalSignals: number | null; signalsToday: number | null; highConfidenceAlerts: number | null; accuracy: number | null; correctSignals?: number | null; incorrectSignals?: number | null; highConfidenceAccuracy?: number | null; averageRoi?: number | null; avgConfidence?: number | null; bestStrategy?: string | null; totalOddsUpdatesToday?: number | null };

export function StatsRow({ stats }: { stats: Stats }) {
  const items = [
    { label: "Signals Generated", value: stats.totalSignals === null ? "Not reported yet" : stats.totalSignals > 0 ? stats.totalSignals.toString() : "No live signals yet", trend: "Historical tracking", icon: TrendingUp },
    { label: "Correct Signals", value: (stats.correctSignals ?? 0) > 0 ? String(stats.correctSignals) : "Waiting for first resolved signal", trend: "Resolution tracking", icon: CheckCircle2 },
    { label: "Incorrect Signals", value: (stats.incorrectSignals ?? 0) > 0 ? String(stats.incorrectSignals) : "Waiting for first resolved signal", trend: "Resolution tracking", icon: XCircle },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "Waiting for first resolved signal", trend: "Live only", icon: Target },
    { label: "Average ROI", value: stats.averageRoi !== null && stats.averageRoi !== undefined ? `${stats.averageRoi}` : "Waiting for first resolved signal", trend: "Stored outcomes", icon: Award },
    { label: "Best Performing Strategy", value: stats.bestStrategy ?? "Waiting for resolved data", trend: `${stats.avgConfidence ?? "n/a"}% avg confidence · ${stats.totalOddsUpdatesToday ?? 0} odds updates today`, icon: Award },
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
