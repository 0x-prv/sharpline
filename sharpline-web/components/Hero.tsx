import { Activity, Radio, ShieldCheck, Target, TrendingUp, Timer } from "lucide-react";

type Stats = {
  signalsToday: number;
  highConfidenceAlerts: number;
  accuracy: number | null;
};

export function Hero({ stats, hasActiveMatch }: { stats: Stats; hasActiveMatch: boolean }) {
  const statusCards = [
    { label: "Agent Status", value: "Running", detail: "Autonomous monitor active", icon: Activity, dot: "bg-signal-green" },
    { label: "TxLINE", value: hasActiveMatch ? "Connected" : "Waiting", detail: hasActiveMatch ? "Monitoring live odds" : "Waiting for next match", icon: Radio, dot: hasActiveMatch ? "bg-signal-green" : "bg-signal-amber" },
    { label: "Current State", value: hasActiveMatch ? "Monitoring live odds" : "Waiting for match", detail: "Live-first dashboard", icon: Timer, dot: hasActiveMatch ? "bg-signal-green" : "bg-signal-amber" },
    { label: "Signals Today", value: String(stats.signalsToday), detail: "Live signals only", icon: TrendingUp, dot: "bg-signal-blue" },
    { label: "High Confidence Alerts", value: String(stats.highConfidenceAlerts), detail: "Live alerts only", icon: Target, dot: "bg-signal-coral" },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "Pending", detail: "Live resolved signals only", icon: ShieldCheck, dot: "bg-signal-green" },
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
            {hasActiveMatch ? "LIVE · Connected to TxLINE" : "LIVE · Waiting for next TxLINE match"}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
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
