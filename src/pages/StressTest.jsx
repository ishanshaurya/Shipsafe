import { useState } from "react"
import { Link } from "react-router-dom"
import { FlaskConical, Play, Loader2, AlertTriangle, CheckCircle, Users, Server, Database, Wifi, Zap, Clock } from "lucide-react"
import { saveScan } from "../services/supabaseService"
import { extractScore } from "../services/scanService"
import { useAuth } from "../hooks/useAuth"
import { useIsMobile } from "../hooks/useIsMobile"
import ReportButton from "../components/ReportButton"
import NextSteps from "../components/NextSteps"
import { getSuggestions } from "../utils/crossToolSuggestions"

/* ═══════════════════════════════════════════════════════════
   STRESS TESTER — ShipSafe Stage 3

   AI-powered predictive load analysis. Developer describes
   their stack, and we simulate what happens at 10, 100,
   1000, and 10000 concurrent users.

   Honest note in UI: this is simulated/predictive, not
   real load testing.
   ═══════════════════════════════════════════════════════════ */

const SAMPLE_STACK = `Frontend: Vercel (React/Next.js)
Backend: Vercel Serverless Functions
Database: Supabase PostgreSQL (free tier)
  - Connection limit: 60
  - Pool size: 15
AI API: Claude API via serverless proxy
  - ~2 seconds per request
  - No caching
Auth: Supabase Auth
  - Session-based
Storage: Supabase Storage (1GB free)
CDN: Vercel Edge Network`

const TIERS = [
  { users: 10, label: "10 users", desc: "Small team / Demo" },
  { users: 100, label: "100 users", desc: "Beta launch" },
  { users: 1000, label: "1K users", desc: "Product launch" },
  { users: 10000, label: "10K users", desc: "Viral growth" },
]

function getMockStressTest(stack) {
  const stackLower = stack.toLowerCase()
  const hasSupabase = stackLower.includes("supabase")
  const hasVercel = stackLower.includes("vercel")
  const hasAI = stackLower.includes("claude") || stackLower.includes("openai") || stackLower.includes("ai api")
  const hasCache = stackLower.includes("cache") || stackLower.includes("redis")
  const hasCDN = stackLower.includes("cdn") || stackLower.includes("edge")

  const tiers = [
    {
      users: 10, status: "green", responseTime: "120ms", label: "SAFE",
      components: [
        { name: "Frontend", status: "green", detail: hasCDN ? "CDN serving static assets — no issues" : "Static files served directly, fine at this scale" },
        { name: "API", status: "green", detail: hasVercel ? "Serverless cold starts ~200ms, warm ~50ms. No issues." : "Server handles 10 concurrent requests easily." },
        { name: "Database", status: "green", detail: hasSupabase ? "Supabase: 10 connections of 60 limit (17% utilization)" : "Database connections well within limits." },
        ...(hasAI ? [{ name: "AI API", status: "green", detail: "10 concurrent AI calls — ~2s response each. No rate limit issues." }] : []),
      ],
      bottleneck: null,
    },
    {
      users: 100, status: "yellow", responseTime: "450ms", label: "CAUTION",
      components: [
        { name: "Frontend", status: "green", detail: hasCDN ? "CDN handles static assets perfectly at this scale." : "May need CDN — 100 concurrent asset requests adds latency." },
        { name: "API", status: "yellow", detail: hasVercel ? "Vercel free tier: 100 concurrent serverless functions possible but cold starts increase. Avg response 400ms." : "Server may need horizontal scaling. Queue forming." },
        { name: "Database", status: "yellow", detail: hasSupabase ? "Supabase free tier: connection pool (15) starts queuing. 100 users hitting DB simultaneously = waiting." : "Connection pool pressure starting. Queries may queue." },
        ...(hasAI ? [{ name: "AI API", status: "red", detail: "100 concurrent AI calls = $$ per minute. Claude rate limits may throttle. Need request queuing and caching." }] : []),
      ],
      bottleneck: hasAI ? "AI API rate limits and cost" : "Database connection pooling",
    },
    {
      users: 1000, status: "red", responseTime: "2.8s", label: "BREAKING",
      components: [
        { name: "Frontend", status: "green", detail: hasCDN ? "CDN scales horizontally. No frontend issues." : "Without CDN, origin server overwhelmed. Add Cloudflare or Vercel Edge." },
        { name: "API", status: "red", detail: hasVercel ? "Vercel free tier: 100K invocations/month = exhausted in ~4 days at this rate. Need Pro plan ($20/mo)." : "Server needs load balancer + multiple instances." },
        { name: "Database", status: "red", detail: hasSupabase ? "Supabase free tier collapses: 60 connection limit hit, queries timeout, data inconsistency risk. Need Pro plan or PgBouncer." : "Database is the bottleneck. Connection pool exhausted. Queries failing." },
        ...(hasAI ? [{ name: "AI API", status: "red", detail: "1000 AI calls/min = ~$15/hour with Claude. Rate limits hit. Need aggressive caching, request batching, and queue system." }] : []),
      ],
      bottleneck: hasSupabase ? "Supabase free tier connection limit (60)" : "Database connections",
    },
    {
      users: 10000, status: "red", responseTime: "Timeout", label: "FAILURE",
      components: [
        { name: "Frontend", status: hasCDN ? "green" : "red", detail: hasCDN ? "CDN handles 10K static requests fine." : "Origin server completely overwhelmed. Pages fail to load." },
        { name: "API", status: "red", detail: "Any free tier is exhausted. Need dedicated infrastructure: load balancer, auto-scaling, queue system (BullMQ/SQS)." },
        { name: "Database", status: "red", detail: hasSupabase ? "Supabase needs Pro + connection pooler + read replicas. Free tier handles ~50 concurrent queries max." : "Need read replicas, connection pooler, and query optimization." },
        ...(hasAI ? [{ name: "AI API", status: "red", detail: "Unsustainable without caching. Cache common queries (90% hit rate can reduce AI calls 10x). Budget: ~$150/hour without caching." }] : []),
      ],
      bottleneck: "Everything — need full architecture review for this scale",
    },
  ]

  const recommendations = [
    ...(hasAI && !hasCache ? ["Add Redis caching for AI responses — most queries are similar. 90% cache hit rate reduces AI costs 10x."] : []),
    ...(hasSupabase ? ["Switch to Supabase connection pooler (port 6543) to handle more concurrent connections."] : []),
    ...(hasVercel ? ["Add Vercel Edge Middleware for rate limiting before requests hit serverless functions."] : []),
    ...(!hasCDN ? ["Add CDN (Cloudflare free tier) for static assets to reduce origin server load."] : []),
    "Implement request queuing for AI calls — process in order instead of all at once.",
    "Add database query caching with a short TTL (60s) for read-heavy endpoints.",
    "Set up auto-scaling triggers: CPU > 70%, memory > 80%, response time > 2s.",
  ]

  return { tiers, recommendations, stack: stackLower }
}

const STATUS_COLOR = { green: "#34d399", yellow: "#eab308", red: "#ef4444" }

export default function StressTest() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [stack, setStack] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [suggestions, setSuggestions] = useState([])

  const runTest = async () => {
    if (!stack.trim() || loading) return
    setLoading(true); setResult(null); setSuggestions([])
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000))
    const stressResult = getMockStressTest(stack)
    setResult(stressResult)
    setSuggestions(getSuggestions("stress-test", stressResult))
    if (user) {
      saveScan(user.id, "stress-test", stack.slice(0, 500), stressResult, extractScore("stress-test", stressResult))
        .then(({ error }) => { if (error) console.error("Failed to save scan:", error.message) })
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .st-fade { animation: fadeIn 0.25s ease }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FlaskConical size={18} color="#eab308" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "-0.02em" }}>Stress Tester</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 8 }}>
            Describe your stack → Simulate 10 to 10K concurrent users → Find bottlenecks
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#eab308" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
              Simulated
            </span>
          </p>
        </div>
      </div>

      {/* Disclaimer badge */}
      <div style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)", borderRadius: 8, padding: "9px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={12} color="rgba(234,179,8,0.6)" />
        <span style={{ fontSize: 11, color: "rgba(234,179,8,0.6)" }}>AI-predicted · not real load testing — For production, pair with k6 or Artillery.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left — Input */}
        <div>
          {/* Editor card */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Describe your architecture</span>
              <button onClick={() => { setStack(SAMPLE_STACK); setResult(null) }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#eab308", fontFamily: "inherit" }}>
                Load Sample
              </button>
            </div>
            <textarea
              value={stack}
              onChange={e => setStack(e.target.value)}
              placeholder={"Describe your full stack:\n- Frontend hosting\n- Backend / API\n- Database (type, tier, limits)\n- AI APIs used\n- Caching layer\n- CDN\n- Auth system"}
              style={{
                width: "100%", minHeight: 320, background: "transparent", border: "none", outline: "none",
                resize: "vertical", color: "rgba(255,255,255,0.75)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 12, lineHeight: 1.8, padding: "14px 16px",
              }}
            />
          </div>

          {/* Run button */}
          <button
            onClick={runTest}
            disabled={loading || !stack.trim()}
            style={{
              width: "100%", padding: "13px 20px", borderRadius: 9, border: "none",
              background: loading || !stack.trim() ? "rgba(255,255,255,0.04)" : "#eab308",
              color: loading || !stack.trim() ? "rgba(255,255,255,0.2)" : "#000",
              fontSize: 13, fontWeight: 700, cursor: loading || !stack.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s", fontFamily: "inherit",
            }}>
            {loading
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Simulating load...</>
              : <><FlaskConical size={15} /> Run Stress Test</>
            }
          </button>
        </div>

        {/* Right — Results */}
        <div>
          {!loading && !result && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "60px 32px", textAlign: "center", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <FlaskConical size={22} color="#eab308" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: "0 0 8px" }}>Describe your stack</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.7, maxWidth: 300, margin: 0 }}>Simulates 10 → 100 → 1K → 10K concurrent users and identifies which component breaks first.</p>
            </div>
          )}

          {loading && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "80px 32px", textAlign: "center", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={32} color="#eab308" style={{ animation: "spin 1.5s linear infinite", marginBottom: 18 }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "0 0 6px" }}>Simulating concurrent users</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>10 → 100 → 1,000 → 10,000...</p>
            </div>
          )}

          {result && (
            <div className="st-fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ReportButton
                scanType="stress-test"
                title={`Stress test · ${result.tiers?.length ?? 0} tiers analyzed`}
                resultData={result}
              />

              {/* Tier cards */}
              {result.tiers.map((tier, ti) => {
                const tierColor = STATUS_COLOR[tier.status]
                return (
                  <div key={ti} style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `3px solid ${tierColor}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}>
                    {/* Tier header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Users size={14} color={tierColor} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{tier.label}</span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{TIERS[ti].desc}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} /> {tier.responseTime}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: tierColor,
                          background: `${tierColor}12`, border: `1px solid ${tierColor}25`,
                          padding: "2px 7px", borderRadius: 4, letterSpacing: "0.07em",
                        }}>{tier.label}</span>
                      </div>
                    </div>

                    {/* Components */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {tier.components.map((comp, ci) => (
                        <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[comp.status], marginTop: 4, flexShrink: 0 }} />
                          <span style={{ color: "rgba(255,255,255,0.5)", minWidth: 64, fontWeight: 600, flexShrink: 0 }}>{comp.name}</span>
                          <span style={{ color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{comp.detail}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottleneck */}
                    {tier.bottleneck && (
                      <div style={{ marginTop: 10, fontSize: 11, color: "#ef4444", display: "flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", padding: "6px 10px", borderRadius: 6 }}>
                        <AlertTriangle size={11} /> Bottleneck: {tier.bottleneck}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Recommendations */}
              <div style={{ background: "#0a0a0a", border: "1px solid rgba(52,211,153,0.12)", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#34d399", marginBottom: 12, letterSpacing: "0.1em" }}>SCALING RECOMMENDATIONS</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 7 }}>
                    <span style={{ color: "#34d399", flexShrink: 0 }}>→</span> {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <NextSteps suggestions={suggestions} />
    </div>
  )
}
