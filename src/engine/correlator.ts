import { getRecentScoreEvents } from "../db/repository.js";

const CORRELATION_WINDOW_MS = 3 * 60 * 1000; // ±3 minutes around the detection

export async function classifyMovement(
  fixtureId: string,
  detectedAtMs: number
): Promise<{ classification: "explained" | "unexplained"; confidence: number }> {
  const events = await getRecentScoreEvents(
    fixtureId,
    detectedAtMs - CORRELATION_WINDOW_MS
  );

  const nearbyImpactfulEvent = events.find((e: any) => {
    const eventTs = new Date(e.received_at).getTime();
    const withinWindow = Math.abs(eventTs - detectedAtMs) <= CORRELATION_WINDOW_MS;
    const impactful = ["goal", "red_card", "penalty"].includes(e.event_type);
    return withinWindow && impactful;
  });

  if (nearbyImpactfulEvent) {
    return { classification: "explained", confidence: 65 };
  }

  return { classification: "unexplained", confidence: 90 };
}