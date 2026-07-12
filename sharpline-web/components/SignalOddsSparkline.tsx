"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type OddsTick = { price: number; received_at: string; selection?: string | null; market?: string | null };
type Signal = { fixture_id: string; market: string; selection: string; movement_pct: number };
type ChartPoint = { odds: number; timestamp: string; time: string };

const POLL_MS = 15_000;

export function SignalOddsSparkline({ signal, initialTicks }: { signal: Signal; initialTicks: OddsTick[] }) {
  const signalKey = `${signal.fixture_id}:${signal.market}:${signal.selection}`;
  const [liveTicks, setLiveTicks] = useState<{ key: string; ticks: OddsTick[] }>({ key: signalKey, ticks: [] });
  const accent = Number(signal.movement_pct) < 0 ? "#22C55E" : "#4D8DFF";

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const params = new URLSearchParams({ fixtureId: signal.fixture_id, market: signal.market, selection: signal.selection, limit: "80" });
      const response = await fetch(`/api/odds-history?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { ticks?: OddsTick[] };
      if (!cancelled) setLiveTicks({ key: signalKey, ticks: sortUniqueTicks(data.ticks ?? []) });
    }
    const id = window.setInterval(refresh, POLL_MS);
    void refresh();
    return () => { cancelled = true; window.clearInterval(id); };
  }, [signal.fixture_id, signal.market, signal.selection, signalKey]);

  const ticks = useMemo(() => sortUniqueTicks([...(initialTicks ?? []), ...(liveTicks.key === signalKey ? liveTicks.ticks : [])]), [initialTicks, liveTicks, signalKey]);
  const chartData = useMemo(() => ticks.map(toChartPoint), [ticks]);
  const latest = chartData.at(-1);
  const domain = useMemo(() => oddsDomain(chartData), [chartData]);

  if (!chartData.length) {
    return <div className="mt-6 flex h-14 items-center justify-center rounded-xl border border-border bg-bg/50 text-xs text-text-muted">Awaiting real odds snapshots for this signal.</div>;
  }

  return (
    <div className="mt-6 h-14 w-full" aria-label="Live odds sparkline with axis labels">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 3, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="latestSignalOddsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.34} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#22262B" strokeDasharray="3 8" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis stroke="#8A9099" fontSize={10} tickLine={false} axisLine={false} width={34} domain={domain} tickCount={4} tickFormatter={(value: number) => value.toFixed(1)} />
          <Tooltip cursor={{ stroke: "#8A9099", strokeDasharray: "3 6" }} contentStyle={{ background: "#14171B", border: "1px solid #22262B", borderRadius: 12, fontSize: 12 }} formatter={(value) => [Number(value).toFixed(2), "Odds"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.timestamp ? new Date(payload[0].payload.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Odds snapshot"} />
          <Area type="monotone" dataKey="odds" stroke={accent} strokeWidth={2.5} fill="url(#latestSignalOddsFill)" dot={false} activeDot={{ r: 3.5, fill: accent, stroke: "#D9E7FF", strokeWidth: 1.5 }} isAnimationActive animationDuration={450} />
          {latest ? <ReferenceDot x={latest.time} y={latest.odds} r={3.5} fill={accent} stroke="#D9E7FF" strokeWidth={1.5} ifOverflow="extendDomain" /> : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function toChartPoint(tick: OddsTick): ChartPoint { return { odds: Number(tick.price), timestamp: tick.received_at, time: tick.received_at }; }
function sortUniqueTicks(ticks: OddsTick[]) { return [...new Map(ticks.filter((tick) => Number.isFinite(Number(tick.price)) && tick.received_at).map((tick) => [tick.received_at, tick])).values()].sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()); }
function oddsDomain(points: ChartPoint[]): [number, number] { const values = points.map((p) => p.odds); const min = Math.min(...values); const max = Math.max(...values); const padding = Math.max((max - min) * 0.15, 0.1); return [Math.max(0, min - padding), max + padding]; }
