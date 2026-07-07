const PIPELINE_STEPS = ["Stream", "Normalize", "Detect", "Correlate", "Log"];

type Signal = {
  fixture_id: string;
  market: string;
  selection: string;
  pct_change: number;
  classification: string;
  detected_at: string;
};

export function AgentFlowLog({ signals }: { signals: Signal[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-data text-xs text-text-muted">
        Autonomous agent flow
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            <span className="rounded-md bg-surface-hover px-2.5 py-1 font-data text-[11px] text-text-muted">
              {step}
            </span>
            {i < PIPELINE_STEPS.length - 1 && (
              <span className="text-text-muted">→</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5 font-data text-[11.5px] leading-relaxed text-text-muted">
        {signals.length === 0 && (
          <p>Waiting for the next sharp movement...</p>
        )}
        {signals.map((s, i) => (
          <div key={i}>
            {new Date(s.detected_at).toLocaleTimeString("en-US", {
              hour12: false,
            })}
            {"  "}
            [detect] {s.market}/{s.selection} moved {s.pct_change > 0 ? "+" : ""}
            {s.pct_change.toFixed(1)}% → classified {s.classification}
          </div>
        ))}
      </div>
    </div>
  );
}