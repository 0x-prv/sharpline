import { Brain, Database, Radio, ShieldCheck, TrendingUp, Activity, Clock } from "lucide-react";
import { actionTone, explainAction, explainReason, formatMarketSelection } from "./copy";

const PROCESS_STEPS = [
  { number: "1", title: "Monitor", description: "Continuously listens to TxLINE live odds.", icon: Radio },
  { number: "2", title: "Detect", description: "Finds unusual market movement using deterministic rules.", icon: TrendingUp },
  { number: "3", title: "Explain", description: "Generates an AI explanation for every signal.", icon: Brain },
  { number: "4", title: "Store", description: "Persists every signal for historical analysis.", icon: Database },
  { number: "5", title: "Measure", description: "Tracks long-term accuracy after matches finish.", icon: ShieldCheck },
];

const WAITING_ACTIVITY = [
  { time: "14:40", title: "Worker started" },
  { time: "14:40", title: "Loaded today's fixtures" },
  { time: "14:40", title: "Connected to TxLINE" },
  { time: "14:41", title: "Waiting for first live kickoff" },
];

type Signal = { market: string; selection: string; previous_odds: number; current_odds: number; movement_pct: number; reason_code: string; action: string; confidence: number; occurred_at: string; is_demo: boolean };

export function AgentFlowLog({ signals }: { signals: Signal[] }) {
  const activity = signals.length > 0
    ? signals.slice(0, 4).map((signal) => ({
        time: new Date(signal.occurred_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
        title: `${formatMarketSelection(signal.market, signal.selection)} signal generated`,
      }))
    : WAITING_ACTIVITY;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-8">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">How SharpLine Works</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-text">Autonomous market intelligence from kickoff to resolution.</h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {PROCESS_STEPS.map(({ number, title, description, icon: Icon }, index) => (
            <div key={title} className="relative rounded-2xl border border-border bg-bg/50 p-5">
              {index < PROCESS_STEPS.length - 1 && <span className="absolute -right-3 top-1/2 hidden text-text-muted lg:block">↓</span>}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface">
                <Icon className="h-5 w-5 text-signal-blue" />
              </div>
              <p className="mt-6 font-data text-xs text-text-muted">{number}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-text">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-signal-green" />
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">System Activity</p>
          </div>
          <div className="mt-6 space-y-4">
            {activity.map((event) => (
              <div key={`${event.time}-${event.title}`} className="flex gap-4">
                <p className="w-12 font-data text-xs text-text-muted">{event.time}</p>
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2 w-2 rounded-full bg-signal-green" />
                  <span className="h-full min-h-6 w-px bg-border" />
                </div>
                <p className="text-sm text-text">{event.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Live Signal Feed</p>
          <div className="mt-5 space-y-3">
            {signals.length === 0 && (
              <div className="rounded-xl border border-border bg-bg/50 p-5">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-signal-green" />
                  <p className="font-display text-lg font-semibold text-text">Connected and listening</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-muted">No live odds movement has crossed the signal threshold yet. SharpLine will publish the first alert here automatically.</p>
              </div>
            )}
            {signals.map((s, i) => (
              <div key={`${s.occurred_at}-${i}`} className="rounded-xl border border-border bg-bg/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-text-muted">{new Date(s.occurred_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="mt-1 text-sm text-text">{formatMarketSelection(s.market, s.selection)} odds {Number(s.movement_pct) < 0 ? "dropped" : "moved"}</p>
                    <p className="mt-1 font-display text-lg text-text">{Number(s.previous_odds).toFixed(2)} → {Number(s.current_odds).toFixed(2)} <span className="text-sm text-signal-coral">({Number(s.movement_pct) > 0 ? "+" : ""}{Number(s.movement_pct).toFixed(1)}%)</span></p>
                    <p className="mt-2 text-xs text-text-muted">{explainReason(s.reason_code)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${actionTone(s.action)}`}>{explainAction(s.action)}</span>
                    <p className="mt-2 text-xs text-text-muted">Confidence {s.confidence}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
