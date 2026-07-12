import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { SignalCard } from "../components/SignalCard";
import { QuickNavCards } from "../components/QuickNavCards";
import { PastMatchSignals } from "../components/PastMatchSignals";
import { AutonomousMonitoringConsole } from "../components/AutonomousMonitoringConsole";
import { AgentReasoningLog } from "../components/AgentReasoningLog";
import { getAgentReasoningLog, getAgentState, getCompletedMatches, getLatestLiveSignal, getLatestResolvedSignal, getLiveFixtures, getLiveSignalStats, getNextFixture, getRecentLiveSignals } from "../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function OverviewPage() {
  const [agentState, fixtures, latestSignal, latestResolvedSignal, recentSignals, reasoningLog, stats, completedMatches, nextFixture] = await Promise.all([
    getAgentState(), getLiveFixtures(), getLatestLiveSignal(), getLatestResolvedSignal(), getRecentLiveSignals(4), getAgentReasoningLog(40), getLiveSignalStats(), getCompletedMatches(4), getNextFixture(),
  ]);
  const activeFixtures = fixtures.filter((fixture) => fixture.status === "live_or_upcoming" || fixture.status === "live");
  const hasActiveMatch = activeFixtures.length > 0;
  return (
    <main>
      <Nav />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} agentState={agentState} signals={recentSignals} nextFixture={nextFixture} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <SignalCard signal={latestSignal ?? latestResolvedSignal} />
          <AutonomousMonitoringConsole agentState={agentState} fixtures={fixtures} recentSignals={recentSignals.length ? recentSignals : latestResolvedSignal ? [latestResolvedSignal] : []} />
        </div>
        <AgentReasoningLog entries={reasoningLog} groqLive={Boolean(process.env.GROQ_API_KEY)} />
        <PastMatchSignals matches={completedMatches} />
        <QuickNavCards />
      </div>
    </main>
  );
}
