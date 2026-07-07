import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { MatchHeader } from "../components/MatchHeader";
import { SignalCard } from "../components/SignalCard";
import { AgentFlowLog } from "../components/AgentFlowLog";
import { StatsRow } from "../components/StatsRow";
import { AgentStatus } from "../components/AgentStatus";
import { AgentHealth } from "../components/AgentHealth";
import { OddsChart } from "../components/OddsChart";
import { MatchTimeline } from "../components/MatchTimeline";
import {
  getFixtures,
  getLatestSignal,
  getRecentSignals,
  getOddsHistory,
  getStats,
} from "../lib/queries";
import { supabaseServer } from "../lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 15;

async function getLatestMarketForFixture(fixtureId: string) {
  try {
    const { data: mainMarket } = await supabaseServer
      .from("odds_snapshots")
      .select("market")
      .eq("fixture_id", fixtureId)
      .eq("market", "1X2_PARTICIPANT_RESULT")
      .eq("is_demo", false)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mainMarket?.market) return mainMarket.market;

    const { data: anyMarket } = await supabaseServer
      .from("odds_snapshots")
      .select("market")
      .eq("fixture_id", fixtureId)
      .eq("is_demo", false)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return anyMarket?.market ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const [fixtures, latestSignal, recentSignals, stats] = await Promise.all([
    getFixtures(),
    getLatestSignal(),
    getRecentSignals(5),
    getStats(),
  ]);

  const currentFixture =
    fixtures.find((f) => f.status === "live_or_upcoming") ?? fixtures[0] ?? null;
  const hasActiveMatch = currentFixture?.status === "live_or_upcoming";

  let oddsTicks: Awaited<ReturnType<typeof getOddsHistory>> = [];
  if (currentFixture) {
    const market = await getLatestMarketForFixture(currentFixture.id);
    if (market) {
      oddsTicks = await getOddsHistory(currentFixture.id, market, 60);
    }
  }

  return (
    <main>
      <Nav />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} />

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <MatchHeader fixture={currentFixture} />

        <AgentStatus />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <OddsChart ticks={oddsTicks} />
          <SignalCard signal={latestSignal} />
        </div>

        <AgentFlowLog signals={recentSignals} />

        <StatsRow stats={stats} />

        <AgentHealth fixtureCount={fixtures.length} eventsProcessed={recentSignals.length} />

        <MatchTimeline signal={latestSignal} />
      </div>
    </main>
  );
}