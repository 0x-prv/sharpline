import { Activity, CheckCircle2, Radio, ShieldCheck, Sparkles, Target, TrendingUp, Timer } from "lucide-react";

type Stats = {
  signalsToday: number;
  highConfidenceAlerts: number;
  accuracy: number | null;
};

const CAPABILITIES = [
  "Live TxLINE Monitoring",
  "Autonomous Signal Detection",
  "AI Explanations",
  "Historical Accuracy Tracking",
];

export function Hero({ stats, hasActiveMatch }: { stats: Stats; hasActiveMatch: boolean }) {
  const statusCards = [
    { label: "Agent Status", value: "Running", detail: "Autonomous monitor active", icon: Activity, dot: "bg-signal-green" },
    { label: "TxLINE", value: "Connected", detail: hasActiveMatch ? "Monitoring live odds" : "Connected and listening", icon: Radio, dot: "bg-signal-green" },
    { label: "Current State", value: hasActiveMatch ? "Monitoring live odds" : "🟢 Monitoring", detail: hasActiveMatch ? "Live odds processing" : "Waiting for next World Cup kickoff", icon: Timer, dot: "bg-signal-green" },
    { label: "Signals Today", value: stats.signalsToday > 0 ? String(stats.signalsToday) : "No live signals yet", detail: "Live signals only", icon: TrendingUp, dot: "bg-signal-blue" },
    { label: "High Confidence Alerts", value: stats.highConfidenceAlerts > 0 ? String(stats.highConfidenceAlerts) : "No alerts generated yet", detail: "Live alerts only", icon: Target, dot: "bg-signal-coral" },
    { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "Waiting for first resolved signal", detail: "Live resolved signals only", icon: ShieldCheck, dot: "bg-signal-green" },
  ];

  return (
    <section className="border-b border-border bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-5xl font-semibold tracking-tight text-text">SharpLine</h1>
            <p className="mt-3 font-display text-xl text-text">Autonomous Sports Market Intelligence</p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-muted">
              SharpLine continuously monitors TxLINE live odds, automatically detects unusual market movements, explains every signal, and tracks historical performance.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {CAPABILITIES.map((capability) => (
                <span key={capability} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-signal-green" />
                  {capability}
                </span>
              ))}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-signal-green" />
            {hasActiveMatch ? "LIVE · Connected to TxLINE" : "LIVE · Waiting for next TxLINE match"}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statusCards.map(({ label, value, detail, icon: Icon, dot }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-text-muted" />
                <span className={`h-2 w-2 rounded-full ${dot}`} />
              </div>
              <p className="mt-6 text-xs text-text-muted">{label}</p>
              <p className="mt-2 font-display text-xl font-semibold leading-tight text-text">{value}</p>
              <p className="mt-2 text-[11px] text-text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
