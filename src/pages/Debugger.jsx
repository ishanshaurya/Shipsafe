import { useState } from "react"
import { Loader2 } from "lucide-react"
import { runScan, findSimilarScans } from "../services/scanRun"
import { importRepo, listRepoFiles, fetchRepoFiles } from "../services/githubImport"
import { useAuth } from "../hooks/useAuth"
import ReportButton from "../components/ReportButton"
import NextSteps from "../components/NextSteps"
import RepoImport from "../components/RepoImport"
import CodePanel, { FixPanel, CodeSnippet } from "../components/CodePanel"
import Finding, { Detail } from "../components/Finding"
import VerdictBanner from "../components/VerdictBanner"
import Notice from "../components/Notice"
import { scoreVerdict, severityVerdict } from "../utils/verdict"

const LANGS = ["JavaScript","TypeScript","Python","Java","Go","Rust","C++","PHP","Ruby","SQL"]

function mapLanguage(ghLang) {
  if (!ghLang) return "JavaScript"
  const exact = LANGS.find(l => l.toLowerCase() === ghLang.toLowerCase())
  if (exact) return exact
  const map = { "Kotlin": "Java", "Scala": "Java", "Swift": "JavaScript", "C": "C++", "C#": "JavaScript", "Shell": "JavaScript" }
  return map[ghLang] || "JavaScript"
}
const CATEGORY_LABEL = { security: "Security", bug: "Bug", vibecode: "Vibe-code", style: "Style", credential: "Credential" }
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1)

const SAMPLE = `const express = require('express');
const mysql = require('mysql');
const db = mysql.createConnection({ host:'localhost', user:'root', password:'admin123', database:'myapp' });

app.get('/api/user', (req, res) => {
  const userId = req.query.id;
  db.query("SELECT * FROM users WHERE id = '" + userId + "'", (err, results) => {
    res.json(results);
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM users WHERE username='" + username + "'", (err, result) => {
    if (result.length > 0) {
      const token = "sk-secret-api-key-12345";
      res.json({ token, user: result[0] });
    }
  });
});`

function IssueRow({ issue, open, toggle }) {
  const category = CATEGORY_LABEL[issue.category] || "Bug"
  return (
    <Finding
      verdict={severityVerdict(issue.severity)}
      title={issue.title}
      meta={issue.line ? `${category}, line ${issue.line}` : category}
      side={cap(issue.severity || "medium")}
      open={open}
      onToggle={toggle}
    >
      <p>{issue.description}</p>
      {issue.codeSnippet && <Detail label="Code"><CodeSnippet text={issue.codeSnippet} /></Detail>}
      {issue.fix && <FixPanel text={issue.fix} />}
    </Finding>
  )
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

const SCAN_NAME = { debugger: "AI Debugger", audit: "Vibe-Code Audit", loopholes: "Loophole Finder" }

export default function Debugger() {
  const { user } = useAuth()
  const [code, setCode] = useState("")
  const [lang, setLang] = useState("JavaScript")
  const [ctx, setCtx] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState(null)
  const [exp, setExp] = useState({})
  const [githubUrl, setGithubUrl] = useState("")
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubInfo, setGithubInfo] = useState(null)
  const [githubError, setGithubError] = useState(null)
  const [similarScans, setSimilarScans] = useState([])
  const [streamingText, setStreamingText] = useState("")
  // File picker state
  const [fileList, setFileList] = useState(null)     // null = not fetched, [] = fetched
  const [selectedFiles, setSelectedFiles] = useState([]) // paths of checked files
  const [filePickRepo, setFilePickRepo] = useState(null) // repo info from list call
  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))
  const lc = code.split("\n").length

  // Quick scan: old one-step flow (auto-select + fetch content + populate code)
  const fetchFromGitHub = async () => {
    if (!githubUrl.trim() || githubLoading) return
    setGithubLoading(true); setGithubError(null); setGithubInfo(null); setFileList(null)
    const { data, error: importError } = await importRepo(githubUrl)
    setGithubLoading(false)
    if (importError) { setGithubError(importError); return }
    setCode(data.code)
    setLang(mapLanguage(data.repo.language))
    setCtx(`${data.repo.name}${data.repo.description ? " - " + data.repo.description : ""}`)
    setGithubInfo(data)
    setResult(null); setError(null); setExp({})
  }

  // Step 1: Fetch file tree only (list mode)
  const fetchFileList = async () => {
    if (!githubUrl.trim() || githubLoading) return
    setGithubLoading(true); setGithubError(null); setGithubInfo(null); setFileList(null)
    const { data, error: listError } = await listRepoFiles(githubUrl)
    setGithubLoading(false)
    if (listError) { setGithubError(listError); return }
    setFileList(data.files)
    setFilePickRepo(data.repo)
    // Pre-check auto-selected files
    setSelectedFiles(data.files.filter(f => f.autoSelected).map(f => f.path))
  }

  // Step 3: Fetch only selected files and populate code editor
  const fetchSelectedFiles = async () => {
    if (!selectedFiles.length || githubLoading) return
    setGithubLoading(true); setGithubError(null)
    const { data, error: fetchError } = await fetchRepoFiles(githubUrl, selectedFiles)
    setGithubLoading(false)
    if (fetchError) { setGithubError(fetchError); return }
    setCode(data.code)
    setLang(mapLanguage(filePickRepo?.language))
    setCtx(`${filePickRepo?.name}${filePickRepo?.description ? " - " + filePickRepo.description : ""}`)
    setGithubInfo(data)
    setFileList(null)
    setResult(null); setError(null); setExp({})
  }

  const handleScan = async () => {
    if (!code.trim()||loading) return
    setLoading(true); setResult(null); setError(null); setExp({}); setSuggestions([]); setSimilarScans([]); setStreamingText("")
    try {
      const { result: parsed, suggestions: nextSteps, error: aiError } = await runScan({
        tool: "debugger",
        payload: { code, language: lang, context: ctx },
        user,
        stream: true,
        onChunk: setStreamingText,
      })
      setStreamingText("")
      if (aiError) { setError(aiError); return }
      setResult(parsed)
      setSuggestions(nextSteps)

      // Similar past scans load in the background, never blocking the result
      if (user) findSimilarScans("debugger", parsed).then((similar) => { if (similar.length) setSimilarScans(similar) })

      const ae={}
      parsed.issues.forEach(i=>{ if(i.severity==="critical"||i.severity==="high") ae[i.id]=true })
      setExp(ae)
    } finally { setLoading(false) }
  }


  const sorted = result ? [...result.issues].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)) : []
  const allOpen = result ? result.issues.every(i => exp[i.id]) : false
  const counts = result
    ? ["critical", "high", "medium", "low"].filter(k => result.stats?.[k]).map(k => `${result.stats[k]} ${k}`).join(", ")
    : ""

  return (
    <div>
      <header className="page-head">
        <h1>AI Debugger</h1>
        <p>Find bugs, security holes, credential leaks and vibe-code smells in pasted code or a GitHub repo.</p>
      </header>

      <div className="tool-grid">

        {/* Input */}
        <div className="stack" style={{ gap: 20 }}>
          <RepoImport
            url={githubUrl}
            onUrl={(v) => { setGithubUrl(v); setGithubError(null); setFileList(null) }}
            onChoose={fetchFileList}
            onQuick={fetchFromGitHub}
            quickLabel="Import recommended files without choosing"
            scanLabel="Import selected files"
            loading={githubLoading}
            fileList={fileList}
            selected={selectedFiles}
            onSelected={setSelectedFiles}
            repo={filePickRepo}
            onScan={fetchSelectedFiles}
            onCancel={() => setFileList(null)}
            error={githubError}
            onDismissError={() => setGithubError(null)}
            info={githubInfo}
          />

          <div className="field-row" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: "0 0 150px" }}>
              <label className="label" htmlFor="dbg-lang">Language</label>
              <select id="dbg-lang" className="field" value={lang} onChange={e => setLang(e.target.value)}>
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label className="label" htmlFor="dbg-ctx">Context (optional)</label>
              <input id="dbg-ctx" className="field" placeholder="What this code does" value={ctx} onChange={e => setCtx(e.target.value)} />
            </div>
          </div>

          <CodePanel
            label="Code"
            value={code}
            onChange={setCode}
            placeholder="Paste your code here"
            lineNumbers
            copy
            right={<span>{lang}</span>}
          />

          <div className="stack" style={{ gap: 12 }}>
            <button type="button" className="btn btn-primary btn-block" onClick={handleScan} disabled={loading || !code.trim()}>
              {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
              Run review
            </button>
            {error && <Notice tone="error" title="Review failed" onDismiss={() => setError(null)}>{error} Your code is still here. Run the review again.</Notice>}
          </div>
        </div>

        {/* Result */}
        <div aria-live="polite" aria-busy={loading}>
          {!loading && !result && !error && (
            <div className="panel empty">
              <h2 className="h2">Paste code to review</h2>
              <p>You get a verdict and a list of findings, worst first. Each finding comes with a fix.</p>
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => { setCode(SAMPLE); setLang("JavaScript"); setCtx("Express.js REST API"); setResult(null); setError(null) }}>
                  Load sample code
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="panel panel-pad stack">
              <div className="h3">Reviewing {lc} lines of {lang}</div>
              {streamingText ? (
                <div className="codepanel codepanel-ro" style={{ maxHeight: 220 }}>
                  <pre>{streamingText.slice(-400)}</pre>
                </div>
              ) : (
                <>
                  <p className="muted">Connecting to the AI model</p>
                  <div className="skel" style={{ width: "100%" }} />
                  <div className="skel" style={{ width: "85%" }} />
                  <div className="skel" style={{ width: "70%" }} />
                </>
              )}
            </div>
          )}

          {result && (
            <div className="stack" style={{ gap: 24 }}>
              <VerdictBanner verdict={scoreVerdict(result.healthScore)} score={result.healthScore}>
                <p>{result.summary}</p>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {result.stats?.totalIssues ?? result.issues.length} {(result.stats?.totalIssues ?? result.issues.length) === 1 ? "issue" : "issues"}{counts && `: ${counts}`}
                </p>
              </VerdictBanner>

              {result.positives?.length > 0 && (
                <section>
                  <h2 className="h3" style={{ marginBottom: 8 }}>What's working</h2>
                  <ul style={{ paddingLeft: 20 }}>
                    {result.positives.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </section>
              )}

              <ReportButton
                scanType="debugger"
                title={`Debugger scan: ${lang}, ${result.stats?.totalIssues ?? 0} issues`}
                resultData={result}
              />

              <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h2 className="h2">Findings</h2>
                  <button type="button" className="link-btn" onClick={() => setExp(allOpen ? {} : Object.fromEntries(result.issues.map(i => [i.id, true])))}>
                    {allOpen ? "Collapse all" : "Expand all"}
                  </button>
                </div>
                <ul className="ledger">
                  {sorted.map(issue => (
                    <IssueRow key={issue.id} issue={issue} open={!!exp[issue.id]} toggle={() => toggle(issue.id)} />
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>

      <NextSteps suggestions={suggestions} />

      {similarScans.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 className="h2" style={{ marginBottom: 16 }}>Similar to earlier scans</h2>
          <ul className="ledger">
            {similarScans.map(scan => {
              const simPct = Math.round(scan.similarity * 100)
              const match = simPct > 90 ? "Very similar" : simPct > 70 ? "Similar" : "Related"
              return (
                <li key={scan.id}>
                  <div className="row-static" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                    <div>
                      <div className="row-title">{SCAN_NAME[scan.scan_type] || scan.scan_type}</div>
                      <div className="row-meta code-inline" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scan.input_snippet || "No snippet saved"}</div>
                      <div className="row-meta">{scan.score != null && `Score ${scan.score}, `}{timeAgo(scan.created_at)}</div>
                    </div>
                    <span className="row-side">{match}, {simPct}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
