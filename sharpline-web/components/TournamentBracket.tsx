import type { TournamentBracketData, BracketMatch } from "../lib/worldCupBracketFeed";
import { teamWithFlag } from "../lib/countryFlags";
import { MatchCountdown } from "./MatchCountdown";

export function TournamentBracket({ data }: { data: TournamentBracketData }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="kicker">Tournament reference</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-text">World Cup knockout bracket</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">Auto-updating public bracket context. TxLINE remains Sharpline&apos;s sole source for live signal, odds, resolution, and anchoring workflows.</p>
          </div>
          <p className="rounded-full border border-border bg-bg px-3 py-1.5 font-data text-[11px] text-text-muted">Bracket data: openfootball (public domain)</p>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto pb-4">
        <div className="grid min-w-[1100px] grid-cols-5 gap-4">
          {data.rounds.map((round) => (
            <div key={round.name} className={`rounded-2xl border p-4 ${round.active ? "border-signal-blue bg-signal-blue/10" : "border-border bg-surface"}`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-text">{round.name}</h2>
                {round.active ? <span className="rounded-full border border-signal-blue/30 bg-signal-blue/15 px-2 py-1 font-data text-[10px] uppercase text-signal-blue">Active</span> : null}
              </div>
              <div className="space-y-3">
                {round.matches.map((match) => <BracketCard key={match.id} match={match} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-text-muted">This page is contextual tournament scaffolding only; it is not a TxLINE bracket integration.</p>
    </section>
  );
}

function BracketCard({ match }: { match: BracketMatch }) {
  return (
    <div className="rounded-xl border border-border bg-bg/70 p-3">
      <div className="space-y-2">
        <TeamRow name={match.home.name} score={match.home.score} winner={match.home.winner} />
        <TeamRow name={match.away.name} score={match.away.score} winner={match.away.winner} />
      </div>
      <div className="mt-3 border-t border-border pt-2 font-data text-[11px] text-text-muted">
        {match.status === "completed" ? "Final" : match.status === "tbd" ? "TBD" : <>Kicks off in <MatchCountdown kickoff_at={match.kickoff_at} compact expiredLabel="Match in progress" /></>}
      </div>
    </div>
  );
}

function TeamRow({ name, score, winner }: { name: string; score: number | null; winner: boolean }) {
  return <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${winner ? "bg-signal-green/10 text-text" : "text-text-muted"}`}><span className="truncate text-sm">{name === "TBD" ? "TBD" : teamWithFlag(name)}</span><span className="font-data text-sm text-text">{score ?? "—"}</span></div>;
}
