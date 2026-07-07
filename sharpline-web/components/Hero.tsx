import { Activity, Brain, Database, Radio, ShieldCheck, Target, TrendingUp, Timer } from "lucide-react";

type Stats = {
  signalsToday: number;
  highConfidenceAlerts: number;
  accuracy: number | null;
};

const CAPABILITIES = [
  { label: "Live TxLINE Monitoring", icon: Radio },
  { label: "Autonomous Signal Detection", icon: TrendingUp },
  { label: "AI Explanations", icon: Brain },
  { label: "Historical Accuracy Tracking", icon: Database },
];

export function Hero({ stats, hasActiveMatch }: { stats: Stats; hasActiveMatch: boolean }) {
  const statusCards = [
    { label: "Agent Status", value: "Running", detail: "Connected and listening", icon: Activity, dot: "bg-signal-green" },
    { label: "TxLINE", value: hasActiveMatch ? "Connected" : "Waiting for next TxLINE match", detail: hasActiveMatch ? "Monitoring live odds" : "Ready for live processing", icon: Radio, dot: hasActiveMatch ? "bg-signal-green" : "bg-signal-amber" },
    { label: "Current State", value: hasActiveMatch ? "Monitoring" : "Waiting for kickoff", detail: "Autonomous worker active", icon: Timer, dot: hasActiveMatch ? "bg-signal-green" : "bg-signal-amber" },
    { label: "Signals Today", value: stats.signalsToday > 0 ? String(stats.signalsToday) : "No live signals yet", detail: "Signals appear automatically", icon: TrendingUp, dot: "bg-signal-blue" },
    { label: "High Confidence Alerts", value: stats.highConfidenceAlerts > 0 ? String(stats.highConfidenceAlerts) : "No alerts generated yet", detail: "No live market alerts yet", icon: Target, dot: "bg-signal-coral" },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "Waiting for first resolved signal", detail: "Historical performance tracking", icon: ShieldCheck, dot: "bg-signal-green" },
  ];

  return (
    <section className="border-b border-border bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-text">SharpLine</h1>
            <p className="mt-3 font-display text-xl text-text">Autonomous Sports Market Intelligence</p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-muted">
              SharpLine continuously monitors TxLINE live odds, automatically detects unusual market movements, explains every signal, and tracks historical performance.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {CAPABILITIES.map(({ label, icon: Icon }) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted">
                  <Icon className="h-3.5 w-3.5 text-signal-blue" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-text-muted">
            {hasActiveMatch ? "LIVE · Connected to TxLINE" : "LIVE · Waiting for next TxLINE match"}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {statusCards.map(({ label, value, detail, icon: Icon, dot }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-text-muted" />
                <span className={`h-2 w-2 rounded-full ${dot}`} />
              </div>
              <p className="mt-5 text-xs text-text-muted">{label}</p>
              <p className="mt-1 font-display text-xl font-semibold leading-tight text-text">{value}</p>
              <p className="mt-2 text-[11px] text-text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
