import { Nav } from "../components/Nav";
import { Hero } from "../components/Hero";
import { SignalCard } from "../components/SignalCard";
import { AgentStatus } from "../components/AgentStatus";
import { QuickNavCards } from "../components/QuickNavCards";
import { PastMatchSignals } from "../components/PastMatchSignals";
import { AutonomousMonitoringConsole } from "../components/AutonomousMonitoringConsole";
import { getAgentState, getCompletedMatches, getLatestLiveSignal, getLatestResolvedSignal, getLiveFixtures, getLiveSignalStats, getRecentLiveSignals } from "../lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export default async function OverviewPage() {
  const [agentState, fixtures, latestSignal, latestResolvedSignal, recentSignals, stats, completedMatches] = await Promise.all([
    getAgentState(), getLiveFixtures(), getLatestLiveSignal(), getLatestResolvedSignal(), getRecentLiveSignals(4), getLiveSignalStats(), getCompletedMatches(4),
  ]);
  const activeFixtures = fixtures.filter((fixture) => fixture.status === "live_or_upcoming");
  const hasActiveMatch = activeFixtures.length > 0;
  const nextFixture = (activeFixtures.length ? activeFixtures : fixtures)
    .filter((fixture) => fixture.kickoff_at)
    .sort((a, b) => new Date(a.kickoff_at!).getTime() - new Date(b.kickoff_at!).getTime())[0] ?? activeFixtures[0] ?? null;
  return (
    <main>
      <Nav />
      <Hero stats={stats} hasActiveMatch={hasActiveMatch} agentState={agentState} signals={recentSignals} nextFixture={nextFixture} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <section className="grid gap-4 lg:grid-cols-3">
          <Panel title="Latest Signals" subtitle="Newest AI-generated match signals">
            <div className="space-y-2">{recentSignals.slice(0, 3).map((signal) => <SignalRow key={signal.id ?? signal.occurred_at} label={`${signal.selection} · ${signal.action}`} value={`${signal.confidence}%`} meta={signal.match} />)}{recentSignals.length === 0 ? <EmptyRow text="Sharpline is listening for the next material TxLINE match signal." /> : null}</div>
          </Panel>
          <Panel title="Recent Detections" subtitle="Autonomous movement capture">
            <div className="space-y-2">{recentSignals.slice(0, 3).map((signal) => <SignalRow key={`${signal.occurred_at}-${signal.market}`} label={signal.market.replaceAll("_", " ")} value={`${Number(signal.movement_pct) > 0 ? "+" : ""}${Number(signal.movement_pct).toFixed(1)}%`} meta={new Date(signal.occurred_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} />)}{recentSignals.length === 0 ? <EmptyRow text="Detections appear here as odds movement crosses Sharpline thresholds." /> : null}</div>
          </Panel>
          <Panel title="Historical Accuracy" subtitle="Resolved signal performance">
            <div className="space-y-2"><Mini label="Signals today" value={stats.signalsToday ?? 0} /><Mini label="High confidence" value={stats.highConfidenceAlerts ?? 0} /><Mini label="Signal accuracy" value={stats.accuracy === null ? "—" : `${stats.accuracy}%`} /></div>
          </Panel>
        </section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <SignalCard signal={latestSignal ?? latestResolvedSignal} />
          <AutonomousMonitoringConsole agentState={agentState} fixtures={fixtures} recentSignals={recentSignals.length ? recentSignals : latestResolvedSignal ? [latestResolvedSignal] : []} />
        </div>
        <PastMatchSignals matches={completedMatches} />
        <AgentStatus agentState={agentState} />
        <QuickNavCards />
      </div>
    </main>
  );
}
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="premium-card premium-card-hover p-5"><p className="kicker">{title}</p><p className="mt-2 text-sm text-text-muted">{subtitle}</p><div className="mt-5">{children}</div></section>; }
function Mini({ label, value }: { label: string; value: string | number }) { return <div className="flex items-center justify-between rounded-2xl bg-bg/70 px-4 py-3"><span className="text-sm text-text-muted">{label}</span><span className="font-data text-sm text-text">{value}</span></div>; }
function SignalRow({ label, value, meta }: { label: string; value: string; meta: string }) { return <div className="rounded-2xl bg-bg/70 px-4 py-3 transition duration-150 hover:-translate-y-0.5 hover:bg-card"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-text">{label}</span><span className="font-data text-xs text-signal-blue">{value}</span></div><p className="mt-1 truncate text-xs text-text-muted">{meta}</p></div>; }
function EmptyRow({ text }: { text: string }) { return <div className="rounded-2xl border border-border bg-bg/50 px-4 py-4 text-sm leading-6 text-text-muted">{text}</div>; }
