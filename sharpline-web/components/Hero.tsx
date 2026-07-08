import { Activity, BarChart3, Bitcoin, CircleDollarSign, ShieldCheck, TrendingUp, Zap } from "lucide-react";

type Stats = { signalsToday: number | null; highConfidenceAlerts: number | null; accuracy: number | null; totalOddsUpdatesToday?: number | null; totalSignals?: number | null };
type AgentState = { worker_status?: string | null; txline_status?: string | null; current_state?: string | null; };

export function Hero({ stats, hasActiveMatch, agentState }: { stats: Stats; hasActiveMatch: boolean; agentState: AgentState | null }) {
  const markets = [
    { asset: "BTC", price: "$64,820", change: "+2.4%", tone: "text-signal-green", icon: Bitcoin },
    { asset: "ETH", price: "$3,420", change: "+1.1%", tone: "text-signal-green", icon: CircleDollarSign },
    { asset: "SOL", price: "$148.20", change: "-0.8%", tone: "text-signal-coral", icon: Zap },
  ];
  const overview = [
    { label: "Market Sentiment", value: sentiment(stats.accuracy), meta: "AI consensus", icon: Activity },
    { label: "24h Volume", value: formatCount(stats.totalOddsUpdatesToday), meta: "updates indexed", icon: BarChart3 },
    { label: "BTC Dominance", value: "52.4%", meta: "macro proxy", icon: ShieldCheck },
    { label: "Fear & Greed", value: stats.accuracy ? "Greed" : "Neutral", meta: "risk regime", icon: TrendingUp },
  ];

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-green" /> Bloomberg Terminal meets crypto UX
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-text md:text-[48px] md:leading-[1.02]">
              Autonomous market intelligence for crypto-native teams.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-text-muted">
              Sharpline monitors live markets, detects material movement, explains the signal, and records every outcome in a high-density decision terminal.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rounded-full bg-text px-5 py-2.5 text-sm font-semibold text-bg hover:bg-text/90" href="/signals">Review live signals</a>
              <a className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-muted hover:bg-card hover:text-text" href="/analytics">Open analytics</a>
            </div>
          </div>
          <div className="premium-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="kicker">Market Overview</p>
                <p className="mt-1 text-sm text-text-muted">Live indicator · {hasActiveMatch ? "Connected" : "Standing by"}</p>
              </div>
              <span className="rounded-full border border-signal-green/20 bg-signal-green/10 px-3 py-1 font-data text-[11px] text-signal-green">{title(agentState?.txline_status) ?? "Online"}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {markets.map(({ asset, price, change, tone, icon: Icon }) => <div key={asset} className="rounded-2xl bg-bg/70 p-4"><Icon className="h-4 w-4 text-text-muted" /><p className="mt-4 text-lg font-semibold">{asset}</p><p className="font-data text-sm text-text-muted">{price}</p><p className={`mt-2 font-data text-xs ${tone}`}>{change}</p></div>)}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overview.map(({ label, value, meta, icon: Icon }) => <div key={label} className="premium-card premium-card-hover p-5"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-text-muted" /><span className="h-1.5 w-1.5 rounded-full bg-signal-blue" /></div><p className="mt-5 text-[13px] text-text-muted">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-text">{value}</p><p className="mt-2 font-data text-[11px] text-text-muted">{meta}</p></div>)}
        </div>
      </div>
    </section>
  );
}
function title(value?: string | null) { return value ? value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null; }
function formatCount(value?: number | null) { return value === null || value === undefined ? "—" : Intl.NumberFormat("en-US", { notation: "compact" }).format(value); }
function sentiment(accuracy?: number | null) { if (!accuracy) return "Neutral"; if (accuracy >= 65) return "Bullish"; if (accuracy <= 45) return "Cautious"; return "Constructive"; }
