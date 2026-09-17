// src/components/ScoreRing.jsx
//
// Circular score/progress indicator. Was hand-copied into 5 pages
// (Dashboard, Debugger, Report, StressTest as "ScoreRing"; Loopholes as
// "RiskRing") with the same stroke-dashoffset math and color-threshold
// logic each time. One module now, callers pass only what differs.

const DEFAULT_THRESHOLDS = [
  { min: 80, color: "#34d399" },
  { min: 60, color: "#eab308" },
  { min: 40, color: "#f97316" },
  { min: 0, color: "#ef4444" },
]

function colorForScore(score, thresholds) {
  for (const t of thresholds) if (score >= t.min) return t.color
  return thresholds[thresholds.length - 1]?.color ?? "#ef4444"
}

export default function ScoreRing({
  score,
  size = 110,
  strokeWidth = 9,
  trackColor = "rgba(255,255,255,0.05)",
  ringColor,
  numberColor,
  numberFontSize,
  numberFontWeight = 900,
  label = "/ 100",
  labelFontSize,
  labelColor = "rgba(255,255,255,0.25)",
  thresholds = DEFAULT_THRESHOLDS,
}) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const computed = colorForScore(score, thresholds)
  const ring = ringColor || computed
  const number = numberColor || ringColor || computed

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={ring} strokeWidth={strokeWidth}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: numberFontSize ?? Math.round(size * 0.25), fontWeight: numberFontWeight, color: number, letterSpacing: "-0.03em" }}>{score}</span>
        <span style={{ fontSize: labelFontSize ?? Math.round(size * 0.09), color: labelColor }}>{label}</span>
      </div>
    </div>
  )
}
