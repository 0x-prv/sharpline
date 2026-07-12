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
        eyebrow="Live Signals · Replay · Outcome Tracking"
        title="SharpLine Signal Intelligence"
        description="Live TxLINE odds movement, autonomous AI explanations, historical signals, replay, and past-match accuracy in one production view."
        icon={Radio}
      />
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        {!latestSignal && (
          <section className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-text">Monitoring next live fixture while showing verified historical intelligence.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-text-muted">No live signal has been generated for the current window. SharpLine is listening for TxLINE odds updates and will promote the next qualifying market movement automatically.</p>
          </section>
        )}
        <PastMatchSignals matches={completedMatches} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <SignalCard signal={primarySignal} oddsTicks={oddsTicks} />
          <OddsChart ticks={oddsTicks} />
        </div>
        <MatchReplay replay={replay} />
        {momentumTimeline ? <MatchMomentumTimeline timeline={momentumTimeline} /> : <div className="space-y-4"><section className="rounded-2xl border border-border bg-surface p-6"><p className="text-xs uppercase tracking-[0.2em] text-text-muted">Match Momentum Timeline</p><p className="mt-3 text-sm leading-6 text-text-muted">{MOMENTUM_TIMELINE_EMPTY_MESSAGE}</p></section><AutonomousMonitoringConsole agentState={agentState} fixtures={fixtures} recentSignals={latestSignal ? recentSignals : resolvedSignals} /></div>}
        <AgentFlowLog signals={latestSignal ? recentSignals : resolvedSignals} mode="timeline" />
      </div>
    </main>
  );
}
