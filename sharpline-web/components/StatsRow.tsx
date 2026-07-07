type Stats = {
  totalSignals: number;
  explainedCount: number;
  unexplainedCount: number;
  accuracy: number | null;
};

export function StatsRow({ stats }: { stats: Stats }) {
  const items = [
    { label: "Signals logged", value: stats.totalSignals.toString() },
    {
      label: "Resolved accuracy",
      value: stats.accuracy !== null ? `${stats.accuracy}%` : "—",
    },
    {
      label: "Explained / Unexplained",
      value: `${stats.explainedCount} / ${stats.unexplainedCount}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="font-data text-xs text-text-muted">{item.label}</p>
          <p className="mt-1.5 font-display text-2xl font-medium text-text">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}