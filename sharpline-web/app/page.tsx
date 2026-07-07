import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { MatchHeader } from "../components/MatchHeader";
import { SignalCard } from "../components/SignalCard";
import { AgentFlowLog } from "../components/AgentFlowLog";
import { StatsRow } from "../components/StatsRow";
import { OddsChart } from "../components/OddsChart";
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
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mainMarket?.market) return mainMarket.market;

    const { data: anyMarket } = await supabaseServer
      .from("odds_snapshots")
      .select("market")
      .eq("fixture_id", fixtureId)
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
      <Hero />

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <MatchHeader fixture={currentFixture} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <OddsChart ticks={oddsTicks} />
          <SignalCard signal={latestSignal} />
        </div>

        <AgentFlowLog signals={recentSignals} />

        <StatsRow stats={stats} />
      </div>
    </main>
  );
}