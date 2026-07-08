import { Clock, Radio, ShieldAlert, TrendingUp } from "lucide-react";
import { actionTone, explainReason, formatMarketSelection } from "./copy";

type Signal = { id?: string; fixture_id: string; competition?: string; match: string; market: string; selection: string; previous_odds: number; current_odds: number; movement_pct: number; direction: string; severity: string; confidence: number; reason_code: string; action: string; explanation: string; ai_provider: string; is_demo: boolean; occurred_at: string; current_match_state?: string; pending_resolution?: boolean; outcome?: string | null; final_score?: string | null; roi_units?: number | null; historical_similar_count?: number; historical_success_rate?: number | null; historical_average_roi?: number | null; } | null;

export function SignalCard({ signal }: { signal: Signal }) {
  if (!signal) return <EmptySignal />;
  const movement = Number(signal.movement_pct);
  const side = signal.action === "FADE" ? "SHORT" : signal.action === "WATCH" ? "WATCH" : "LONG";
  const spark = [34, 38, 33, 48, 44, 58, 54, 72].map((y, i) => `${i * 14},${86 - y}`).join(" ");
  const sections = buildAnalysis(signal.explanation, signal.reason_code, movement);

  return (
    <article className="premium-card premium-card-hover overflow-hidden">
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Latest AI Signal</p>
            <div className="mt-4 flex items-center gap-3">
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-text">{ticker(signal.selection)}</h2>
              <span className={`rounded-full border px-3 py-1 font-data text-xs ${actionTone(signal.action)}`}>{side}</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{signal.match} · {formatMarketSelection(signal.market, signal.selection)}</p>
          </div>
          <div className="rounded-full border border-signal-green/20 bg-signal-green/10 px-3 py-1 font-data text-[11px] uppercase text-signal-green">Live</div>
        </div>
        <svg viewBox="0 0 100 44" className="mt-6 h-14 w-full" preserveAspectRatio="none" aria-label="Mini sparkline">
          <polyline points={spark} fill="none" stroke={movement < 0 ? "#22C55E" : "#3B82F6"} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        <Metric label="Confidence" value={`${signal.confidence}%`} />
        <Metric label="Momentum" value={Math.abs(movement) > 8 ? "Very Strong" : "Strong"} />
        <Metric label="Risk" value={signal.confidence >= 85 ? "Medium" : "Elevated"} />
        <Metric label="Generated" value={relativeTime(signal.occurred_at)} />
      </div>

      <div className="p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="Previous" value={Number(signal.previous_odds).toFixed(2)} />
          <Mini label="Current" value={Number(signal.current_odds).toFixed(2)} />
          <Mini label="Move" value={`${movement > 0 ? "+" : ""}${movement.toFixed(1)}%`} tone={movement < 0 ? "text-signal-green" : "text-signal-blue"} />
        </div>
        <div className="mt-6 grid gap-3">
          {sections.map((section) => <div key={section.title} className="rounded-2xl border border-border bg-bg/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-text"><section.icon className="h-4 w-4 text-signal-blue" />{section.title}</p><p className="mt-2 text-sm leading-6 text-text-muted">{section.body}</p></div>)}
        </div>
      </div>
    </article>
  );
}

function EmptySignal() { return <div className="premium-card p-8"><p className="kicker">Latest AI Signal</p><div className="mt-8 space-y-3"><div className="skeleton h-9 w-44 rounded-lg" /><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-24 w-full rounded-2xl" /></div><p className="mt-6 text-sm leading-6 text-text-muted">No live market alerts yet. Professional empty states keep the terminal calm while Sharpline listens for material movement.</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-card p-5"><p className="text-[12px] text-text-muted">{label}</p><p className="mt-2 text-xl font-semibold text-text">{value}</p></div>; }
function Mini({ label, value, tone = "text-text" }: { label: string; value: string; tone?: string }) { return <div className="rounded-2xl border border-border bg-bg/70 p-4"><p className="text-xs text-text-muted">{label}</p><p className={`mt-1 font-data text-lg ${tone}`}>{value}</p></div>; }
function ticker(selection: string) { return selection.split(/\s|_/)[0]?.slice(0, 6).toUpperCase() || "MKT"; }
function relativeTime(value: string) { const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `${seconds}s ago`; const m = Math.round(seconds / 60); return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; }
function buildAnalysis(explanation: string, reasonCode: string, movement: number) { const summary = explanation || explainReason(reasonCode) || "A material market move was detected and ranked by confidence."; const momentum = Math.abs(movement) > 8 ? "Momentum is elevated versus the pre-signal baseline, so Sharpline will continue tracking follow-through and mean reversion." : "Momentum is developing; Sharpline will keep monitoring confirmation before ranking this as a stronger move."; return [
  { title: "Summary", body: summary, icon: Radio },
  { title: "Why It Matters", body: `The market repriced ${Math.abs(movement).toFixed(1)}%, suggesting fresh information, liquidity imbalance, or sharp positioning.`, icon: TrendingUp },
  { title: "Momentum", body: momentum, icon: Clock },
  { title: "Risk", body: "Low-liquidity venues, stale feeds, and event-driven volatility can create false positives. Size accordingly until confirmation improves.", icon: ShieldAlert },
  { title: "Confidence", body: "Confidence blends movement size, timing, market context, and historical signal behavior before Sharpline elevates a detection.", icon: Radio },
]; }
