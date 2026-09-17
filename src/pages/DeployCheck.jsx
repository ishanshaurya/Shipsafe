import { useState } from "react"
import { Link } from "react-router-dom"
import { Rocket, Play, Loader2, CheckCircle, AlertTriangle, AlertCircle, X as XIcon, ChevronDown, ChevronRight, Server, Shield, Globe, Key, Database, Wifi } from "lucide-react"
import { saveScan } from "../services/supabaseService"
import { callAI, extractScore, normalizeDeployCheckResult } from "../services/scanService"
import { useAuth } from "../hooks/useAuth"
import { useIsMobile } from "../hooks/useIsMobile"
import ReportButton from "../components/ReportButton"
import NextSteps from "../components/NextSteps"
import { getSuggestions } from "../utils/crossToolSuggestions"

/* ═══════════════════════════════════════════════════════════
   DEPLOY READINESS CHECKER — ShipSafe Stage 3

   Developer describes their deployment setup and the AI
   checks for common gotchas that crash apps in production.
   ═══════════════════════════════════════════════════════════ */

const PLATFORMS = [
  { id: "vercel", name: "Vercel", icon: "▲" },
  { id: "netlify", name: "Netlify", icon: "◆" },
  { id: "railway", name: "Railway", icon: "●" },
  { id: "aws", name: "AWS", icon: "☁" },
  { id: "docker", name: "Docker", icon: "🐳" },
  { id: "other", name: "Other", icon: "⚙" },
]

const SAMPLE_CONFIG = `Platform: Vercel
Framework: Next.js 14
Database: Supabase (PostgreSQL)
Auth: Supabase Auth (email + GitHub OAuth)
AI: Claude API via serverless function
Environment variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - ANTHROPIC_API_KEY
  - NEXTAUTH_SECRET
CORS: Not configured (using Vercel defaults)
Rate limiting: None
Error monitoring: None
SSL: Vercel auto-SSL`

const STATUS_ICON = { pass: CheckCircle, fail: AlertCircle, warn: AlertTriangle, info: Globe }
const STATUS_COLOR = { pass: "#34d399", fail: "#ef4444", warn: "#eab308", info: "#38bdf8" }

export default function DeployCheck() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [config, setConfig] = useState("")
  const [platform, setPlatform] = useState("vercel")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [exp, setExp] = useState({})

  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))

  const runCheck = async () => {
    if (!config.trim() || loading) return
    setLoading(true); setResult(null); setError(null); setExp({}); setSuggestions([])

    const { content, error: aiError } = await callAI("deploy-check", { setupDescription: config, platform })
    if (aiError) { setError(aiError); setLoading(false); return }

    const res = normalizeDeployCheckResult(content, platform)
    setResult(res)
    setSuggestions(getSuggestions("deploy-check", res))
    if (user) {
      saveScan(user.id, "deploy-check", config.slice(0, 500), res, extractScore("deploy-check", res))
        .then(({ error }) => { if (error) console.error("Failed to save scan:", error.message) })
    }
    const ae = {}
    res.checks.forEach(c => { if (c.status === "fail") ae[c.id] = true })
    setExp(ae)
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .dc-fade { animation: fadeIn 0.25s ease }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Rocket size={18} color="#34d399" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "-0.02em" }}>Deploy Readiness Checker</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "3px 0 0" }}>
            Describe your setup → Validate security, config & platform readiness
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left — Input */}
        <div>
          {/* Platform selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setPlatform(p.id)}
                style={{
                  background: platform === p.id ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${platform === p.id ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 7, padding: "7px 12px", fontSize: 11, cursor: "pointer",
                  color: platform === p.id ? "#34d399" : "rgba(255,255,255,0.4)",
                  fontWeight: platform === p.id ? 600 : 400,
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s", fontFamily: "inherit",
                }}>
                <span>{p.icon}</span> {p.name}
              </button>
            ))}
          </div>

          {/* Editor card */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Deployment Configuration</span>
              <button onClick={() => { setConfig(SAMPLE_CONFIG); setResult(null) }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#34d399", fontFamily: "inherit" }}>
                Load Sample
              </button>
            </div>
            <textarea
              value={config}
              onChange={e => setConfig(e.target.value)}
              placeholder={"Describe your deployment setup:\n- Platform & framework\n- Database\n- Auth method\n- Environment variables\n- CORS config\n- Rate limiting\n- Error monitoring\n- SSL/TLS"}
              style={{
                width: "100%", minHeight: 340, background: "transparent", border: "none", outline: "none",
                resize: "vertical", color: "rgba(255,255,255,0.75)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 12, lineHeight: 1.8, padding: "14px 16px",
              }}
            />
          </div>

          {/* Run button */}
          <button
            onClick={runCheck}
            disabled={loading || !config.trim()}
            style={{
              width: "100%", padding: "13px 20px", borderRadius: 9, border: "none",
              background: loading || !config.trim() ? "rgba(255,255,255,0.04)" : "#34d399",
              color: loading || !config.trim() ? "rgba(255,255,255,0.2)" : "#000",
              fontSize: 13, fontWeight: 700, cursor: loading || !config.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s", fontFamily: "inherit",
            }}>
            {loading
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Checking...</>
              : <><Rocket size={15} /> Run Deploy Check</>
            }
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: "11px 14px", borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 2 }}>Deploy check failed</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{error}</div>
              </div>
              <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}
        </div>

        {/* Right — Results */}
        <div>
          {!loading && !result && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "60px 32px", textAlign: "center", minHeight: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <Rocket size={22} color="#34d399" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: "0 0 8px" }}>Describe your deployment</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.7, maxWidth: 300, margin: 0 }}>Validates env vars, security headers, CORS, rate limits, and platform-specific gotchas.</p>
            </div>
          )}

          {loading && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "80px 32px", textAlign: "center", minHeight: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={32} color="#34d399" style={{ animation: "spin 1.5s linear infinite", marginBottom: 18 }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "0 0 6px" }}>
                Validating deployment for {PLATFORMS.find(p => p.id === platform)?.name}
              </h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>Checking security, config, and platform requirements...</p>
            </div>
          )}

          {result && (
            <div className="dc-fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Score card */}
              <div style={{ background: "#0a0a0a", border: `1px solid ${result.verdictColor}25`, borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18 }}>
                {/* Score ring */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <svg width={68} height={68} style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={34} cy={34} r={28} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
                    <circle cx={34} cy={34} r={28} fill="none" stroke={result.verdictColor} strokeWidth={5}
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - result.score / 100)}`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: result.verdictColor, lineHeight: 1 }}>{result.score}</span>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>SCORE</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: result.verdictColor, letterSpacing: "0.1em", marginBottom: 4 }}>{result.verdict}</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>{result.summary}</p>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {[
                  { l: "Passed", v: result.stats.passed, c: "#34d399" },
                  { l: "Failed", v: result.stats.failed, c: "#ef4444" },
                  { l: "Warnings", v: result.stats.warned, c: "#eab308" },
                  { l: "Info", v: result.stats.info, c: "#38bdf8" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "10px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", marginTop: 4 }}>{s.l.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              <ReportButton
                scanType="deploy-check"
                title={`Deploy check · ${result.checks?.filter(c => c.status === "fail").length ?? 0} failures`}
                resultData={result}
              />

              {/* Checks list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {result.checks.map(check => {
                  const Icon = STATUS_ICON[check.status]
                  const color = STATUS_COLOR[check.status]
                  return (
                    <div key={check.id} style={{
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 9,
                      overflow: "hidden",
                    }}>
                      <div onClick={() => toggle(check.id)} style={{ padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                        <Icon size={14} color={color} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{check.title}</span>
                        {check.fix && (
                          exp[check.id]
                            ? <ChevronDown size={12} color="rgba(255,255,255,0.2)" />
                            : <ChevronRight size={12} color="rgba(255,255,255,0.2)" />
                        )}
                      </div>
                      {exp[check.id] && check.fix && (
                        <div style={{ padding: "0 14px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: "10px 0 8px" }}>{check.description}</p>
                          <div style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 6, padding: "10px 12px" }}>
                            <pre style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{check.fix}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <NextSteps suggestions={suggestions} />
    </div>
  )
}
