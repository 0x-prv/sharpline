"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { formatMarketSelection } from "./copy";

type Tick = { price: number; received_at: string; selection: string; market: string };

export function OddsChart({ ticks }: { ticks: Tick[] }) {
  if (ticks.length === 0) {
    return <div className="flex h-[360px] items-center justify-center rounded-2xl border border-border bg-surface"><p className="text-sm text-text-muted">Connected and listening. Signals will appear automatically once TxLINE odds begin moving during an active match.</p></div>;
  }

  const first = ticks[0];
  const last = ticks[ticks.length - 1];
  const movement = ((Number(last.price) - Number(first.price)) / Number(first.price)) * 100;
  const chartData = ticks.map((t) => ({ time: new Date(t.received_at).toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", hour: "2-digit" }), odds: Number(t.price) }));

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Odds Movement</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-text">{formatMarketSelection(first.market, first.selection)} Odds</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Mini label="Previous Odds" value={Number(first.price).toFixed(2)} />
          <Mini label="Current Odds" value={Number(last.price).toFixed(2)} />
          <Mini label="Movement" value={`${movement > 0 ? "+" : ""}${movement.toFixed(1)}%`} />
          <Mini label="Direction" value={movement < 0 ? "Shortening" : "Drifting"} />
        </div>
      </div>
      <div className="mt-6 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#22262B" vertical={false} />
            <XAxis dataKey="time" stroke="#8A9099" fontSize={11} tickLine={false} label={{ value: "Time", fill: "#8A9099", fontSize: 11, position: "insideBottom", offset: -4 }} />
            <YAxis stroke="#8A9099" fontSize={11} tickLine={false} domain={[(dataMin: number) => dataMin - 0.2, (dataMax: number) => dataMax + 0.2]} tickFormatter={(value: number) => value.toFixed(1)} label={{ value: "Odds", angle: -90, fill: "#8A9099", fontSize: 11, position: "insideLeft" }} />
            <Tooltip contentStyle={{ background: "#14171B", border: "1px solid #22262B", borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="odds" stroke="#4D8DFF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-bg/50 px-3 py-2"><p className="text-[10px] text-text-muted">{label}</p><p className="mt-1 font-display text-sm text-text">{value}</p></div>;
}
