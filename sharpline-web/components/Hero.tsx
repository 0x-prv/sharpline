import { Activity, BarChart3, Brain, Gauge, Radio, ShieldCheck, Zap } from "lucide-react";
import { actionTone, formatMarketSelection } from "./copy";
import { MatchCountdown } from "./MatchCountdown";
import { MatchWithFlags, TeamWithFlag } from "./Flag";

type Stats = { signalsToday: number | null; highConfidenceAlerts: number | null; accuracy: number | null; totalOddsUpdatesToday?: number | null; totalSignals?: number | null; avgConfidence?: number | null };
type AgentState = { worker_status?: string | null; txline_status?: string | null; current_state?: string | null; backend_data_status?: string | null };
type Fixture = { home_team: string; away_team: string; kickoff_at: string | null; status?: string | null };
type Signal = { match: string; market: string; selection: string; movement_pct: number; action: string; confidence: number; severity?: string | null; occurred_at: string };

export function Hero({ stats, hasActiveMatch, agentState, signals, nextFixture }: { stats: Stats; hasActiveMatch: boolean; agentState: AgentState | null; signals: Signal[]; nextFixture?: Fixture | null }) {
  const activeAgents = [agentState?.worker_status, agentState?.txline_status].filter((status) => status && status !== "error" && status !== "offline").length;
  const overview = [
    { label: "Signals Today", value: formatCount(stats.signalsToday), meta: "TxLINE detections", icon: Radio },
    { label: "Fixtures Monitored", value: formatCount(stats.totalOddsUpdatesToday), meta: "score/odds updates indexed", icon: BarChart3 },
    { label: "AI Confidence", value: stats.avgConfidence === null || stats.avgConfidence === undefined ? "—" : `${stats.avgConfidence}%`, meta: "average match signal score", icon: Brain },
    { label: "Signal Accuracy", value: stats.accuracy === null || stats.accuracy === undefined ? "—" : `${stats.accuracy}%`, meta: "resolved match outcomes", icon: ShieldCheck },
  ];

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-green" /> Autonomous monitoring for live World Cup matches
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1.5 text-[13px] text-signal-blue">
                <Zap className="h-3.5 w-3.5" /> Powered by TxLINE
              </div>
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-text md:text-[48px] md:leading-[1.02]">
              Autonomous sports market intelligence powered by TxLINE.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-text-muted">
              Collect live odds. Detect abnormal movement. Explain why it matters. Track outcomes. Measure accuracy.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rounded-full bg-text px-5 py-2.5 text-sm font-semibold text-bg hover:bg-text/90" href="/signals">View live signals</a>
              <a className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-muted hover:bg-card hover:text-text" href="/analytics">See accuracy</a>
            </div>
          </div>
          <div className="premium-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="kicker">Live Match Signals</p>
                <p className="mt-1 text-sm text-text-muted">TxLINE score and odds stream · {hasActiveMatch ? "Monitoring active fixtures" : "Monitoring next kickoff"}</p>
              </div>
              <span className="rounded-full border border-signal-green/20 bg-signal-green/10 px-3 py-1 font-data text-[11px] text-signal-green">{title(agentState?.txline_status) ?? "Online"}</span>
            </div>
            <div className="mt-4 space-y-3">
              {signals.length ? signals.slice(0, 3).map((signal, index) => <LiveSignalCard key={`${signal.occurred_at}-${index}`} signal={signal} />) : <EmptyLiveSignal nextFixture={nextFixture} />}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overview.map(({ label, value, meta, icon: Icon }) => <div key={label} className="premium-card premium-card-hover p-5"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-text-muted" /><span className="h-1.5 w-1.5 rounded-full bg-signal-blue" /></div><p className="mt-5 text-[13px] text-text-muted">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-text">{value}</p><p className="mt-2 font-data text-[11px] text-text-muted">{meta}</p></div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted"><span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"><Activity className="h-3.5 w-3.5" /> Active agents: {activeAgents || "—"}</span><span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"><Gauge className="h-3.5 w-3.5" /> Detection latency: real-time</span><span className="inline-flex items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1.5 font-data uppercase text-signal-blue"><Zap className="h-3.5 w-3.5" /> TxLINE infrastructure</span></div>
      </div>
    </section>
  );
}
function LiveSignalCard({ signal }: { signal: Signal }) { const movement = Number(signal.movement_pct); const side = actionLabel(signal.action); const spark = [22, 30, 28, 46, 42, 62, 57, 74].map((y, i) => `${i * 14},${86 - y}`).join(" "); return <div className="rounded-2xl border border-border bg-bg/70 p-4 transition duration-150 hover:-translate-y-0.5 hover:bg-card"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-text">{formatMarketSelection(signal.market, signal.selection)}</p><p className="mt-1 text-xs text-text-muted"><MatchWithFlags match={signal.match} /></p></div><span className={`rounded-full border px-2.5 py-1 font-data text-[11px] ${actionTone(signal.action)}`}>{side}</span></div><svg viewBox="0 0 100 34" className="mt-3 h-10 w-full" preserveAspectRatio="none" aria-label="Signal sparkline"><polyline points={spark} fill="none" stroke={movement < 0 ? "#22C55E" : "#3B82F6"} strokeWidth="2.25" vectorEffect="non-scaling-stroke" /></svg><div className="mt-3 grid grid-cols-4 gap-2 text-[11px]"><Mini label="Conf" value={`${signal.confidence}%`} /><Mini label="Momentum" value={Math.abs(movement) > 8 ? "High" : "Med"} /><Mini label="Risk" value={signal.confidence >= 85 ? "Med" : "Elev"} /><Mini label="Detected" value={relativeTime(signal.occurred_at)} /></div><p className="mt-3 font-data text-[11px] text-text-muted">Signal quality · {signal.severity ?? "Ranked"}</p></div>; }
function EmptyLiveSignal({ nextFixture }: { nextFixture?: Fixture | null }) { return <div className="rounded-2xl border border-border bg-bg/50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-text">No live AI signal yet</p><p className="mt-1 text-xs leading-5 text-text-muted">{nextFixture ? <>Next match: <TeamWithFlag teamName={nextFixture.home_team} /> vs <TeamWithFlag teamName={nextFixture.away_team} /> — kicks off in <MatchCountdown kickoff_at={nextFixture.kickoff_at} compact expiredLabel="Awaiting result" /></> : "Autonomous monitoring is active. Real TxLINE signals will appear after qualifying score or odds movement."}</p></div><span className="rounded-full border border-signal-green/20 bg-signal-green/10 px-2.5 py-1 font-data text-[11px] text-signal-green">Listening</span></div><div className="mt-4 rounded-xl border border-border bg-surface p-3 text-xs leading-5 text-text-muted">Listening for TxLINE odds movement. Confidence, momentum, risk, and detection time appear only after a real signal is generated.</div></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div><p className="text-text-muted">{label}</p><p className="mt-0.5 font-data text-text">{value}</p></div>; }
function title(value?: string | null) { return value ? value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null; }
function formatCount(value?: number | null) { return value === null || value === undefined ? "—" : Intl.NumberFormat("en-US", { notation: "compact" }).format(value); }
function relativeTime(value: string) { const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `${seconds}s ago`; const m = Math.round(seconds / 60); return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; }

function actionLabel(action: string) { return action === "FADE" ? "Odds Correction" : action === "FOLLOW" ? "Momentum Shift" : action === "ALERT" ? "Match Alert" : action === "WATCH" ? "Monitor" : action; }
