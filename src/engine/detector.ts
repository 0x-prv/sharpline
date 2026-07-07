type PriceTick = { price: number; ts: number };

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const THRESHOLD_PCT = 15; // % change to count as "sharp"
const history = new Map<string, PriceTick[]>();

export type DetectionResult = {
  fixtureId: string;
  market: string;
  selection: string;
  priceBefore: number;
  priceAfter: number;
  pctChange: number;
  detectedAt: number;
} | null;

export function checkForSharpMovement(
  fixtureId: string,
  market: string,
  selection: string,
  price: number,
  ts: number = Date.now()
): DetectionResult {
  const key = `${fixtureId}:${market}:${selection}`;
  const ticks = history.get(key) ?? [];

  // drop ticks outside the window
  const cutoff = ts - WINDOW_MS;
  const windowTicks = ticks.filter((t) => t.ts >= cutoff);

  windowTicks.push({ price, ts });
  history.set(key, windowTicks);

  if (windowTicks.length < 2) return null;

  const oldest = windowTicks[0];
  const pctChange = ((price - oldest.price) / oldest.price) * 100;

  if (Math.abs(pctChange) >= THRESHOLD_PCT) {
    // reset window after firing, so we don't re-fire on every subsequent tick
    history.set(key, [{ price, ts }]);
    return {
      fixtureId,
      market,
      selection,
      priceBefore: oldest.price,
      priceAfter: price,
      pctChange,
      detectedAt: ts,
    };
  }

  return null;
}