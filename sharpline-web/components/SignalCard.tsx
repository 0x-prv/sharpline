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
  if (!signal) return <div className="rounded-xl border border-border bg-surface p-5"><p className="font-data text-xs text-text-muted">Latest signal</p><p className="mt-3 text-sm text-text-muted">No stored signals yet. Run the worker or `npm run demo`.</p></div>;
  const alert = signal.action === "ALERT" || signal.severity === "critical";
  return (
    <div className={`rounded-xl border p-5 ${alert ? "border-signal-coral/30 bg-signal-coral/[0.06]" : "border-signal-green/30 bg-signal-green/[0.06]"}`}>
      <div className="flex items-center justify-between gap-3"><p className="font-data text-xs text-text-muted">Latest signal</p><span className="rounded-full bg-surface px-2 py-0.5 font-data text-[11px] text-text-muted">{signal.is_demo ? "DEMO MODE" : "LIVE"}</span></div>
      <h2 className="mt-3 font-display text-xl text-text">{signal.action} · {signal.reason_code}</h2>
      <p className="mt-2 text-sm text-text-muted">{signal.match}</p>
      <p className="mt-3 text-sm text-text-muted">{signal.market} · {signal.selection}</p>
      <p className="font-data text-[15px] text-text">{Number(signal.previous_odds).toFixed(2)} → {Number(signal.current_odds).toFixed(2)} ({Number(signal.movement_pct) > 0 ? "+" : ""}{Number(signal.movement_pct).toFixed(1)}%)</p>
      <div className="mt-3 grid grid-cols-3 gap-2 font-data text-xs text-text-muted"><span>Severity: {signal.severity}</span><span>Confidence: {signal.confidence}%</span><span>AI: {signal.ai_provider}</span></div>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">{signal.explanation}</p>
    </div>
  );
}
