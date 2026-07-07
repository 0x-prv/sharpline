import { Radio } from "lucide-react";
import { Nav } from "../../components/Nav";
import { PageHeader } from "../../components/PageHeader";
import { SignalCard } from "../../components/SignalCard";
import { AgentFlowLog } from "../../components/AgentFlowLog";
import { MatchTimeline } from "../../components/MatchTimeline";
import { OddsChart } from "../../components/OddsChart";
import { getLatestLiveSignal, getOddsHistoryForLatestSignal, getRecentLiveSignals } from "../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function SignalsPage() {
  const [latestSignal, recentSignals] = await Promise.all([getLatestLiveSignal(), getRecentLiveSignals(10)]);
  const oddsTicks = latestSignal ? await getOddsHistoryForLatestSignal(latestSignal, 60) : [];

  return (
    <main>
      <Nav />
      <PageHeader
        eyebrow="Live Intelligence"
        title="Autonomous Signal Decisions"
        description="See what the SharpLine agent is deciding right now, including market, selection, movement, confidence, reason, and human-readable AI explanation."
        icon={Radio}
      />
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        {!latestSignal && (
          <section className="rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-text">Monitoring live fixtures...</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-text-muted">The first signal will appear automatically when unusual market movement is detected.</p>
          </section>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <SignalCard signal={latestSignal} />
          <OddsChart ticks={oddsTicks} />
        </div>
        <MatchTimeline signal={latestSignal} />
        <AgentFlowLog signals={recentSignals} mode="timeline" />
      </div>
    </main>
  );
}
