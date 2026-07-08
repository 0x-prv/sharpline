import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { SignalCard } from "../components/SignalCard";
import { AgentFlowLog } from "../components/AgentFlowLog";
import { AgentStatus } from "../components/AgentStatus";
import { AgentHealth } from "../components/AgentHealth";
import { QuickNavCards } from "../components/QuickNavCards";
import { PastMatchSignals } from "../components/PastMatchSignals";
import { getAgentState, getCompletedMatches, getLatestLiveSignal, getLatestResolvedSignal, getLiveFixtures, getLiveSignalStats, getRecentLiveSignals } from "../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function OverviewPage() {
  const [agentState, fixtures, latestSignal, latestResolvedSignal, recentSignals, stats, completedMatches] = await Promise.all([
    getAgentState(),
    getLiveFixtures(),
    getLatestLiveSignal(),
    getLatestResolvedSignal(),
    getRecentLiveSignals(4),
    getLiveSignalStats(),
    getCompletedMatches(4),
  ]);

  const activeFixtures = fixtures.filter((fixture) => fixture.status === "live_or_upcoming");
  const nextFixture = activeFixtures[0] ?? fixtures.find((fixture) => fixture.status === "scheduled") ?? null;
  const hasActiveMatch = activeFixtures.length > 0;

  return (
    <main>
      <Nav />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} agentState={agentState} />

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Next Match</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-text">Reviewing completed matches while monitoring the next kickoff.</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">{nextFixture ? `${nextFixture.home_team} vs ${nextFixture.away_team} · ${nextFixture.kickoff_at ? new Date(nextFixture.kickoff_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "kickoff TBD"}` : "No upcoming production fixture has been reported yet."}</p>
        </section>
        <AgentStatus agentState={agentState} />
        <PastMatchSignals matches={completedMatches} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <SignalCard signal={latestSignal ?? latestResolvedSignal} />
          <AgentFlowLog signals={recentSignals.length ? recentSignals : latestResolvedSignal ? [latestResolvedSignal] : []} mode="activity" />
        </div>
        <AgentHealth agentState={agentState} />
        <QuickNavCards />
      </div>
    </main>
  );
}
