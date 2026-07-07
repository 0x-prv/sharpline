type Signal = {
  fixture_id: string;
  market: string;
  selection: string;
  price_before: number;
  price_after: number;
  pct_change: number;
  classification: string;
  confidence: number;
  detected_at: string;
} | null;

export function SignalCard({ signal }: { signal: Signal }) {
  if (!signal) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="font-data text-xs text-text-muted">Latest signal</p>
        <p className="mt-3 text-sm text-text-muted">
          No signals detected yet. Sharpline is watching the live feed.
        </p>
      </div>
    );
  }

  const isUnexplained = signal.classification === "unexplained";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isUnexplained
          ? "border-signal-coral/30 bg-signal-coral/[0.06]"
          : "border-signal-green/30 bg-signal-green/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-data text-xs text-text-muted">Latest signal</p>
        <span
          className={`rounded-full px-2 py-0.5 font-data text-[11px] ${
            isUnexplained
              ? "bg-signal-coral/15 text-signal-coral"
              : "bg-signal-green/15 text-signal-green"
          }`}
        >
          {isUnexplained ? "Unexplained" : "Explained"}
        </span>
      </div>

      <p className="mt-3 text-sm text-text-muted">Market</p>
      <p className="text-[15px] text-text">
        {signal.market} · {signal.selection}
      </p>

      <p className="mt-3 text-sm text-text-muted">Shift</p>
      <p className="font-data text-[15px] text-text">
        {signal.price_before.toFixed(2)} → {signal.price_after.toFixed(2)} (
        {signal.pct_change > 0 ? "+" : ""}
        {signal.pct_change.toFixed(1)}%)
      </p>

      <p className="mt-3 text-sm text-text-muted">Confidence</p>
      <p className="font-data text-[15px] text-text">
        {signal.confidence.toFixed(0)}%
      </p>
    </div>
  );
}