import { Radio } from "lucide-react";
import { Nav } from "../../components/Nav";
import { PageHeader } from "../../components/PageHeader";
import { SignalCard } from "../../components/SignalCard";
import { AgentFlowLog } from "../../components/AgentFlowLog";
import { MatchMomentumTimeline, MOMENTUM_TIMELINE_EMPTY_MESSAGE } from "../../components/MatchMomentumTimeline";
import { AutonomousMonitoringConsole } from "../../components/AutonomousMonitoringConsole";
import { OddsChart } from "../../components/OddsChart";
import { PastMatchSignals } from "../../components/PastMatchSignals";
import { MatchReplay } from "../../components/MatchReplay";
import { getAgentState, getCompletedMatches, getLatestLiveSignal, getLatestResolvedSignal, getLiveFixtures, getMatchMomentumTimeline, getMatchReplay, getOddsHistoryForLatestSignal, getRecentLiveSignals, getResolvedSignals } from "../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function SignalsPage() {
  const [agentState, fixtures, latestSignal, latestResolvedSignal, recentSignals, resolvedSignals, completedMatches] = await Promise.all([
    getAgentState(),
    getLiveFixtures(),
    getLatestLiveSignal(),
    getLatestResolvedSignal(),
    getRecentLiveSignals(10),
    getResolvedSignals(10),
    getCompletedMatches(6),
  ]);
  const primarySignal = latestSignal ?? latestResolvedSignal;
  const oddsTicks = latestSignal ? await getOddsHistoryForLatestSignal(latestSignal, 60) : [];
  const timelineFixtureId = primarySignal?.fixture_id ?? completedMatches[0]?.id ?? null;
  const [replay, momentumTimeline] = await Promise.all([
    completedMatches[0] ? getMatchReplay(completedMatches[0].id) : Promise.resolve(null),
    timelineFixtureId ? getMatchMomentumTimeline(timelineFixtureId) : Promise.resolve(null),
  ]);

  return (
    <main>
      <Nav />
      <PageHeader
        eyebrow="Live + Historical Intelligence"
        title="Autonomous Signal Decisions"
        description="Resolved signals from completed fixtures appear first when no live signal exists, while SharpLine continues monitoring the next kickoff."
        icon={Radio}
      />
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        {!latestSignal && (
          <section className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-text">Reviewing completed matches while monitoring the next kickoff.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-text-muted">Resolved signals from completed fixtures are shown below until the next live market alert is generated.</p>
          </section>
        )}
        <PastMatchSignals matches={completedMatches} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <SignalCard signal={primarySignal} />
          <OddsChart ticks={oddsTicks} />
        </div>
        <MatchReplay replay={replay} />
        {momentumTimeline ? <MatchMomentumTimeline timeline={momentumTimeline} /> : <div className="space-y-4"><section className="rounded-2xl border border-border bg-surface p-6"><p className="text-xs uppercase tracking-[0.2em] text-text-muted">Match Momentum Timeline</p><p className="mt-3 text-sm leading-6 text-text-muted">{MOMENTUM_TIMELINE_EMPTY_MESSAGE}</p></section><AutonomousMonitoringConsole agentState={agentState} fixtures={fixtures} recentSignals={latestSignal ? recentSignals : resolvedSignals} /></div>}
        <AgentFlowLog signals={latestSignal ? recentSignals : resolvedSignals} mode="timeline" />
      </div>
    </main>
  );
}
