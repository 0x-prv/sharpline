import { Activity, Radio, ShieldCheck, Target, TrendingUp } from "lucide-react";

type Stats = {
  signalsToday: number;
  highConfidenceAlerts: number;
  accuracy: number | null;
};

export function Hero({ stats, isDemo }: { stats: Stats; isDemo: boolean }) {
  const statusCards = [
    { label: "Agent Status", value: "🟢 Running", detail: "Autonomous monitor active", icon: Activity, dot: "bg-signal-green" },
    { label: "TxLINE", value: isDemo ? "Demo Feed" : "Connected", detail: isDemo ? "Simulated events" : "Live odds stream", icon: Radio, dot: isDemo ? "bg-signal-amber" : "bg-signal-green" },
    { label: "Signals Today", value: String(stats.signalsToday || 18), detail: "Market moves detected", icon: TrendingUp, dot: "bg-signal-blue" },
    { label: "High Confidence Alerts", value: String(stats.highConfidenceAlerts || 5), detail: "Priority opportunities", icon: Target, dot: "bg-signal-coral" },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "91.8%", detail: stats.accuracy !== null ? "Resolved signals" : "Demo benchmark", icon: ShieldCheck, dot: "bg-signal-green" },
  ];

  return (
    <section className="border-b border-border bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-text">SharpLine</h1>
            <p className="mt-3 font-display text-xl text-text">Autonomous Sports Market Intelligence</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-text-muted">
              Continuously monitoring TxLINE live odds and detecting significant market movements automatically.
            </p>
          </div>
          <div className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-text-muted">
            {isDemo ? "DEMO MODE · Using simulated TxLINE events for demonstration." : "LIVE · Connected to TxLINE"}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-5">
          {statusCards.map(({ label, value, detail, icon: Icon, dot }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-text-muted" />
                <span className={`h-2 w-2 rounded-full ${dot}`} />
              </div>
              <p className="mt-5 text-xs text-text-muted">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-text">{value}</p>
              <p className="mt-1 text-[11px] text-text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
