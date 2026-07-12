import { BarChart3 } from "lucide-react";
import { Nav } from "../../components/Nav";
import { PageHeader } from "../../components/PageHeader";
import { StatsRow } from "../../components/StatsRow";
import { AgentHealth } from "../../components/AgentHealth";
import { AnalyticsPanel } from "../../components/AnalyticsPanel";
import { PastMatchSignals } from "../../components/PastMatchSignals";
import { getAgentState, getCompletedMatches, getPastMatchPerformance, getResolvedSignals, getSignalAccuracyStats } from "../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function AnalyticsPage() {
  const [agentState, resolvedSignals, performance, completedMatches, signalAccuracy] = await Promise.all([getAgentState(), getResolvedSignals(12), getPastMatchPerformance(), getCompletedMatches(8), getSignalAccuracyStats()]);

  return (
    <main>
      <Nav />
      <PageHeader
        eyebrow="Historical Performance"
        title="SharpLine Accuracy Analytics"
        description="Historical performance updates automatically after each match with completed matches analyzed, resolved outcomes, accuracy, ROI, and strategy performance."
        icon={BarChart3}
      />
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <StatsRow stats={performance} />
        <AnalyticsPanel stats={performance} signals={resolvedSignals} signalAccuracy={signalAccuracy} />
        <PastMatchSignals matches={completedMatches} />
        <AgentHealth agentState={agentState} />
      </div>
    </main>
  );
}
