import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { SignalCard } from "../components/SignalCard";
import { QuickNavCards } from "../components/QuickNavCards";
import { PastMatchSignals } from "../components/PastMatchSignals";
import { AutonomousMonitoringConsole } from "../components/AutonomousMonitoringConsole";
import { AgentReasoningLog } from "../components/AgentReasoningLog";
import { OnChainAnchorLedger } from "../components/OnChainAnchorLedger";
import { getAgentReasoningLog, getAgentState, getCompletedMatches, getLatestLiveSignal, getLiveFixtures, getLiveSignalStats, getNextFixture, getOddsHistoryForLatestSignal, getOnChainAnchorLedger, getRecentLiveSignals } from "../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

function isConnectedStatus(status: string | null | undefined) {
  return Boolean(status && !["error", "offline", "disconnected"].includes(status));
}

export default async function OverviewPage() {
  const [agentState, fixtures, latestSignal, recentSignals, reasoningLog, stats, completedMatches, nextFixture, anchorLedger] = await Promise.all([
    getAgentState(), getLiveFixtures(), getLatestLiveSignal(), getRecentLiveSignals(4), getAgentReasoningLog(40), getLiveSignalStats(), getCompletedMatches(4), getNextFixture(), getOnChainAnchorLedger(12),
  ]);
  const latestSignalOddsTicks = latestSignal ? await getOddsHistoryForLatestSignal(latestSignal, 60) : [];
  const activeFixtures = fixtures.filter((fixture) => fixture.status === "live_or_upcoming" || fixture.status === "live");
  const hasActiveMatch = activeFixtures.length > 0;
  const txlineConnected = isConnectedStatus(agentState?.txline_status);
  return (
    <main>
      <Nav hasActiveMatch={hasActiveMatch} txlineConnected={txlineConnected} />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} agentState={agentState} signals={recentSignals} nextFixture={nextFixture} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <SignalCard signal={hasActiveMatch ? latestSignal : null} oddsTicks={latestSignalOddsTicks} />
          <AutonomousMonitoringConsole agentState={agentState} fixtures={fixtures} recentSignals={hasActiveMatch ? recentSignals : []} />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AgentReasoningLog entries={reasoningLog} groqLive={Boolean(process.env.GROQ_API_KEY)} />
          <OnChainAnchorLedger entries={anchorLedger} />
        </div>
        <PastMatchSignals matches={completedMatches} />
        <QuickNavCards />
      </div>
    </main>
  );
}
