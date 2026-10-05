import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { getScanHistory } from "../scan/scanHistory"
import { useAuth } from "../auth/useAuth"
import { MOCK_SCANS } from "./mockScans"
import { computeShipReadiness } from "./shipReadiness"
import { scanVerdict, scoreVerdict, VERDICT_WORD } from "../../shared/verdict"
import { TOOL_GROUPS } from "../../shared/toolRegistry"
import Flag from "../../shared/components/Flag"
import Notice from "../../shared/ui/Notice"

/* ═══════════════════════════════════════════════════════════
   DASHBOARD — ship-readiness, per-tool scores, recent scans.
   Fetches real scan history from Supabase; falls back to
   MOCK_SCANS only while no history has loaded.
   ═══════════════════════════════════════════════════════════ */

const SCAN_NAME = { debugger: "AI Debugger", audit: "Vibe-Code Audit", loopholes: "Loophole Finder" }
const TOOL_PATH = { debugger: "/debugger", audit: "/audit", loopholes: "/loopholes" }

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function issueCount(result, scanType) {
  if (!result) return 0
  if (scanType === "debugger") return result.stats?.totalIssues ?? 0
  if (scanType === "audit") return result.issues?.length ?? 0
  if (scanType === "loopholes") return result.greyAreas?.length ?? 0
  return 0
}

function mapDbScan(row) {
  return {
    id: row.id,
    type: row.scan_type,
    title: row.input_snippet?.slice(0, 40).replace(/\n/g, " ").trim() || row.scan_type,
    score: row.score,
    issues: issueCount(row.result, row.scan_type),
    time: timeAgo(row.created_at),
  }
}

function joinNames(names) {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [scans, setScans] = useState(null)   // null = not yet loaded
  const [rawScans, setRawScans] = useState(null)  // unprocessed Supabase rows
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    if (!user) { setScans(null); setRawScans(null); return }
    setLoading(true)
    setFetchError(null)

    const fetchScans = async () => {
      try {
        const { data, error } = await getScanHistory(user.id)
        if (error) {
          setFetchError("Couldn't load your scan history. Reload to try again.")
          setScans([])
          setRawScans([])
        } else {
          setRawScans(data)
          setScans(data.map(mapDbScan))
        }
      } catch (err) {
        console.error("Supabase fetch error:", err)
        setFetchError("Couldn't reach the database. Reload to try again.")
        setScans([])
        setRawScans([])
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [user])

  const displayScans = scans ?? MOCK_SCANS
  const readiness = computeShipReadiness(rawScans ?? MOCK_SCANS)
  const scoredTypes = Object.keys(readiness.breakdown)

  return (
    <div>
      <header className="page-head">
        <h1>Dashboard</h1>
        <p>{user ? `Signed in as ${user.email}` : "Your ShipSafe overview."}</p>
      </header>

      {fetchError && <div style={{ marginBottom: 24 }}><Notice tone="error" title="Dashboard unavailable">{fetchError}</Notice></div>}

      {/* Ship readiness */}
      <section className="panel" aria-labelledby="readiness-heading" style={{ marginBottom: 48 }}>
        <div className="panel-head">
          <h2 id="readiness-heading" className="h3">Ship readiness</h2>
        </div>

        {loading ? (
          <div className="panel-pad stack" role="status">
            <div className="skel" style={{ width: 180, height: 48 }} />
            <div className="skel" style={{ width: "60%" }} />
            <span className="sr-only">Loading</span>
          </div>
        ) : readiness.score === null ? (
          <div className="panel-pad">
            <p style={{ marginBottom: 16 }}>No scans yet. Run the AI Debugger on a file to get your first score.</p>
            <Link to="/debugger" className="btn btn-primary">Run AI Debugger</Link>
          </div>
        ) : (
          <div>
            <div className="panel-pad" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <Flag verdict={scoreVerdict(readiness.score)} size={48} />
              <span className="banner-score">{readiness.score}</span>
              <span className={`banner-word ${scoreVerdict(readiness.score)}`}>{VERDICT_WORD[scoreVerdict(readiness.score)]}</span>
              <p className="muted" style={{ flexBasis: "100%", maxWidth: "60ch" }}>
                Based on your latest {joinNames(scoredTypes.map((t) => SCAN_NAME[t]))} {scoredTypes.length === 1 ? "scan" : "scans"}.
              </p>
            </div>
            <ul className="ledger" style={{ borderTop: "1px solid var(--color-rule)" }}>
              {["debugger", "audit", "loopholes"].map((type) => {
                const info = readiness.breakdown[type]
                return (
                  <li key={type}>
                    <div className="row-static" style={{ padding: "16px 24px", gridTemplateColumns: info ? "24px minmax(0, 1fr) auto auto" : "minmax(0, 1fr) auto" }}>
                      {info && <Flag verdict={scoreVerdict(info.adjusted)} size={24} labelled />}
                      <div>
                        <div className="row-title">{SCAN_NAME[type]}</div>
                        {info && <div className="row-meta">{VERDICT_WORD[scoreVerdict(info.adjusted)]}{info.scanDate && `, ${timeAgo(info.scanDate)}`}</div>}
                        {!info && <div className="row-meta">Not scanned yet</div>}
                      </div>
                      {info && <span className="display" style={{ fontSize: 28 }}>{info.adjusted}</span>}
                      {!info && <Link to={TOOL_PATH[type]} className="btn btn-secondary btn-sm">Run</Link>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Recent scans */}
      <section style={{ marginBottom: 48 }} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="h2" style={{ marginBottom: 16 }}>Recent scans</h2>

        {loading && (
          <div className="stack" role="status">
            <div className="skel" style={{ width: "100%", height: 24 }} />
            <div className="skel" style={{ width: "100%", height: 24 }} />
            <div className="skel" style={{ width: "100%", height: 24 }} />
            <span className="sr-only">Loading</span>
          </div>
        )}

        {!loading && displayScans.length === 0 && (
          <p className="muted">No scans yet. Run a tool below to get started.</p>
        )}

        {!loading && displayScans.length > 0 && (
          <ul className="ledger">
            {displayScans.map((scan) => (
              <li key={scan.id}>
                <div className="row-static" style={{ gridTemplateColumns: scan.score !== null ? "24px minmax(0, 1fr) auto" : "minmax(0, 1fr) auto" }}>
                  {scan.score !== null && <Flag verdict={scanVerdict(scan.type, scan.score)} size={24} labelled />}
                  <div>
                    <div className="row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scan.title}</div>
                    <div className="row-meta">{SCAN_NAME[scan.type] || scan.type}, {scan.issues} {scan.issues === 1 ? "issue" : "issues"}</div>
                  </div>
                  <span className="row-side">{scan.time}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Run a tool */}
      <section aria-labelledby="run-heading">
        <h2 id="run-heading" className="h2" style={{ marginBottom: 16 }}>Run a tool</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
          {TOOL_GROUPS.map(({ group, tools }) => (
            <div key={group}>
              <div className="small muted" style={{ marginBottom: 8 }}>{group}</div>
              <ul className="ledger">
                {tools.map((t) => (
                  <li key={t.id}>
                    <Link to={t.path} className="row-btn" style={{ gridTemplateColumns: "minmax(0, 1fr) 20px", textDecoration: "none", color: "inherit" }}>
                      <span className="row-title">{t.name}</span>
                      <ChevronRight size={16} className="muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
