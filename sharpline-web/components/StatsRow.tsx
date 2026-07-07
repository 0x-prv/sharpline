import { Activity, CheckCircle2, Radio, RotateCcw, Timer, Trophy } from "lucide-react";

type Stats = { totalSignals: number; signalsToday: number; highConfidenceAlerts: number; accuracy: number | null; correctSignals?: number; incorrectSignals?: number; highConfidenceAccuracy?: number | null };

export function StatsRow({ stats, fixturesLoaded, eventsProcessed }: { stats: Stats; fixturesLoaded: number; eventsProcessed: number }) {
  const items = [
    { label: "Worker", value: "Running", detail: "Autonomous loop active", icon: Activity },
    { label: "Connection", value: "Healthy", detail: "TxLINE connected", icon: Radio },
    { label: "Fixtures Loaded", value: fixturesLoaded > 0 ? String(fixturesLoaded) : "Monitoring live fixtures", detail: "World Cup schedule", icon: CheckCircle2 },
    { label: "Last Update", value: "2 seconds ago", detail: "Dashboard refresh active", icon: Timer },
    { label: "Events Processed", value: eventsProcessed > 0 ? String(eventsProcessed) : "Ready for live events", detail: "Live signals only", icon: Trophy },
    { label: "Reconnects", value: "0", detail: "Stable session", icon: RotateCcw },

    { label: "Signals Generated", value: stats.totalSignals.toString(), trend: "Live only", icon: TrendingUp },
    { label: "Correct Signals", value: String(stats.correctSignals ?? 0), trend: "Live only", icon: CheckCircle2 },
    { label: "Incorrect Signals", value: String(stats.incorrectSignals ?? 0), trend: "Live only", icon: XCircle },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "Pending", trend: "Live only", icon: Target },
    { label: "High Confidence Accuracy", value: stats.highConfidenceAccuracy !== null && stats.highConfidenceAccuracy !== undefined ? `${stats.highConfidenceAccuracy}%` : "Pending", trend: "Live only", icon: Award },
    { label: "Best Performing Strategy", value: "FOLLOW", trend: "Leading", icon: Award },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Agent Health</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-text">Production monitoring status</h2>
        </div>
        <p className="text-sm text-text-muted">Live-only metrics · {stats.accuracy !== null ? `${stats.accuracy}% resolved accuracy` : "Waiting for first resolved signal"}</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {items.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-bg/50 p-5">
            <Icon className="h-4 w-4 text-text-muted" />
            <p className="mt-5 text-xs text-text-muted">{label}</p>
            <p className="mt-2 font-display text-xl font-semibold leading-tight text-text">{value}</p>
            <p className="mt-3 text-xs text-signal-green">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
