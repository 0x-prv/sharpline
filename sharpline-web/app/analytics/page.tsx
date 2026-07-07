import { BarChart3 } from "lucide-react";
import { Nav } from "../../components/Nav";
import { PageHeader } from "../../components/PageHeader";
import { StatsRow } from "../../components/StatsRow";
import { AgentHealth } from "../../components/AgentHealth";
import { AnalyticsPanel } from "../../components/AnalyticsPanel";
import { getAgentState, getRecentLiveSignals, getLiveSignalStats } from "../../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function AnalyticsPage() {
  const [agentState, recentSignals, stats] = await Promise.all([getAgentState(), getRecentLiveSignals(8), getLiveSignalStats()]);

  return (
    <main>
      <Nav />
      <PageHeader
        eyebrow="Historical Performance"
        title="SharpLine Accuracy Analytics"
        description="Measure signal quality over time with accuracy, confidence, strategy performance, resolved signals, and agent-level statistics."
        icon={BarChart3}
      />
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <StatsRow stats={stats} />
        <AnalyticsPanel stats={stats} signals={recentSignals} />
        <AgentHealth agentState={agentState} />
      </div>
    </main>
  );
}
