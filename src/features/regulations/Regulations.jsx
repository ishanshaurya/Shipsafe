import { useState } from "react"
import { Check, ChevronRight } from "lucide-react"
import { fetchRegulations } from "./regulationsService"
import { mockRegulationResult } from "./mockRegulation"
import { severityVerdict, VERDICT_WORD } from "../../shared/verdict"
import Finding, { Detail } from "../../shared/components/Finding"
import Flag from "../../shared/components/Flag"
import Button from "../../shared/ui/Button"
import Card from "../../shared/ui/Card"
import EmptyState from "../../shared/ui/EmptyState"
import ErrorState from "../../shared/ui/ErrorState"
import Field from "../../shared/ui/Field"
import Progress from "../../shared/ui/Progress"
import { SkeletonLines } from "../../shared/ui/Skeleton"
import { useProgressStep } from "../../shared/ui/useProgressStep"

/* ═══════════════════════════════════════════════════════════
   AI REGULATIONS
   Live topic queries via Gemini → fetchRegulations()
   Fallback: mockRegulationResult (Deepfakes example), always flagged to the user.
   ═══════════════════════════════════════════════════════════ */

const TOPICS = [
  "Privacy",
  "Deepfakes",
  "Bias",
  "Surveillance",
  "CSAM",
  "Data Retention",
  "Algorithmic Accountability",
]

const TOPIC_CARDS = [
  { topic: "Privacy",                   desc: "Data collection, consent laws, GDPR, user rights" },
  { topic: "Deepfakes",                 desc: "Synthetic media, non-consensual imagery, disclosure rules" },
  { topic: "Bias",                      desc: "Algorithmic discrimination, fairness requirements, auditing" },
  { topic: "Surveillance",              desc: "Facial recognition, mass monitoring, government access" },
  { topic: "CSAM",                      desc: "Child safety online, detection obligations, platform liability" },
  { topic: "Data Retention",            desc: "Storage limits, deletion rights, cross-border transfers" },
  { topic: "Algorithmic Accountability",icon: "🤖", desc: "Automated decisions, explainability, human oversight" },
]

const FEATURED_REGULATIONS = [
  {
    name: "EU AI Act",
    country: "European Union",
    year: 2024,
    status: "Active",
    summary: "Comprehensive risk-based framework regulating AI systems across the EU. High-risk AI requires conformity assessments, transparency obligations, and human oversight before deployment.",
    source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
    sectors: ["Technology", "Healthcare", "Finance", "Public Sector"],
  },
  {
    name: "India Digital Personal Data Protection Act",
    country: "India",
    year: 2023,
    status: "Active",
    summary: "Governs processing of digital personal data in India. Requires consent for data processing, mandates data fiduciaries to implement security safeguards, and grants users rights to erasure and grievance redressal.",
    source_url: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf",
    sectors: ["Technology", "Finance", "Healthcare", "E-commerce"],
  },
  {
    name: "China Generative AI Regulations",
    country: "China",
    year: 2023,
    status: "Active",
    summary: "Regulates generative AI services in China. Providers must label AI-generated content, prevent generation of prohibited content, and register algorithms with the Cyberspace Administration of China.",
    source_url: "https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm",
    sectors: ["Technology", "Media", "Social Platforms"],
  },
]

function RegulationRow({ reg, open, toggle }) {
  const severity = reg.risk?.severity
  return (
    <Finding
      verdict={severity ? severityVerdict(severity) : undefined}
      title={reg.name}
      meta={`${reg.country}${reg.year ? `, ${reg.year}` : ""}`}
      side={reg.status ?? "Unknown"}
      open={open}
      onToggle={toggle}
    >
      <p>{reg.summary}</p>
      {reg.risk?.description && <Detail label="Real-world risk">{reg.risk.description}</Detail>}
      {reg.risk?.who_is_at_risk?.length > 0 && (
        <Detail label="Who is at risk">
          <ul style={{ paddingLeft: 20 }}>{reg.risk.who_is_at_risk.map(w => <li key={w}>{w}</li>)}</ul>
        </Detail>
      )}
      {reg.sectors?.length > 0 && <Detail label="Sectors">{reg.sectors.join(", ")}</Detail>}
      <div>
        {reg.source_url
          ? <a href={reg.source_url} target="_blank" rel="noopener noreferrer">Read the official source (opens in a new tab)</a>
          : <span className="muted">Source unverified</span>}
      </div>
    </Finding>
  )
}

function CoverageList({ title, items, muted }) {
  if (!items?.length) return null
  return (
    <div>
      <div className="detail-label">{title}</div>
      <ul style={{ paddingLeft: 20 }} className={muted ? "muted" : undefined}>
        {items.map(c => <li key={c}>{c}</li>)}
      </ul>
    </div>
  )
}

const SEARCH_STEPS = ["Connecting", "Analysing laws and drafts", "Building checklist"]

// ─── Page ─────────────────────────────────────────────────

export default function Regulations() {
  const [query, setQuery] = useState("")
  const [activeTopic, setActiveTopic] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [exp, setExp] = useState({})
  const [copied, setCopied] = useState(false)

  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))
  const step = useProgressStep(loading, SEARCH_STEPS.length)

  const runSearch = async (overrideTopic) => {
    const q = (overrideTopic ?? query).trim()
    if (!q || loading) return
    setLoading(true)
    setError(false)
    setResults(null)
    setExp({})
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

  const copyChecklist = () => {
    navigator.clipboard.writeText(checklist.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const coverage = results?.country_coverage

  return (
    <div>
      <header className="page-head">
        <h1>Regulations</h1>
        <p>Search AI laws by topic. You get who is at risk and a checklist you can act on.</p>
      </header>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16, maxWidth: 720 }} role="search">
        <Field
          id="reg-q" label="Search regulations" value={query}
          onChange={e => { setQuery(e.target.value); setActiveTopic(null) }}
          placeholder="For example: facial recognition, healthcare AI, GDPR"
          action={<Button type="submit" loading={loading} disabled={!query.trim()}>Search</Button>}
        />
      </form>

      <div className="inline" role="group" aria-label="Example topics" style={{ marginBottom: 48 }}>
        {TOPICS.map(t => (
          <button key={t} type="button" className="chip" aria-pressed={activeTopic === t} onClick={() => handleChip(t)}>
            {activeTopic === t && <Check size={14} aria-hidden="true" />}{t}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {loading && (
          <Card as="section" pad className="stack" style={{ marginBottom: 48 }}>
            <div className="h3">Searching regulations</div>
            <Progress steps={SEARCH_STEPS} current={step} />
            <SkeletonLines label="Checking enacted laws, drafts and country coverage" />
          </Card>
        )}

        {!loading && error && results && (
          <div style={{ marginBottom: 24 }}>
            <ErrorState title="Showing sample data because the live lookup failed" onRetry={() => runSearch(query)}>
              These results are for Deepfakes, not your search.
            </ErrorState>
          </div>
        )}

        {!loading && results && (
          <div className="stack" style={{ gap: 48, marginBottom: 48 }}>
            <section>
              <h2 className="h2" style={{ marginBottom: 8 }}>Regulations for {results.topic || query}</h2>
              {results.regulations.length === 0 ? (
                <EmptyState title="No regulations found">Try a broader topic, or pick one of the example topics above.</EmptyState>
              ) : (
                <ul className="ledger">
                  {results.regulations.map((reg, i) => (
                    <RegulationRow key={i} reg={reg} open={!!exp[`r${i}`]} toggle={() => toggle(`r${i}`)} />
                  ))}
                </ul>
              )}
            </section>

            {results.overall_severity && (
              <section className="inline" style={{ gap: 16 }}>
                <Flag verdict={severityVerdict(results.overall_severity)} size={48} />
                <div>
                  <h2 className="h3">Overall severity: {results.overall_severity}</h2>
                  <p className="small muted">Reads as {VERDICT_WORD[severityVerdict(results.overall_severity)]} for the regulations above.</p>
                </div>
              </section>
            )}

            {coverage && (
              <section>
                <h2 className="h2" style={{ marginBottom: 4 }}>Country coverage</h2>
                <p className="small muted" style={{ marginBottom: 16 }}>Indicative, estimated by the AI model.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
                  <CoverageList title="Regulated" items={coverage.regulated} />
                  <CoverageList title="Draft or proposed" items={coverage.draft} />
                  <CoverageList title="Unregulated" items={coverage.unregulated} muted />
                </div>
              </section>
            )}

            {checklist.length > 0 && (
              <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                  <h2 className="h2">Developer checklist</h2>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={copyChecklist}>{copied ? "Copied" : "Copy checklist"}</button>
                </div>
                <ul className="ledger">
                  {checklist.map((item, i) => (
                    <li key={i}><div className="row-static" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>{item}</div></li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {results === null && !loading && (
          <section style={{ marginBottom: 48 }}>
            <h2 className="h2" style={{ marginBottom: 8 }}>Browse by topic</h2>
            <ul className="ledger">
              {TOPIC_CARDS.map(({ topic, desc }) => (
                <li key={topic}>
                  <button type="button" className="row-btn" style={{ gridTemplateColumns: "minmax(0, 1fr) 20px" }} onClick={() => handleChip(topic)}>
                    <span>
                      <span className="row-title">{topic}</span>
                      <span className="row-meta" style={{ display: "block" }}>{desc}</span>
                    </span>
                    <ChevronRight size={16} className="muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="h2" style={{ marginBottom: 8 }}>Featured regulations</h2>
        <ul className="ledger">
          {FEATURED_REGULATIONS.map((reg, i) => (
            <RegulationRow key={i} reg={reg} open={!!exp[`f${i}`]} toggle={() => toggle(`f${i}`)} />
          ))}
        </ul>
      </section>
    </div>
  )
}
