// src/utils/verdict.js
//
// The one place that turns a score or severity into Cleared / Held / Blocked.
// Bands and mapping: docs/design/system.md ("Verdict").

export const VERDICT_WORD = {
  cleared: "Cleared",
  held: "Held",
  blocked: "Blocked",
}

// `risk` scores (Loophole Finder) run the other way: 100 = most risk = Blocked.
export function scoreVerdict(score, { risk = false } = {}) {
  const readiness = risk ? 100 - score : score
  if (readiness >= 80) return "cleared"
  if (readiness >= 60) return "held"
  return "blocked"
}

const BY_SEVERITY = { critical: "blocked", high: "blocked", medium: "held", low: "cleared" }

export function severityVerdict(severity) {
  return BY_SEVERITY[String(severity).toLowerCase()] ?? "held"
}

export function scanVerdict(scanType, score) {
  return scoreVerdict(score, { risk: scanType === "loopholes" })
}
