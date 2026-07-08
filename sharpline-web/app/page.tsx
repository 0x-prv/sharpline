import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { SignalCard } from "../components/SignalCard";
import { AgentFlowLog } from "../components/AgentFlowLog";
import { AgentStatus } from "../components/AgentStatus";
import { AgentHealth } from "../components/AgentHealth";
import { QuickNavCards } from "../components/QuickNavCards";
import { PastMatchSignals } from "../components/PastMatchSignals";
import { getAgentState, getCompletedMatches, getLatestLiveSignal, getLatestResolvedSignal, getLiveFixtures, getLiveSignalStats, getRecentLiveSignals } from "../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

const narratives = ["Solana DeFi", "BTC ETF Flows", "L2 Rotation", "AI Agents"];
const movers = [{ s: "WIF", c: "+18.4%" }, { s: "JUP", c: "+9.7%" }, { s: "BONK", c: "-4.1%" }];

export default async function OverviewPage() {
  const [agentState, fixtures, latestSignal, latestResolvedSignal, recentSignals, stats, completedMatches] = await Promise.all([
    getAgentState(), getLiveFixtures(), getLatestLiveSignal(), getLatestResolvedSignal(), getRecentLiveSignals(4), getLiveSignalStats(), getCompletedMatches(4),
  ]);
  const activeFixtures = fixtures.filter((fixture) => fixture.status === "live_or_upcoming");
  const hasActiveMatch = activeFixtures.length > 0;
  return (
    <main>
      <Nav />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} agentState={agentState} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <section className="grid gap-4 lg:grid-cols-3">
          <Panel title="Trending Narratives" subtitle="Regime shifts ranked by attention">
            <div className="space-y-2">{narratives.map((n, i) => <div key={n} className="flex items-center justify-between rounded-2xl bg-bg/70 px-4 py-3"><span className="text-sm text-text">{n}</span><span className="font-data text-xs text-text-muted">#{i + 1}</span></div>)}</div>
          </Panel>
          <Panel title="Market Movers" subtitle="High velocity assets">
            <div className="space-y-2">{movers.map((m) => <div key={m.s} className="flex items-center justify-between rounded-2xl bg-bg/70 px-4 py-3"><span className="font-semibold">{m.s}</span><span className={m.c.startsWith("+") ? "font-data text-signal-green" : "font-data text-signal-coral"}>{m.c}</span></div>)}</div>
          </Panel>
          <Panel title="Recent Alerts" subtitle="Latest system outcomes">
            <div className="space-y-2"><Mini label="Signals today" value={stats.signalsToday ?? 0} /><Mini label="High confidence" value={stats.highConfidenceAlerts ?? 0} /><Mini label="Accuracy" value={stats.accuracy === null ? "—" : `${stats.accuracy}%`} /></div>
          </Panel>
        </section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <SignalCard signal={latestSignal ?? latestResolvedSignal} />
          <AgentFlowLog signals={recentSignals.length ? recentSignals : latestResolvedSignal ? [latestResolvedSignal] : []} mode="activity" />
        </div>
        <PastMatchSignals matches={completedMatches} />
        <AgentStatus agentState={agentState} />
        <AgentHealth agentState={agentState} />
        <QuickNavCards />
      </div>
    </main>
  );
}
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="premium-card premium-card-hover p-5"><p className="kicker">{title}</p><p className="mt-2 text-sm text-text-muted">{subtitle}</p><div className="mt-5">{children}</div></section>; }
function Mini({ label, value }: { label: string; value: string | number }) { return <div className="flex items-center justify-between rounded-2xl bg-bg/70 px-4 py-3"><span className="text-sm text-text-muted">{label}</span><span className="font-data text-sm text-text">{value}</span></div>; }
