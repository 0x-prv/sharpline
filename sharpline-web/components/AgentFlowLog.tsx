const PIPELINE_STEPS = ["TxLINE", "Normalize", "Detect", "Explain", "Persist"];

type Signal = { market: string; selection: string; movement_pct: number; reason_code: string; action: string; occurred_at: string; is_demo: boolean };

export function AgentFlowLog({ signals }: { signals: Signal[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-data text-xs text-text-muted">Autonomous agent flow</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">{PIPELINE_STEPS.map((step, i) => <div key={step} className="flex items-center gap-1.5"><span className="rounded-md bg-surface-hover px-2.5 py-1 font-data text-[11px] text-text-muted">{step}</span>{i < PIPELINE_STEPS.length - 1 && <span className="text-text-muted">→</span>}</div>)}</div>
      <div className="mt-4 space-y-1.5 font-data text-[11.5px] leading-relaxed text-text-muted">
        {signals.length === 0 && <p>Waiting for stored live or demo signals...</p>}
        {signals.map((s, i) => <div key={i}>{new Date(s.occurred_at).toLocaleTimeString("en-US", { hour12: false })} [{s.is_demo ? "demo" : "live"}] {s.market}/{s.selection} moved {Number(s.movement_pct) > 0 ? "+" : ""}{Number(s.movement_pct).toFixed(1)}% → {s.reason_code} → {s.action}</div>)}
      </div>
    </div>
  );
}
