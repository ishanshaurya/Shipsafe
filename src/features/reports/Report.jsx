import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { getReportBySlug } from "./reportService"
import { scoreVerdict, severityVerdict, VERDICT_WORD } from "../../shared/verdict"
import Flag from "../../shared/components/Flag"
import Logo from "../../shared/components/Logo"
import { CodeSnippet, FixPanel } from "../../shared/components/CodePanel"
import { Detail } from "../../shared/components/Finding"
import Button from "../../shared/ui/Button"
import ErrorState from "../../shared/ui/ErrorState"
import { Skeleton } from "../../shared/ui/Skeleton"

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
}

const AUDIT_CATEGORIES = {
  security: "Security",
  quality: "Code quality",
  maintainability: "Maintainability",
  aiPatterns: "AI patterns",
  deployReady: "Deploy readiness",
}

const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : "")

// Score key and direction differ per tool; older reports stored a plain `score`.
function reportScore(scanType, data) {
  const key = { debugger: "healthScore", audit: "overallScore", loopholes: "riskScore" }[scanType]
  return data?.[key] ?? data?.score ?? null
}

// A ledger row that is always open: public readers see everything at once.
function ReadRow({ verdict, title, meta, side, children }) {
  return (
    <li>
      <div className="row-static" style={{ paddingBottom: children ? 8 : 16 }}>
        {verdict ? <Flag verdict={verdict} size={24} labelled /> : <span />}
        <div>
          <div className="row-title">{title}</div>
          {meta && <div className="row-meta">{meta}</div>}
        </div>
        <span className="row-side">{side}</span>
      </div>
      {children && <div className="row-detail" style={{ paddingLeft: 40 }}>{children}</div>}
    </li>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 className="h2" style={{ marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  )
}

// Renders result_data differently per scan type
function ResultBody({ scanType, data }) {
  if (!data) return null

  if (scanType === "debugger") {
    return (
      <>
        {data.summary && <p>{data.summary}</p>}
        {data.issues?.length > 0 && (
          <Section title="Findings">
            <ul className="ledger">
              {data.issues.map((issue, i) => (
                <ReadRow key={i} verdict={severityVerdict(issue.severity)} title={issue.title} meta={issue.line ? `Line ${issue.line}` : undefined} side={cap(issue.severity)}>
                  <p>{issue.description}</p>
                  {issue.codeSnippet && <CodeSnippet text={issue.codeSnippet} />}
                  {issue.fix && <FixPanel text={issue.fix} />}
                </ReadRow>
              ))}
            </ul>
          </Section>
        )}
        {data.positives?.length > 0 && (
          <Section title="What's working">
            <ul style={{ paddingLeft: 20 }}>{data.positives.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </Section>
        )}
      </>
    )
  }

  if (scanType === "audit") {
    return (
      <>
        {data.summary && <p>{data.summary}</p>}
        {data.scores && (
          <Section title="Scores by category">
            <ul className="ledger">
              {Object.entries(data.scores).map(([cat, score]) => (
                <ReadRow key={cat} verdict={scoreVerdict(score)} title={AUDIT_CATEGORIES[cat] || cat} side={<span className="display" style={{ fontSize: 28, color: "var(--color-ink)" }}>{score}</span>} />
              ))}
            </ul>
          </Section>
        )}
        {data.issues?.length > 0 && (
          <Section title="Findings">
            <ul className="ledger">
              {data.issues.map((issue, i) => (
                <ReadRow key={i} verdict={severityVerdict(issue.severity)} title={issue.title} meta={AUDIT_CATEGORIES[issue.category]} side={cap(issue.severity)}>
                  <p>{issue.detail ?? issue.description}</p>
                  {issue.fix && <FixPanel text={issue.fix} />}
                </ReadRow>
              ))}
            </ul>
          </Section>
        )}
      </>
    )
  }

  if (scanType === "loopholes") {
    return (
      <>
        {data.summary && <p>{data.summary}</p>}
        {data.greyAreas?.length > 0 && (
          <Section title="Grey areas">
            <ul className="ledger">
              {data.greyAreas.map((area, i) => (
                <ReadRow key={i} verdict={severityVerdict(area.risk)} title={area.title} meta={[area.country, area.regulation].filter(Boolean).join(", ")} side={`${cap(area.risk)} risk`}>
                  <p>{area.description}</p>
                  {area.exploitation && <Detail label="How it can be exploited">{area.exploitation}</Detail>}
                  {area.recommendation && <Detail label="What to do">{area.recommendation}</Detail>}
                </ReadRow>
              ))}
            </ul>
          </Section>
        )}
        {data.defenses?.length > 0 && (
          <Section title="Defenses to put in place">
            <ul style={{ paddingLeft: 20 }} className="stack">{data.defenses.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </Section>
        )}
      </>
    )
  }

  // Reports from tools that no longer exist
  return <CodeSnippet text={JSON.stringify(data, null, 2)} />
}

function ReportShell({ children }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--color-rule)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--color-ink)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }}>
            <Logo size={28} tone="light" />
            ShipSafe
          </Link>
          <Button to="/dashboard" size="sm">Run your own scan</Button>
        </div>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px 96px" }}>
        {children}
      </main>
    </div>
  )
}

export default function Report() {
  const { slug } = useParams()
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState("loading")   // loading | ready | notfound | error
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!slug) return
    getReportBySlug(slug).then(({ data, error }) => {
      if (data) { setReport(data); setStatus("ready"); return }
      // PGRST116 = no row matched. Anything else (network, server) is worth a retry.
      setStatus(!error || error.code === "PGRST116" ? "notfound" : "error")
    })
  }, [slug, attempt])

  const retry = () => { setStatus("loading"); setAttempt((n) => n + 1) }

  if (status === "loading") return (
    <ReportShell>
      <div className="stack" role="status">
        <Skeleton width="60%" height={40} />
        <Skeleton width="30%" />
        <Skeleton width="100%" />
        <Skeleton width="85%" />
        <span className="sr-only">Loading report</span>
      </div>
    </ReportShell>
  )

  if (status === "error") return (
    <ReportShell>
      <ErrorState title="Couldn't load this report" onRetry={retry}>
        The report may exist, but the request failed. Check your connection and try again.
      </ErrorState>
    </ReportShell>
  )

  if (status === "notfound") return (
    <ReportShell>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 16 }}>Report not found</h1>
      <p className="muted">This report doesn't exist or is no longer shared. <Link to="/">Go to ShipSafe</Link>.</p>
    </ReportShell>
  )

  const score = reportScore(report.scan_type, report.result_data)
  const verdict = score === null ? null : scoreVerdict(score, { risk: report.scan_type === "loopholes" })

  return (
    <ReportShell>
      <h1 className="display" style={{ fontSize: 40, marginBottom: 16, overflowWrap: "anywhere" }}>{report.title}</h1>
      <div className="inline" style={{ gap: 16, marginBottom: 32 }}>
        {verdict && (
          <span className="inline" style={{ gap: 12 }}>
            <Flag verdict={verdict} size={48} />
            <span className="banner-score">{score}</span>
            <span className={`banner-word ${verdict}`}>{VERDICT_WORD[verdict]}</span>
          </span>
        )}
        <span className="small muted">{SCAN_LABELS[report.scan_type] || report.scan_type}, generated {timeAgo(report.created_at)}</span>
      </div>

      <ResultBody scanType={report.scan_type} data={report.result_data} />

      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--color-rule)" }} className="small muted">
        Generated by ShipSafe. <Link to="/">Run your own scan</Link>.
      </footer>
    </ReportShell>
  )
}
