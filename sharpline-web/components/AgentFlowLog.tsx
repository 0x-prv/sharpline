import { Brain, Database, Radio, ShieldCheck, TrendingUp } from "lucide-react";
import { actionTone, explainAction, explainReason, formatMarketSelection } from "./copy";

const PIPELINE_STEPS = [
  { title: "Live TxLINE Data", icon: Radio },
  { title: "SharpLine detects unusual movement", icon: TrendingUp },
  { title: "Deterministic rules classify the signal", icon: ShieldCheck },
  { title: "AI explains the reason", icon: Brain },
  { title: "Signal stored for historical accuracy", icon: Database },
];

type Signal = { market: string; selection: string; previous_odds: number; current_odds: number; movement_pct: number; reason_code: string; action: string; confidence: number; occurred_at: string; is_demo: boolean };

export function AgentFlowLog({ signals }: { signals: Signal[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Autonomous Pipeline</p>
        <div className="mt-5 space-y-3">
          {PIPELINE_STEPS.map(({ title, icon: Icon }, index) => (
            <div key={title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg"><Icon className="h-4 w-4 text-signal-blue" /></div>
                {index < PIPELINE_STEPS.length - 1 && <div className="h-5 w-px bg-border" />}
              </div>
              <p className="pt-2 text-sm text-text">{title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Live Signal Feed</p>
        <div className="mt-5 space-y-3">
          {signals.length === 0 && <p className="text-sm text-text-muted">Waiting for stored live or demo signals...</p>}
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
