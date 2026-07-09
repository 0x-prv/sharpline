"use client";

import { useEffect, useMemo, useState } from "react";

type MatchCountdownProps = {
  kickoff_at: string | null;
  compact?: boolean;
  expiredLabel?: string;
};

export function MatchCountdown({ kickoff_at, compact = false, expiredLabel = "Awaiting result" }: MatchCountdownProps) {
  const kickoffMs = useMemo(() => (kickoff_at ? new Date(kickoff_at).getTime() : NaN), [kickoff_at]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!kickoff_at || !Number.isFinite(kickoffMs)) return <span>TBD</span>;

  const remaining = kickoffMs - now;
  if (remaining <= 0) return <span>{expiredLabel}</span>;

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (compact) {
    const parts = days > 0 ? [`${days}d`, `${hours}h`, `${minutes}m`] : hours > 0 ? [`${hours}h`, `${minutes}m`] : [`${minutes}m`, `${seconds}s`];
    return <span>{parts.join(" ")}</span>;
  }

  return <span>{days > 0 ? `${days}d ` : ""}{hours}h {minutes}m {seconds}s</span>;
}
