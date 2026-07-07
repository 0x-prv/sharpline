import { Brain, Database, Radio, ShieldCheck, TrendingUp } from "lucide-react";
import { actionTone, explainAction, explainReason, formatMarketSelection } from "./copy";

const PROCESS_STEPS = [
  { title: "Monitor", body: "Continuously listens to TxLINE live odds.", icon: Radio },
  { title: "Detect", body: "Finds unusual market movement using deterministic rules.", icon: TrendingUp },
  { title: "Explain", body: "Generates an AI explanation for every signal.", icon: Brain },
  { title: "Store", body: "Persists every signal for historical analysis.", icon: Database },
  { title: "Measure", body: "Tracks long-term accuracy after matches finish.", icon: ShieldCheck },
];

const FALLBACK_EVENTS = ["Worker started", "Loaded today’s fixtures", "Connected to TxLINE", "Waiting for first live kickoff"];

type Signal = { market: string; selection: string; previous_odds: number; current_odds: number; movement_pct: number; reason_code: string; action: string; confidence: number; occurred_at: string; is_demo: boolean };

export function AgentFlowLog({ signals }: { signals: Signal[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">How SharpLine Works</p>
        <div className="mt-5 space-y-3">
          {PROCESS_STEPS.map(({ title, body, icon: Icon }, index) => (
            <div key={title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg"><Icon className="h-4 w-4 text-signal-blue" /></div>
                {index < PROCESS_STEPS.length - 1 && <div className="h-7 w-px bg-border" />}
              </div>
              <div className="pt-1">
                <p className="text-sm font-medium text-text">{index + 1}. {title}</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">System Activity</p>
        <div className="mt-5 space-y-3">
          {signals.length === 0 && FALLBACK_EVENTS.map((event, index) => (
            <div key={event} className="flex items-center justify-between rounded-xl border border-border bg-bg/50 p-4">
              <div>
                <p className="text-sm text-text">{event}</p>
                <p className="mt-1 text-xs text-text-muted">{index === FALLBACK_EVENTS.length - 1 ? "Signals will appear automatically once TxLINE odds begin moving during an active match." : "Connected and listening"}</p>
              </div>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">{index === 0 ? "Started" : "Ready"}</span>
            </div>
          ))}
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
  );
}
