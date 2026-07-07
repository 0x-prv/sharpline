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
        <p className="text-sm text-text-muted">No tracked fixture yet.</p>
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