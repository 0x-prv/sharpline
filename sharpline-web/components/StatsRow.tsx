type Stats = { totalSignals: number; signalsToday: number; highConfidenceAlerts: number; accuracy: number | null };
export function StatsRow({ stats }: { stats: Stats }) {
  const items = [
    ["Signals Today", stats.signalsToday.toString()],
    ["High Confidence Alerts", stats.highConfidenceAlerts.toString()],
    ["Accuracy %", stats.accuracy !== null ? `${stats.accuracy}%` : "—"],
    ["Stored Signals", stats.totalSignals.toString()],
  ];
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">{items.map(([label,value])=><div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="font-data text-xs text-text-muted">{label}</p><p className="mt-1.5 font-display text-2xl font-medium text-text">{value}</p></div>)}</div>;
}
