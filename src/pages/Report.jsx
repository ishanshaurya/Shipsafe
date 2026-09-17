import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Shield, AlertCircle, CheckCircle, AlertTriangle, Info, Clock, ExternalLink, Copy, Check } from "lucide-react"
import { getReportBySlug } from "../services/supabaseService"
import ScoreRing from "../components/ScoreRing"

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const SCAN_LABELS = {
  debugger: "AI Debugger",
  audit: "Vibe-Code Audit",
  loopholes: "Loophole Finder",
  "deploy-check": "Deploy Checker",
  "stress-test": "Stress Tester",
}

const SCAN_COLORS = {
  debugger: "#ef4444",
  audit: "#f97316",
  loopholes: "#a855f7",
  "deploy-check": "#22c55e",
  "stress-test": "#eab308",
}

const SEV = {
  critical: { color: "#ef4444", icon: AlertCircle },
  high:     { color: "#f97316", icon: AlertTriangle },
  medium:   { color: "#eab308", icon: Info },
  low:      { color: "#22c55e", icon: CheckCircle },
  pass:     { color: "#22c55e", icon: CheckCircle },
  fail:     { color: "#ef4444", icon: AlertCircle },
  warn:     { color: "#eab308", icon: AlertTriangle },
}

// Renders result_data differently per scan type
function ResultBody({ scanType, data }) {
  if (!data) return null

  // ── DEBUGGER ──
  if (scanType === "debugger") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.summary && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{data.summary}</p>}
        {data.issues?.map((issue, i) => {
          const sev = SEV[issue.severity] || SEV.medium
          const SI = sev.icon
          return (
            <div key={i} style={{ background: "rgba(15,22,40,0.6)", border: `1px solid ${sev.color}25`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12 }}>
              <SI size={15} color={sev.color} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  {issue.line && <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", background: "rgba(15,22,40,0.8)", padding: "1px 6px", borderRadius: 4 }}>L{issue.line}</span>}
                  <span style={{ fontSize: 9, fontWeight: 700, color: sev.color, letterSpacing: "0.08em" }}>{(issue.severity || "").toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, marginBottom: 4 }}>{issue.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{issue.description}</div>
                {issue.fix && (
                  <div style={{ marginTop: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 6, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#34d399", marginBottom: 4 }}>FIX</div>
                    <pre style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{issue.fix}</pre>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── AUDIT ──
  if (scanType === "audit") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.summary && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{data.summary}</p>}
        {data.categories && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 8 }}>
            {Object.entries(data.categories).map(([cat, score], i) => (
              <div key={i} style={{ background: "rgba(15,22,40,0.6)", border: "1px solid rgba(56,189,248,0.08)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444" }}>{score}</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{cat}</div>
              </div>
            ))}
          </div>
        )}
        {data.issues?.map((issue, i) => {
          const sev = SEV[issue.severity] || SEV.medium
          const SI = sev.icon
          return (
            <div key={i} style={{ background: "rgba(15,22,40,0.6)", border: `1px solid ${sev.color}25`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12 }}>
              <SI size={15} color={sev.color} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, marginBottom: 4 }}>{issue.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{issue.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── LOOPHOLES ──
  if (scanType === "loopholes") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.summary && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{data.summary}</p>}
        {data.greyAreas?.map((area, i) => (
          <div key={i} style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>{area.title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: area.recommendation ? 8 : 0 }}>{area.description}</div>
            {area.recommendation && (
              <div style={{ fontSize: 11, color: "#a855f7", borderTop: "1px solid rgba(168,85,247,0.15)", paddingTop: 8, marginTop: 4 }}>
                ↳ {area.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ── DEPLOY CHECK ──
  if (scanType === "deploy-check") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.summary && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{data.summary}</p>}
        {data.checks?.map((check, i) => {
          const sev = SEV[check.status] || SEV.medium
          const SI = sev.icon
          return (
            <div key={i} style={{ background: "rgba(15,22,40,0.6)", border: `1px solid ${sev.color}25`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <SI size={15} color={sev.color} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{check.name}</div>
                {check.message && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{check.message}</div>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: sev.color, letterSpacing: "0.08em", flexShrink: 0 }}>{(check.status || "").toUpperCase()}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── STRESS TEST ──
  if (scanType === "stress-test") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.summary && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{data.summary}</p>}
        {data.tiers?.map((tier, i) => {
          const col = tier.status === "green" ? "#22c55e" : tier.status === "yellow" ? "#eab308" : "#ef4444"
          return (
            <div key={i} style={{ background: "rgba(15,22,40,0.6)", border: `1px solid ${col}25`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{tier.users} concurrent users</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: col, letterSpacing: "0.08em" }}>{(tier.status || "").toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{tier.analysis}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── FALLBACK — dump JSON ──
  return (
    <pre style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(15,22,40,0.6)", borderRadius: 10, padding: 16 }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export default function Report() {
  const { slug } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) return
    getReportBySlug(slug).then(({ data, error }) => {
      if (error || !data) setNotFound(true)
      else setReport(data)
      setLoading(false)
    })
  }, [slug])

  const shareUrl = window.location.href

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(56,189,248,0.1)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 13, color: "#475569" }}>Loading report...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Not found ──
  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <AlertCircle size={28} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Report not found</h2>
        <p style={{ fontSize: 13, color: "#475569", marginBottom: 24 }}>This report may have been deleted or the link is incorrect.</p>
        <Link to="/" style={{ fontSize: 13, color: "#34d399", textDecoration: "none" }}>← Back to ShipSafe</Link>
      </div>
    </div>
  )

  const accentColor = SCAN_COLORS[report.scan_type] || "#38bdf8"
  const score = report.result_data?.healthScore ?? report.result_data?.score ?? null

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={{ borderBottom: "1px solid rgba(56,189,248,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(10,14,26,0.95)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #34d399, #06b6d4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🛡</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>ShipSafe</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(56,189,248,0.15)", background: "rgba(15,22,40,0.6)", color: copied ? "#34d399" : "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied!" : "Copy link"}
          </button>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#34d399", color: "#0a0e1a", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <ExternalLink size={13} /> Open ShipSafe
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>

        {/* Report header */}
        <div style={{ background: "rgba(15,22,40,0.6)", border: `1px solid ${accentColor}20`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            {score !== null && (
              <ScoreRing
                score={score}
                ringColor={accentColor}
                size={100}
                strokeWidth={7}
                trackColor="rgba(26,37,64,0.6)"
                numberFontSize={26}
                numberFontWeight={800}
                labelFontSize={9}
                labelColor="#475569"
              />
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
                {SCAN_LABELS[report.scan_type] || report.scan_type} · PUBLIC REPORT
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 8, lineHeight: 1.3 }}>{report.title}</h1>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> Generated {timeAgo(report.created_at)}
                </span>
                <span style={{ fontSize: 11, color: "#34d399" }}>● Public</span>
              </div>
            </div>
          </div>
        </div>

        {/* Result body */}
        <div style={{ background: "rgba(15,22,40,0.6)", border: "1px solid rgba(56,189,248,0.08)", borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 18 }}>SCAN RESULTS</div>
          <ResultBody scanType={report.scan_type} data={report.result_data} />
        </div>

        {/* Footer CTA */}
        <div style={{ textAlign: "center", padding: "24px", background: "rgba(15,22,40,0.4)", border: "1px solid rgba(56,189,248,0.08)", borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>Run your own scans with ShipSafe — free for developers</div>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 10, background: "#34d399", color: "#0a0e1a", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Try ShipSafe free →
          </Link>
        </div>
      </div>
    </div>
  )
}
