import { Anchor, Clock, Radio, ShieldAlert, TrendingUp } from "lucide-react";
import { actionTone, explainReason, formatMarketSelection } from "./copy";

const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_TXLINE_NETWORK === "devnet" ? "devnet" : "mainnet";
function solanaTxUrl(signature: string) { return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`; }

type Signal = { id?: string; fixture_id: string; competition?: string; match: string; market: string; selection: string; previous_odds: number; current_odds: number; movement_pct: number; direction: string; severity: string; confidence: number; reason_code: string; action: string; explanation: string; ai_provider: string; is_demo: boolean; occurred_at: string; current_match_state?: string; pending_resolution?: boolean; outcome?: string | null; final_score?: string | null; roi_units?: number | null; historical_similar_count?: number; historical_success_rate?: number | null; historical_average_roi?: number | null; anchor_tx_signature?: string | null; } | null;

export function SignalCard({ signal }: { signal: Signal }) {
  if (!signal) return <EmptySignal />;
  const movement = Number(signal.movement_pct);
  const side = actionLabel(signal.action);
  const spark = [34, 38, 33, 48, 44, 58, 54, 72].map((y, i) => `${i * 14},${86 - y}`).join(" ");
  const sections = buildAnalysis(signal.explanation, signal.reason_code, movement);

  return (
    <article className="premium-card premium-card-hover overflow-hidden">
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Latest AI Match Signal</p>
            <div className="mt-4 flex items-center gap-3">
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-text">{formatMarketSelection(signal.market, signal.selection)}</h2>
              <span className={`rounded-full border px-3 py-1 font-data text-xs ${actionTone(signal.action)}`}>{side}</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{signal.match} · {formatMarketSelection(signal.market, signal.selection)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-full border border-signal-green/20 bg-signal-green/10 px-3 py-1 font-data text-[11px] uppercase text-signal-green">Live</div>
            {signal.anchor_tx_signature ? <a href={solanaTxUrl(signal.anchor_tx_signature)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full border border-signal-blue/30 bg-signal-blue/10 px-3 py-1 text-xs font-semibold text-signal-blue"><Anchor className="h-3.5 w-3.5" /> ⚓ Anchored on Solana</a> : null}
          </div>
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

function EmptySignal() { return <div className="premium-card p-8"><p className="kicker">Latest AI Match Signal</p><div className="mt-8 rounded-2xl border border-border bg-bg/60 p-6"><div className="flex items-center gap-2 text-signal-green"><Radio className="h-4 w-4" /><p className="font-display text-2xl font-semibold text-text">Waiting for first event</p></div><p className="mt-3 text-sm leading-6 text-text-muted">No AI match signal is available from the backend yet. Sharpline is healthy and will show real TxLINE-driven analysis here after the next qualifying World Cup event.</p></div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-card p-5"><p className="text-[12px] text-text-muted">{label}</p><p className="mt-2 text-xl font-semibold text-text">{value}</p></div>; }
function Mini({ label, value, tone = "text-text" }: { label: string; value: string; tone?: string }) { return <div className="rounded-2xl border border-border bg-bg/70 p-4"><p className="text-xs text-text-muted">{label}</p><p className={`mt-1 font-data text-lg ${tone}`}>{value}</p></div>; }
function actionLabel(action: string) { return action === "FADE" ? "Odds Correction" : action === "FOLLOW" ? "Momentum Shift" : action === "ALERT" ? "Match Alert" : action === "WATCH" ? "Monitor" : action; }
function relativeTime(value: string) { const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `${seconds}s ago`; const m = Math.round(seconds / 60); return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; }
function buildAnalysis(explanation: string, reasonCode: string, movement: number) { const summary = explanation || explainReason(reasonCode) || "A material match odds movement was detected and ranked by confidence."; const momentum = Math.abs(movement) > 8 ? "Momentum is elevated versus the pre-signal baseline, so Sharpline will continue tracking match follow-through and odds correction." : "Momentum is developing; Sharpline will keep monitoring match events and odds confirmation before ranking this as a stronger move."; return [
  { title: "Summary", body: summary, icon: Radio },
  { title: "Why It Matters", body: `TxLINE odds repriced ${Math.abs(movement).toFixed(1)}%, suggesting a live match event, fan-impact shift, or odds movement worth monitoring.`, icon: TrendingUp },
  { title: "Momentum", body: momentum, icon: Clock },
  { title: "Risk", body: "Stale feeds, late score updates, and sudden football events can create false positives. Treat the signal as match intelligence until confirmation improves.", icon: ShieldAlert },
  { title: "Confidence", body: "Confidence blends odds movement size, match timing, score context, and historical signal behavior before Sharpline elevates a detection.", icon: Radio },
]; }
