type Fixture = {
  id: string;
  home_team: string;
  away_team: string;
  status: string;
  kickoff_at: string | null;
} | null;

export function MatchHeader({ fixture }: { fixture: Fixture }) {
  if (!fixture) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-2xl font-semibold text-text">Waiting for the next live match</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">SharpLine is connected and monitoring TxLINE fixtures. Signals will appear automatically when odds move during an active match.</p>
      </div>
    );
  }

  const kickoff = fixture.kickoff_at
    ? new Date(fixture.kickoff_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "TBD";

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-medium text-text">
          {fixture.home_team}
        </span>
        <span className="font-data text-sm text-text-muted">vs</span>
        <span className="font-display text-lg font-medium text-text">
          {fixture.away_team}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            fixture.status === "live_or_upcoming"
              ? "bg-signal-green"
              : "bg-text-muted"
          }`}
        />
        <span className="font-data text-xs text-text-muted">{kickoff}</span>
      </div>
    </div>
  );
}