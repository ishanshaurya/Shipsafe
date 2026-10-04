import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

/* ─── Shared "Next steps" section ───────────────────────────
   Rendered below scan results in the tool pages.
   Props: suggestions — array from getSuggestions()
   ──────────────────────────────────────────────────────────── */

const PRIORITY = { high: "High priority", medium: "Medium priority", low: "Low priority" }

export default function NextSteps({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null
  const shown = suggestions.slice(0, 3)
  return (
    <section style={{ marginTop: 48 }} aria-labelledby="next-steps-heading">
      <h2 id="next-steps-heading" className="h2" style={{ marginBottom: 16 }}>Next steps</h2>
      <ul className="ledger">
        {shown.map((s, i) => (
          <li key={i}>
            <Link to={s.path} className="row-btn" style={{ gridTemplateColumns: "minmax(0, 1fr) auto 20px", textDecoration: "none", color: "inherit" }}>
              <span>
                <span className="row-title">{s.title}</span>
                <span className="row-meta" style={{ display: "block" }}>{s.reason}</span>
              </span>
              <span className="row-side">{PRIORITY[s.priority] || PRIORITY.medium}</span>
              <ChevronRight size={16} aria-hidden="true" className="muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
