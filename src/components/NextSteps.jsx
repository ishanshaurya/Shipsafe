import { Link } from "react-router-dom"
import { Sparkles, ChevronRight } from "lucide-react"

/* ─── Shared "Recommended Next Steps" section ───────────────
   Rendered below scan results in all 5 tool pages.
   Props: suggestions — array from getSuggestions()
   ──────────────────────────────────────────────────────────── */

const PRIORITY = {
  high:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   label: "HIGH" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)",  label: "MED" },
  low:    { color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)",  label: "LOW" },
}

export default function NextSteps({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null
  const shown = suggestions.slice(0, 3)
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Sparkles size={11} color="#34d399" /> RECOMMENDED NEXT STEPS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((s, i) => {
          const p = PRIORITY[s.priority] || PRIORITY.medium
          return (
            <Link
              key={i}
              to={s.path}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "rgba(52,211,153,0.04)",
                border: "1px solid rgba(52,211,153,0.1)",
                borderRadius: 10, padding: "12px 14px",
                textDecoration: "none", transition: "border-color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.25)" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.1)" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{s.reason}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                  color: p.color, background: p.bg, border: `1px solid ${p.border}`,
                  padding: "2px 7px", borderRadius: 4,
                }}>{p.label}</span>
                <ChevronRight size={14} color="#334155" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
