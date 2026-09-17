import { useState } from "react"
import { Link } from "react-router-dom"
import { KeyRound, Search, Loader2, AlertTriangle, ChevronDown, ChevronRight, Globe, Shield, Scale, FileWarning, Lightbulb, TrendingUp } from "lucide-react"
import { saveScan } from "../services/supabaseService"
import { callAI, extractScore, normalizeLoopholesResult } from "../services/scanService"
import { useAuth } from "../hooks/useAuth"
import { useIsMobile } from "../hooks/useIsMobile"
import ReportButton from "../components/ReportButton"
import NextSteps from "../components/NextSteps"
import ScoreRing from "../components/ScoreRing"
import { getSuggestions } from "../utils/crossToolSuggestions"

/* ═══════════════════════════════════════════════════════════
   LOOPHOLE FINDER — ShipSafe's #2 Feature

   How it works:
   1. Developer describes their AI system
   2. Selects target deployment countries
   3. AI returns grey areas, exploitation risks, defensive
      recommendations, and upcoming regulatory changes
   ═══════════════════════════════════════════════════════════ */

const COUNTRIES = [
  { id: "eu", name: "European Union", flag: "🇪🇺" },
  { id: "us", name: "United States", flag: "🇺🇸" },
  { id: "in", name: "India", flag: "🇮🇳" },
  { id: "cn", name: "China", flag: "🇨🇳" },
  { id: "uk", name: "United Kingdom", flag: "🇬🇧" },
  { id: "ca", name: "Canada", flag: "🇨🇦" },
  { id: "br", name: "Brazil", flag: "🇧🇷" },
  { id: "au", name: "Australia", flag: "🇦🇺" },
  { id: "jp", name: "Japan", flag: "🇯🇵" },
  { id: "kr", name: "South Korea", flag: "🇰🇷" },
  { id: "sg", name: "Singapore", flag: "🇸🇬" },
]

const RISK_COLOR = {
  high:   { color: "#ef4444", bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.18)",  label: "HIGH RISK" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "MEDIUM RISK" },
  low:    { color: "#22c55e", bg: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.18)",  label: "LOW RISK" },
}

const SAMPLE_DESCRIPTIONS = [
  { label: "Facial Recognition Attendance", text: "An AI-powered facial recognition system for school/office attendance tracking. Uses camera feeds to identify individuals and mark attendance automatically. Stores facial biometric data in a cloud database." },
  { label: "AI Content Moderator", text: "An automated content moderation system that uses LLMs to detect and remove harmful content on a social media platform. Makes autonomous decisions to remove posts without human review." },
  { label: "AI Hiring Screener", text: "An AI system that screens job applications, ranks candidates, and automatically rejects applicants below a certain score threshold. Uses resume parsing and NLP to evaluate qualifications." },
]

function GreyAreaCard({ area, open, toggle }) {
  const risk = RISK_COLOR[area.risk] || RISK_COLOR.medium
  return (
    <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, borderLeft: `3px solid ${risk.color}` }}>
      <div onClick={toggle} style={{ padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 4 }}>{area.country}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{area.regulation}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: risk.color, letterSpacing: "0.08em", background: `${risk.color}12`, padding: "2px 6px", borderRadius: 4, marginLeft: "auto" }}>{risk.label}</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{area.title}</div>
        </div>
        {open ? <ChevronDown size={13} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: 2 }} /> : <ChevronRight size={13} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: 2 }} />}
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 12 }}>{area.description}</p>

          <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, padding: "11px 13px", marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", marginBottom: 5, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
              <FileWarning size={10} /> EXPLOITATION RISK
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>{area.exploitation}</p>
          </div>

          <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 8, padding: "11px 13px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#34d399", marginBottom: 5, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={10} /> DEFENSIVE RECOMMENDATION
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>{area.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Loopholes() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [exp, setExp] = useState({})

  const toggleCountry = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])
  }

  const toggle = (id) => setExp((p) => ({ ...p, [id]: !p[id] }))

  const runAnalysis = async () => {
    if (!description.trim() || selected.length === 0 || loading) return
    setLoading(true); setResult(null); setError(null); setExp({}); setSuggestions([])

    const { content, error: aiError } = await callAI("loopholes", { systemDescription: description, countries: selected })
    if (aiError) { setError(aiError); setLoading(false); return }

    const analysis = normalizeLoopholesResult(content)
    setResult(analysis)
    setSuggestions(getSuggestions("loopholes", analysis))
    if (user) {
      saveScan(user.id, "loopholes", description.slice(0, 500), analysis, extractScore("loopholes", analysis))
        .then(({ error }) => { if (error) console.error("Failed to save scan:", error.message) })
    }
    const ae = {}
    analysis.greyAreas.forEach((g) => { if (g.risk === "high") ae[g.id] = true })
    setExp(ae)
    setLoading(false)
  }

  const disabled = loading || !description.trim() || selected.length === 0

  return (
    <div className="animate-fade-in">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <KeyRound size={18} color="#a855f7" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>Loophole Finder</h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            Describe your AI system → select countries → find regulatory grey areas
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* LEFT — Input */}
        <div>
          {/* Quick templates */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {SAMPLE_DESCRIPTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setDescription(s.text); setResult(null) }}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "5px 11px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#a855f7"; e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)" }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Description textarea */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              Describe your AI system
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., 'An AI-powered facial recognition system for school attendance that stores biometric data in the cloud and makes automated decisions about student presence...'"
              style={{ width: "100%", minHeight: 150, background: "transparent", border: "none", outline: "none", resize: "vertical", color: "rgba(255,255,255,0.75)", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, padding: 14 }}
            />
          </div>

          {/* Country selector */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={12} color="rgba(255,255,255,0.2)" />
              Target deployment countries
              {selected.length > 0 && <span style={{ color: "#a855f7", fontWeight: 600 }}>· {selected.length} selected</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COUNTRIES.map((c) => {
                const active = selected.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCountry(c.id)}
                    style={{
                      background: active ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 7, padding: "7px 12px", cursor: "pointer",
                      color: active ? "#a855f7" : "rgba(255,255,255,0.35)",
                      fontSize: 12, fontWeight: active ? 600 : 400,
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 14 }}>{c.flag}</span> {c.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={runAnalysis}
            disabled={disabled}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
              background: disabled ? "rgba(255,255,255,0.04)" : "#a855f7",
              color: disabled ? "rgba(255,255,255,0.2)" : "#fff",
              fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s",
            }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Analyzing regulations...</>
              : <><Search size={15} /> Find Loopholes</>}
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: "11px 14px", borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 2 }}>Analysis failed</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{error}</div>
              </div>
              <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}
        </div>

        {/* RIGHT — Results */}
        <div>
          {/* Empty state */}
          {!loading && !result && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "60px 40px", textAlign: "center", minHeight: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <KeyRound size={24} color="#a855f7" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>Describe your AI system</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: 300 }}>Find legal grey areas, exploitation risks, and defensive strategies across global AI regulations.</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "80px 40px", textAlign: "center", minHeight: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={32} color="#a855f7" style={{ animation: "spin 1.5s linear infinite", marginBottom: 18 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>Cross-referencing {selected.length} jurisdiction{selected.length !== 1 ? "s" : ""}</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Analyzing regulations for grey areas...</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Risk score + summary */}
              <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 22px", display: "flex", gap: 20, alignItems: "center" }}>
                <ScoreRing
                  score={result.riskScore}
                  size={100}
                  strokeWidth={6}
                  trackColor="rgba(255,255,255,0.06)"
                  ringColor="#a855f7"
                  numberColor={result.riskScore >= 60 ? "#ef4444" : result.riskScore >= 35 ? "#f59e0b" : "#22c55e"}
                  numberFontSize={26}
                  label="RISK"
                  labelFontSize={9}
                  labelColor="rgba(255,255,255,0.2)"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 6 }}>REGULATORY RISK SCORE</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: 0 }}>{result.summary}</p>
                </div>
              </div>

              {/* ReportButton */}
              <ReportButton
                scanType="loopholes"
                title={`Loophole scan · ${result.greyAreas?.length ?? 0} grey areas found`}
                resultData={result}
              />

              {/* Grey areas header */}
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", padding: "0 2px" }}>
                {result.greyAreas.length} GREY AREAS FOUND
              </div>

              {/* Grey area cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.greyAreas.map((area) => (
                  <GreyAreaCard key={area.id} area={area} open={!!exp[area.id]} toggle={() => toggle(area.id)} />
                ))}
              </div>

              {/* Defensive recommendations */}
              {result.defenses.length > 0 && (
                <div style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#34d399", marginBottom: 12, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                    <Lightbulb size={12} /> PROACTIVE DEFENSE CHECKLIST
                  </div>
                  {result.defenses.map((d, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                      <span style={{ color: "#34d399", flexShrink: 0 }}>→</span> {d}
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming changes */}
              {result.upcoming.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 12, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                    <TrendingUp size={12} /> UPCOMING REGULATORY CHANGES
                  </div>
                  {result.upcoming.map((u, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "11px 13px", marginBottom: i < result.upcoming.length - 1 ? 6 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{u.regulation}</span>
                        <span style={{ fontSize: 10, color: u.status === "Draft" ? "#f59e0b" : "#a855f7", fontWeight: 600 }}>{u.status} · {u.expected}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, margin: 0 }}>{u.impact}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NextSteps suggestions={suggestions} />
    </div>
  )
}
