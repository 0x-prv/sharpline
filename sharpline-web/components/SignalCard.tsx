import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { actionTone, explainAction, explainReason, formatMarketSelection } from "./copy";

type Signal = {
  fixture_id: string;
  match: string;
  market: string;
  selection: string;
  previous_odds: number;
  current_odds: number;
  movement_pct: number;
  direction: string;
  severity: string;
  confidence: number;
  reason_code: string;
  action: string;
  explanation: string;
  ai_provider: string;
  is_demo: boolean;
  occurred_at: string;
} | null;

export function SignalCard({ signal }: { signal: Signal }) {
  if (!signal) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Latest Alert</p>
        <h2 className="mt-6 font-display text-2xl font-semibold text-text">No live market alerts yet</h2>
        <p className="mt-3 text-sm leading-6 text-text-muted">SharpLine will generate alerts automatically once TxLINE odds begin moving during an active match.</p>
      </div>
    );
  }

  const movement = Number(signal.movement_pct);
  const checks = [
    `Odds moved ${Math.abs(movement).toFixed(1)}%`,
    signal.reason_code === "POST_EVENT_MOVE" ? "Move followed a match event" : "No goal occurred",
    "No red card occurred",
    "Market moved unusually",
  ];

  return (
    <article className="rounded-2xl border border-signal-coral/25 bg-surface p-6 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Latest Alert</p>
          <h2 className="mt-3 flex items-center gap-2 font-display text-2xl font-semibold text-text">
            <AlertTriangle className="h-5 w-5 text-signal-coral" /> Sharp Odds Movement Detected
          </h2>
        </div>
        <span className="rounded-full border border-border bg-surface-hover px-3 py-1 text-xs text-text-muted">
          LIVE
        </span>
      </div>

      <p className="mt-5 font-display text-xl text-text">{signal.match}</p>
      <p className="mt-1 text-sm text-text-muted">{formatMarketSelection(signal.market, signal.selection)}</p>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-border bg-bg/60 p-4">
        <Metric label="Previous Odds" value={Number(signal.previous_odds).toFixed(2)} />
        <span className="text-2xl text-text-muted">↓</span>
        <Metric label="Current Odds" value={Number(signal.current_odds).toFixed(2)} align="right" />
        <div className="col-span-3 text-center font-display text-lg text-signal-coral">({movement > 0 ? "+" : ""}{movement.toFixed(1)}%)</div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-bg/50 p-4">
          <p className="text-xs text-text-muted">Decision</p>
          <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${actionTone(signal.action)}`}>{explainAction(signal.action)}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg/50 p-4">
          <p className="text-xs text-text-muted">Confidence</p>
          <p className="mt-2 font-display text-2xl font-semibold text-text">{signal.confidence}%</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="font-display text-sm font-medium text-text">Why was this flagged?</p>
        <div className="mt-3 space-y-2">
          {checks.map((check) => (
            <p key={check} className="flex items-center gap-2 text-sm text-text-muted"><CheckCircle2 className="h-4 w-4 text-signal-green" /> {check}</p>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg/50 p-4">
        <p className="text-xs text-text-muted">Possible interpretation</p>
        <p className="mt-2 text-sm leading-6 text-text">{signal.explanation || explainReason(signal.reason_code) || "Professional market participants may have entered the market."}</p>
      </div>
    </article>
  );
}

function Metric({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" }) {
  return <div className={align === "right" ? "text-right" : ""}><p className="text-xs text-text-muted">{label}</p><p className="mt-1 font-display text-3xl font-semibold text-text">{value}</p></div>;
}
