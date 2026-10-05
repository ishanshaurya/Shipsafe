import { useState } from "react"
import { Check } from "lucide-react"
import { runScan } from "../scan/scanRun"
import { useAuth } from "../auth/useAuth"
import ReportButton from "../reports/ReportButton"
import NextSteps from "../scan/NextSteps"
import Finding, { Detail } from "../../shared/components/Finding"
import VerdictBanner from "../../shared/components/VerdictBanner"
import Button from "../../shared/ui/Button"
import Card from "../../shared/ui/Card"
import EmptyState from "../../shared/ui/EmptyState"
import ErrorState from "../../shared/ui/ErrorState"
import Field from "../../shared/ui/Field"
import Progress from "../../shared/ui/Progress"
import { SkeletonLines } from "../../shared/ui/Skeleton"
import { useProgressStep } from "../../shared/ui/useProgressStep"
import { scoreVerdict, severityVerdict } from "../../shared/verdict"

/* ═══════════════════════════════════════════════════════════
   LOOPHOLE FINDER — ShipSafe's #2 Feature

   How it works:
   1. Developer describes their AI system
   2. Selects target deployment countries
   3. AI returns grey areas, exploitation risks, defensive
      recommendations, and upcoming regulatory changes
   ═══════════════════════════════════════════════════════════ */

const LOOPHOLE_STEPS = ["Checking jurisdictions", "Finding grey areas", "Ranking risk"]

const COUNTRIES = [
  { id: "eu", name: "European Union" },
  { id: "us", name: "United States" },
  { id: "in", name: "India" },
  { id: "cn", name: "China" },
  { id: "uk", name: "United Kingdom" },
  { id: "ca", name: "Canada" },
  { id: "br", name: "Brazil" },
  { id: "au", name: "Australia" },
  { id: "jp", name: "Japan" },
  { id: "kr", name: "South Korea" },
  { id: "sg", name: "Singapore" },
]

const SAMPLE_DESCRIPTIONS = [
  { label: "Facial Recognition Attendance", text: "An AI-powered facial recognition system for school/office attendance tracking. Uses camera feeds to identify individuals and mark attendance automatically. Stores facial biometric data in a cloud database." },
  { label: "AI Content Moderator", text: "An automated content moderation system that uses LLMs to detect and remove harmful content on a social media platform. Makes autonomous decisions to remove posts without human review." },
  { label: "AI Hiring Screener", text: "An AI system that screens job applications, ranks candidates, and automatically rejects applicants below a certain score threshold. Uses resume parsing and NLP to evaluate qualifications." },
]

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1)

function GreyAreaRow({ area, open, toggle }) {
  return (
    <Finding
      verdict={severityVerdict(area.risk)}
      title={area.title}
      meta={`${area.country}, ${area.regulation}`}
      side={`${cap(area.risk)} risk`}
      open={open}
      onToggle={toggle}
    >
      <p>{area.description}</p>
      <Detail label="How it can be exploited">{area.exploitation}</Detail>
      <Detail label="What to do">{area.recommendation}</Detail>
    </Finding>
  )
}

export default function Loopholes() {
  const { user } = useAuth()
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

    const { result: analysis, suggestions: nextSteps, error: aiError } = await runScan({
      tool: "loopholes",
      payload: { systemDescription: description, countries: selected },
      user,
    })
    if (aiError) { setError(aiError); setLoading(false); return }

    setResult(analysis)
    setSuggestions(nextSteps)
    const ae = {}
    analysis.greyAreas.forEach((g) => { if (g.risk === "high") ae[g.id] = true })
    setExp(ae)
    setLoading(false)
  }

  const step = useProgressStep(loading, LOOPHOLE_STEPS.length)
  const disabled = loading || !description.trim() || selected.length === 0

  return (
    <div>
      <header className="page-head">
        <h1>Loophole Finder</h1>
        <p>Describe your AI system and pick the countries you deploy in. You get the legal grey areas that apply and what to do about them.</p>
      </header>

      <div className="tool-grid">

        {/* Input */}
        <div className="stack" style={{ gap: 20 }}>
          <div>
            <Field
              as="textarea" id="lh-desc" label="Describe your AI system" rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="For example: a facial recognition system for school attendance that stores biometric data in the cloud and makes automated decisions about student presence"
            />
            <div className="inline" style={{ marginTop: 8 }}>
              <span className="small muted">Start from an example:</span>
              {SAMPLE_DESCRIPTIONS.map((s, i) => (
                <button key={i} type="button" className="link-btn" onClick={() => { setDescription(s.text); setResult(null) }}>{s.label}</button>
              ))}
            </div>
          </div>

          <fieldset style={{ border: 0 }}>
            <legend className="label">
              Countries you deploy in{selected.length > 0 && ` (${selected.length} selected)`}
            </legend>
            <div className="inline">
              {COUNTRIES.map((c) => {
                const active = selected.includes(c.id)
                return (
                  <button key={c.id} type="button" className="chip" aria-pressed={active} onClick={() => toggleCountry(c.id)}>
                    {active && <Check size={14} aria-hidden="true" />}{c.name}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="stack" style={{ gap: 12 }}>
            <Button block onClick={runAnalysis} loading={loading} disabled={disabled}>Find loopholes</Button>
            {error && (
              <ErrorState title="Analysis failed" onRetry={runAnalysis} onDismiss={() => setError(null)}>
                {error} Your description is still here.
              </ErrorState>
            )}
          </div>
        </div>

        {/* Result */}
        <div aria-live="polite">
          {!loading && !result && (
            <EmptyState title="Describe your AI system">
              Pick at least one country. You get grey areas ranked by risk, how each could be exploited, and the defenses to put in place.
            </EmptyState>
          )}

          {loading && (
            <Card pad className="stack">
              <div className="h3">Checking {selected.length} {selected.length === 1 ? "jurisdiction" : "jurisdictions"}</div>
              <Progress steps={LOOPHOLE_STEPS} current={step} />
              <SkeletonLines label="Looking for ambiguous rules that apply to your system" />
            </Card>
          )}

          {result && (
            <div className="stack" style={{ gap: 24 }}>
              <VerdictBanner verdict={scoreVerdict(result.riskScore, { risk: true })} score={result.riskScore}>
                <p>{result.summary}</p>
                <p className="small muted" style={{ marginTop: 8 }}>Regulatory risk score. Higher means more legal exposure.</p>
              </VerdictBanner>

              <ReportButton
                scanType="loopholes"
                title={`Loophole scan: ${result.greyAreas?.length ?? 0} grey areas found`}
                resultData={result}
              />

              <section>
                <h2 className="h2" style={{ marginBottom: 8 }}>Grey areas</h2>
                <ul className="ledger">
                  {result.greyAreas.map((area) => (
                    <GreyAreaRow key={area.id} area={area} open={!!exp[area.id]} toggle={() => toggle(area.id)} />
                  ))}
                </ul>
              </section>

              {result.defenses.length > 0 && (
                <section>
                  <h2 className="h2" style={{ marginBottom: 12 }}>Defenses to put in place</h2>
                  <ul style={{ paddingLeft: 20 }} className="stack">
                    {result.defenses.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </section>
              )}

              {result.upcoming.length > 0 && (
                <section>
                  <h2 className="h2" style={{ marginBottom: 8 }}>Upcoming changes</h2>
                  <ul className="ledger">
                    {result.upcoming.map((u, i) => (
                      <li key={i}>
                        <div className="row-static" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                          <div>
                            <div className="row-title">{u.regulation}</div>
                            <div className="row-meta">{u.impact}</div>
                          </div>
                          <span className="row-side">{u.status}, {u.expected}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <NextSteps suggestions={suggestions} />
    </div>
  )
}
