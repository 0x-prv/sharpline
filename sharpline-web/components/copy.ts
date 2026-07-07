export function formatMarketSelection(market?: string, selection?: string) {
  const cleanSelection = humanizeToken(selection);
  const lower = cleanSelection.toLowerCase();

  if (market === "1X2_PARTICIPANT_RESULT") {
    if (lower === "draw" || lower === "tie") return "Draw";
    return cleanSelection ? `${cleanSelection} Win` : "Match Winner";
  }

  if (market?.includes("OVER_UNDER") || lower.includes("over") || lower.includes("under")) return cleanSelection || "Total Goals";
  if (market?.includes("HANDICAP")) return cleanSelection ? `${cleanSelection} Handicap` : "Handicap Market";

  return cleanSelection || humanizeToken(market) || "Selected Market";
}

export function humanizeToken(value?: string) {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function explainReason(reason?: string) {
  const reasons: Record<string, string> = {
    HIGH_CONFIDENCE_ANOMALY: "High Confidence Market Anomaly",
    POST_EVENT_MOVE: "Odds moved immediately after a match event.",
    NO_SCORE_CHANGE_MOVE: "Odds moved without any score change.",
    STEAM_MOVE: "Several books moved in the same direction quickly.",
  };

  return reasons[reason ?? ""] ?? humanizeToken(reason) ?? "Unusual market movement detected.";
}

export function explainAction(action?: string) {
  const actions: Record<string, string> = {
    FOLLOW: "FOLLOW",
    WATCH: "WATCH",
    ALERT: "ALERT",
    FADE: "FADE",
  };

  return actions[action ?? ""] ?? humanizeToken(action) ?? "REVIEW";
}

export function actionTone(action?: string) {
  if (action === "ALERT") return "text-signal-coral border-signal-coral/30 bg-signal-coral/10";
  if (action === "WATCH") return "text-signal-amber border-signal-amber/30 bg-signal-amber/10";
  if (action === "FOLLOW") return "text-signal-blue border-signal-blue/30 bg-signal-blue/10";
  return "text-text-muted border-border bg-surface-hover";
}
