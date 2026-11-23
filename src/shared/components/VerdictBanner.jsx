import Flag from "./Flag"
import { VERDICT_WORD } from "../verdict"

// Ruler from 0 to 100. Readiness scores clear at 80; risk scores (Loophole Finder) must stay under 20.
function Gauge({ score, risk }) {
  const limit = risk ? 20 : 80
  const label = risk ? "Risk" : "Score"
  const limitLabel = risk ? "Risk limit 20" : "Ship line 80"
  const at = Math.max(0, Math.min(100, score))
  return (
    <div className="gauge" role="img" aria-label={`${label} ${score} of 100. ${limitLabel}.`}>
      <div className="gauge-ticks" />
      <div className="gauge-mark limit" style={{ left: `${limit}%` }}><small>{limitLabel}</small></div>
      <div className="gauge-mark score" style={{ left: `${at}%` }}><small>{label} {score}</small></div>
    </div>
  )
}

// The verdict word, the summary, and the score against its limit. The flag hoists in when a scan finishes.
export default function VerdictBanner({ verdict, score, risk = false, children }) {
  const word = VERDICT_WORD[verdict]
  return (
    <section className="banner" aria-label="Verdict">
      <div className="banner-flag">
        <span className="banner-hoist" style={{ display: "inline-flex", animation: "hoist var(--dur-slow) var(--ease-out) both" }}>
          <Flag verdict={verdict} size={36} />
        </span>
        <span className={`banner-word ${verdict}`}>{word}</span>
      </div>
      <div>{children}</div>
      <Gauge score={score} risk={risk} />
      <p className="sr-only" role="status" aria-live="polite">Scan finished: {word}, score {score}</p>
    </section>
  )
}
