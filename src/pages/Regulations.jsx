import { useState, useEffect } from "react"
import { Search, Scale, ExternalLink } from "lucide-react"
import { fetchRegulations } from "../services/scanService"
import { mockRegulationResult } from "../data/mockResults"
import { useIsMobile } from "../hooks/useIsMobile"

/* ═══════════════════════════════════════════════════════════
   AI REGULATION EXPLORER
   Live topic queries via Gemini 2.5 Flash → fetchRegulations()
   Fallback: mockRegulationResult (Deepfakes example)
   ═══════════════════════════════════════════════════════════ */

const ACCENT = "#38bdf8"

const TOPICS = [
  "Privacy",
  "Deepfakes",
  "Bias",
  "Surveillance",
  "CSAM",
  "Data Retention",
  "Algorithmic Accountability",
]

const STATUS_COLOR = {
  Active:   "#22c55e",
  Draft:    "#eab308",
  Proposed: "#3b82f6",
  Repealed: "#64748b",
  Unknown:  "#64748b",
}

const SEVERITY_COLOR = {
  High:   "#ef4444",
  Medium: "#eab308",
  Low:    "#22c55e",
}

// ─── Sub-components ───────────────────────────────────────

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] ?? "#64748b"
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      color, background: `${color}18`, padding: "3px 8px", borderRadius: 4,
      flexShrink: 0,
    }}>
      {(status ?? "Unknown").toUpperCase()}
    </span>
  )
}

function SeverityBadge({ severity, large = false }) {
  const color = SEVERITY_COLOR[severity] ?? "#64748b"
  return (
    <span style={{
      display: "inline-block",
      fontSize: large ? 14 : 10, fontWeight: 700, letterSpacing: "0.08em",
      color, background: `${color}18`,
      padding: large ? "8px 18px" : "3px 8px",
      borderRadius: large ? 8 : 4,
      border: `1px solid ${color}30`,
    }}>
      {(severity ?? "Unknown").toUpperCase()}
    </span>
  )
}

const CYCLING_STRINGS = [
  "Checking EU frameworks...",
  "Scanning Asia-Pacific laws...",
  "Reviewing draft legislation...",
  "Mapping country coverage...",
]

const PILLS = [
  { label: "GDPR",   r: 90,  dur: 6,   start: 0   },
  { label: "AI Act", r: 115, dur: 9,   start: 72  },
  { label: "DPDP",   r: 100, dur: 7.5, start: 144 },
  { label: "CCPA",   r: 125, dur: 11,  start: 216 },
  { label: "DSA",    r: 85,  dur: 8,   start: 288 },
]

function GlobeLoader() {
  const [cycleIdx, setCycleIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCycleIdx(i => (i + 1) % CYCLING_STRINGS.length), 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 300, gap: 20,
    }}>
      <style>{`
        ${PILLS.map((p, i) => `
          @keyframes orbit-${i} {
            from { transform: rotate(${p.start}deg) translateX(${p.r}px) rotate(-${p.start}deg); }
            to   { transform: rotate(${p.start + 360}deg) translateX(${p.r}px) rotate(-${p.start + 360}deg); }
          }
        `).join("")}
        .globe-pill { position: absolute; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes globe-pulse { 0%,100%{opacity:.8} 50%{opacity:1} }
        @keyframes cycle-fade { 0%{opacity:0;transform:translateY(4px)} 15%{opacity:1;transform:translateY(0)} 85%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-4px)} }
      `}</style>

      {/* Orbit stage */}
      <div style={{ position: "relative", width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Globe */}
        <svg width={80} height={80} viewBox="0 0 80 80" style={{ animation: "globe-pulse 2.5s ease-in-out infinite", zIndex: 1 }}>
          <circle cx={40} cy={40} r={36} fill="#0f172a" stroke={ACCENT} strokeWidth={2} />
          <ellipse cx={40} cy={40} rx={18} ry={36} fill="none" stroke={`${ACCENT}55`} strokeWidth={1} />
          <line x1={4} y1={40} x2={76} y2={40} stroke={`${ACCENT}55`} strokeWidth={1} />
          <line x1={40} y1={4} x2={40} y2={76} stroke={`${ACCENT}33`} strokeWidth={1} />
          <ellipse cx={40} cy={40} rx={36} ry={12} fill="none" stroke={`${ACCENT}33`} strokeWidth={1} />
        </svg>

        {/* Orbiting pills */}
        {PILLS.map((p, i) => (
          <div key={p.label} className="globe-pill" style={{
            animationName: `orbit-${i}`,
            animationDuration: `${p.dur}s`,
          }}>
            <span style={{
              display: "inline-block",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              color: ACCENT, background: `${ACCENT}18`,
              border: `1px solid ${ACCENT}35`,
              padding: "3px 8px", borderRadius: 4,
              whiteSpace: "nowrap",
            }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          Searching global regulations...
        </div>
        <div key={cycleIdx} style={{
          fontSize: 11, color: "rgba(255,255,255,0.2)",
          animation: "cycle-fade 2s ease",
        }}>
          {CYCLING_STRINGS[cycleIdx]}
        </div>
      </div>
    </div>
  )
}

function RegulationCard({ reg }) {
  return (
    <div style={{
      background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Name + status */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, flex: 1 }}>
            {reg.name}
          </span>
          <StatusBadge status={reg.status} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
          {reg.country}{reg.year ? ` · ${reg.year}` : ""}
        </div>
      </div>

      {/* Summary */}
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.48)", lineHeight: 1.75, margin: 0 }}>
        {reg.summary}
      </p>

      {/* Sector chips */}
      {reg.sectors.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {reg.sectors.map(s => (
            <span key={s} style={{
              fontSize: 9, color: ACCENT, background: `${ACCENT}12`,
              border: `1px solid ${ACCENT}20`, padding: "2px 8px", borderRadius: 4,
              letterSpacing: "0.04em",
            }}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Source */}
      {reg.source_url
        ? (
          <a href={reg.source_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: ACCENT, textDecoration: "none" }}>
            <ExternalLink size={11} /> Official Source →
          </a>
        )
        : (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>
            Source unverified
          </span>
        )
      }
    </div>
  )
}

function RiskCard({ reg }) {
  const borderColor = SEVERITY_COLOR[reg.risk.severity] ?? "#64748b"
  return (
    <div style={{
      background: "#0a0a0a",
      border: `1px solid ${borderColor}25`,
      borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Label + severity */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}>
          REAL-WORLD RISK
        </span>
        <SeverityBadge severity={reg.risk.severity} />
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.48)", lineHeight: 1.75, margin: 0 }}>
        {reg.risk.description}
      </p>

      {/* Who is at risk */}
      {reg.risk.who_is_at_risk.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em", marginBottom: 8 }}>
            WHO IS AT RISK
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {reg.risk.who_is_at_risk.map(w => (
              <span key={w} style={{
                fontSize: 10, color: "rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                padding: "3px 10px", borderRadius: 4,
              }}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function Regulations() {
  const isMobile = useIsMobile()
  const [query, setQuery] = useState("")
  const [activeTopic, setActiveTopic] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const runSearch = async (overrideTopic) => {
    const q = (overrideTopic ?? query).trim()
    if (!q || loading) return
    setLoading(true)
    setError(false)
    setResults(null)
    const data = await fetchRegulations(q)
    // fetchRegulations returns the exact mockRegulationResult reference on any failure
    setError(data === mockRegulationResult)
    setResults(data)
    setLoading(false)
  }

  const handleChip = (topic) => {
    setActiveTopic(topic)
    setQuery(topic)
    runSearch(topic)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setActiveTopic(null)
    runSearch()
  }

  // All checklist items from all regulations, deduplicated
  const checklist = results
    ? [...new Map(
        results.regulations.flatMap(r => r.developer_checklist).map(item => [item, item])
      ).values()]
    : []

  const hasInsightStrip = results && (
    results.country_coverage || results.overall_severity || checklist.length > 0
  )

  return (
    <div className="animate-fade-in" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 0.4 }
          50%       { opacity: 0.9 }
        }
        @keyframes regFadeIn {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .reg-fade { animation: regFadeIn 0.25s ease }
      `}</style>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${ACCENT}10`, border: `1px solid ${ACCENT}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Scale size={18} color={ACCENT} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "-0.02em" }}>
            AI Regulation Explorer
          </h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "3px 0 0" }}>
            Search global AI laws by topic
          </p>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} color="rgba(255,255,255,0.2)"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveTopic(null) }}
            placeholder="e.g. facial recognition, healthcare AI, GDPR..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 9, color: "rgba(255,255,255,0.75)",
              fontSize: 13, padding: "11px 14px 11px 38px",
              outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || loading}
          style={{
            padding: "11px 22px", borderRadius: 9, border: "none",
            background: !query.trim() || loading ? "rgba(255,255,255,0.04)" : ACCENT,
            color: !query.trim() || loading ? "rgba(255,255,255,0.2)" : "#000",
            fontSize: 13, fontWeight: 700, cursor: !query.trim() || loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s",
          }}>
          Search
        </button>
      </form>

      {/* ── Topic chips ────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
        {TOPICS.map(t => {
          const active = activeTopic === t
          return (
            <button key={t} onClick={() => handleChip(t)}
              style={{
                padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${active ? ACCENT : "rgba(255,255,255,0.08)"}`,
                background: active ? `${ACCENT}15` : "rgba(255,255,255,0.03)",
                color: active ? ACCENT : "rgba(255,255,255,0.4)",
                fontSize: 12, fontWeight: active ? 600 : 400,
                fontFamily: "inherit", transition: "all 0.15s",
              }}>
              {t}
            </button>
          )
        })}
      </div>

      {/* ── Loading animation ─────────────────────── */}
      {loading && <GlobeLoader />}

      {/* ── Error banner ───────────────────────────── */}
      {!loading && error && results && (
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 9, padding: "10px 16px", marginBottom: 16,
          fontSize: 12, color: "rgba(239,68,68,0.8)",
        }}>
          AI search failed — showing example data for "Deepfakes" instead.
        </div>
      )}

      {/* ── Results ────────────────────────────────── */}
      {!loading && results && (
        <div className="reg-fade">
          {/* Regulation + Risk card pairs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.regulations.map((reg, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <RegulationCard reg={reg} />
                <RiskCard reg={reg} />
              </div>
            ))}
          </div>

          {/* Insight strip */}
          {hasInsightStrip && (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: isMobile ? 0 : 20,
              marginTop: 24,
              background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: 20,
            }}>

              {/* Col 1 — Country Coverage */}
              <div style={{ paddingBottom: isMobile ? 20 : 0, borderBottom: isMobile ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 14 }}>
                  INDICATIVE COVERAGE (AI-ESTIMATED)
                </div>
                {results.country_coverage ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {results.country_coverage.regulated?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, marginBottom: 7 }}>Regulated</div>
                        {results.country_coverage.regulated.map(c => (
                          <div key={c} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                    {results.country_coverage.draft?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#eab308", fontWeight: 600, marginBottom: 7 }}>Draft / Proposed</div>
                        {results.country_coverage.draft.map(c => (
                          <div key={c} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.48)", marginBottom: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#eab308", flexShrink: 0 }} />
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                    {results.country_coverage.unregulated?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, marginBottom: 7 }}>Unregulated</div>
                        {results.country_coverage.unregulated.map(c => (
                          <div key={c} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.28)", marginBottom: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                )}
              </div>

              {/* Col 2 — Overall Severity */}
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: isMobile ? "flex-start" : "center",
                paddingTop: isMobile ? 20 : 0, paddingBottom: isMobile ? 20 : 0,
                borderTop: isMobile ? "none" : "none",
                borderBottom: isMobile ? "1px solid rgba(255,255,255,0.06)" : "none",
                borderLeft: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
                borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
                paddingLeft: isMobile ? 0 : 20, paddingRight: isMobile ? 0 : 20,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 16 }}>
                  OVERALL SEVERITY
                </div>
                {results.overall_severity
                  ? <SeverityBadge severity={results.overall_severity} large />
                  : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                }
              </div>

              {/* Col 3 — Developer Checklist */}
              <div style={{ paddingTop: isMobile ? 20 : 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 14 }}>
                  DEVELOPER CHECKLIST
                </div>
                {checklist.length > 0
                  ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {checklist.map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.48)", lineHeight: 1.6 }}>
                          <span style={{ flexShrink: 0, marginTop: 1 }}>✅</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )
                  : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
