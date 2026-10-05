import Flag from "./Flag"
import { VERDICT_WORD } from "../verdict"

// Flag + numeral + word, with the summary on its right. The flag hoists in when a scan finishes.
export default function VerdictBanner({ verdict, score, children }) {
  const word = VERDICT_WORD[verdict]
  return (
    <section className="banner" aria-label="Verdict">
      <div className="banner-flag">
        <span className="banner-hoist" style={{ display: "inline-flex", animation: "hoist var(--dur-slow) var(--ease-out) both" }}>
          <Flag verdict={verdict} size={48} />
        </span>
        <span className="banner-score">{score}</span>
        <span className={`banner-word ${verdict}`}>{word}</span>
      </div>
      <div>{children}</div>
      <p className="sr-only" role="status" aria-live="polite">Scan finished: {word}, score {score}</p>
    </section>
  )
}
