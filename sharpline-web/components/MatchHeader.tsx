import { CheckCircle2 } from "lucide-react";

type Fixture = {
  id: string;
  home_team: string;
  away_team: string;
  status: string;
  kickoff_at: string | null;
} | null;

const STATUS_ITEMS = [
  "Worker Running",
  "TxLINE Connected",
  "Fixtures Loaded",
  "Waiting for Kickoff",
  "Signal Engine Ready",
];

export function MatchHeader({ fixture }: { fixture: Fixture }) {
  const kickoff = fixture?.kickoff_at
    ? new Date(fixture.kickoff_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Next scheduled kickoff";

  return (
    <section className="rounded-2xl border border-border bg-surface p-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Current Agent Status</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-text">
            {fixture ? `${fixture.home_team} vs ${fixture.away_team}` : "Monitoring live fixtures"}
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-text-muted">
            <p>SharpLine has successfully loaded today's World Cup fixtures and is actively monitoring the TxLINE live feed.</p>
            <p>
              While no matches are currently live, the agent remains connected and will automatically begin processing odds movement as soon as kickoff begins.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg/50 p-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs text-text-muted">Next action</p>
              <p className="mt-1 font-display text-xl font-semibold text-text">Ready for live processing</p>
            </div>
            <p className="font-data text-xs text-text-muted">{kickoff}</p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STATUS_ITEMS.map((item) => (
              <p key={item} className="flex items-center gap-2 text-sm text-text">
                <CheckCircle2 className="h-4 w-4 text-signal-green" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
