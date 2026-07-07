import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { SignalCard } from "../components/SignalCard";
import { AgentFlowLog } from "../components/AgentFlowLog";
import { AgentStatus } from "../components/AgentStatus";
import { AgentHealth } from "../components/AgentHealth";
import { QuickNavCards } from "../components/QuickNavCards";
import { getFixtures, getLatestSignal, getRecentSignals, getStats } from "../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function OverviewPage() {
  const [fixtures, latestSignal, recentSignals, stats] = await Promise.all([
    getFixtures(),
    getLatestSignal(),
    getRecentSignals(4),
    getStats(),
  ]);

  const hasActiveMatch = fixtures.some((fixture) => fixture.status === "live_or_upcoming");

  return (
    <main>
      <Nav />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} />

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <AgentStatus />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <SignalCard signal={latestSignal} />
          <AgentFlowLog signals={recentSignals} mode="activity" />
        </div>
        <AgentHealth fixtureCount={fixtures.length} eventsProcessed={recentSignals.length} />
        <QuickNavCards />
      </div>
    </main>
  );
}
