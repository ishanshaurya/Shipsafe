import { ChevronRight } from "lucide-react"
import Flag from "./Flag"

// One expandable ledger row: flag, title, meta line, right-hand label, chevron.
export default function Finding({ verdict, title, meta, side, open, onToggle, children }) {
  return (
    <li>
      <button type="button" className="row-btn" aria-expanded={open} onClick={onToggle}>
        {verdict ? <Flag verdict={verdict} size={24} labelled /> : <span />}
        <span>
          <span className="row-title">{title}</span>
          {meta && <span className="row-meta" style={{ display: "block" }}>{meta}</span>}
        </span>
        <span className="row-side">{side}</span>
        <ChevronRight className="row-chevron" size={16} aria-hidden="true" />
      </button>
      {open && <div className="row-detail">{children}</div>}
    </li>
  )
}

export function Detail({ label, children }) {
  return (
    <div>
      <div className="detail-label">{label}</div>
      <div>{children}</div>
    </div>
  )
}
