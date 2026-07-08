import { Trophy } from "lucide-react";
import type { CompletedMatch } from "../lib/queries";

export function PastMatchSignals({ matches }: { matches: CompletedMatch[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Past Match Signals</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-text">Resolved signals from completed fixtures.</h2>
      <p className="mt-2 text-sm leading-6 text-text-muted">Replay previous TxLINE odds movement and review accuracy, confidence, and best match signals from stored production outcomes.</p>
      <div className="mt-5 space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg/50 p-6 text-sm text-text-muted">Historical performance updates automatically after each match.</div>
        ) : matches.map((match) => (
          <div key={match.id} className="rounded-xl border border-border bg-bg/50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-text">{match.home_team} vs {match.away_team}</p>
                <p className="mt-1 text-sm text-text-muted">Final {match.final_score ?? "Score pending"} · {match.status} · {match.finished_at ? new Date(match.finished_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Completed"}</p>
                {match.signals === 0 ? <p className="mt-2 text-sm text-signal-amber">No signals captured</p> : null}
                {!match.replayAvailable ? <p className="mt-1 text-xs text-text-muted">Replay unavailable — SharpLine was not running when this match was played.</p> : null}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted"><Trophy className="h-3.5 w-3.5 text-signal-green" /> ROI {formatNumber(match.roi)}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-7">
              <Mini label="Signals" value={String(match.signals)} />
              <Mini label="Resolved" value={String(match.resolvedSignals)} />
              <Mini label="Accuracy" value={match.accuracy === null ? "n/a" : `${match.accuracy}%`} />
              <Mini label="Best Signal" value={match.bestSignal ?? "n/a"} />
              <Mini label="Largest Move" value={match.largestOddsMovement === null ? "n/a" : `${match.largestOddsMovement.toFixed(1)}%`} />
              <Mini label="ROI" value={formatNumber(match.roi)} />
              <Mini label="Replay" value={match.replayAvailable ? "Available" : "Unavailable"} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface p-3"><p className="text-[10px] text-text-muted">{label}</p><p className="mt-1 font-display text-sm font-semibold text-text">{value}</p></div>;
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "n/a" : `${value > 0 ? "+" : ""}${value}`;
}
