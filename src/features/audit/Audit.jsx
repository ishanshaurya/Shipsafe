import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { runScan } from "../scan/scanRun"
import { useAuth } from "../auth/useAuth"
import { useRepoImport } from "../github-import/useRepoImport"
import ReportButton from "../reports/ReportButton"
import NextSteps from "../scan/NextSteps"
import RepoImport from "../github-import/RepoImport"
import CodePanel, { FixPanel } from "../../shared/components/CodePanel"
import Finding from "../../shared/components/Finding"
import Flag from "../../shared/components/Flag"
import VerdictBanner from "../../shared/components/VerdictBanner"
import Notice from "../../shared/ui/Notice"
import { scoreVerdict, severityVerdict } from "../../shared/verdict"

/* ═══════════════════════════════════════════════════════════
   VIBE-CODE AUDIT — ShipSafe's #3 Feature

   Goes beyond single-file debugging. Developer pastes their
   project structure or key files, and the AI evaluates
   whether the project was responsibly built or hastily
   vibe-coded.

   Output: A project report card with scores for Security,
   Code Quality, Maintainability, AI-Pattern Detection,
   and Deployment Readiness.
   ═══════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { key: "security", label: "Security", desc: "Auth, secrets, input validation, XSS/CSRF protection" },
  { key: "quality", label: "Code quality", desc: "Error handling, separation of concerns, DRY principles" },
  { key: "maintainability", label: "Maintainability", desc: "File structure, naming, documentation, modularity" },
  { key: "aiPatterns", label: "AI patterns", desc: "Hallucinated imports, copy-paste blocks, missing tests" },
  { key: "deployReady", label: "Deploy readiness", desc: "Env vars, error boundaries, build config, monitoring" },
]

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1)

const SAMPLE_PROJECT = `// package.json
{
  "name": "my-ai-app",
  "dependencies": {
    "express": "^4.18.0",
    "openai": "^4.0.0",
    "mongoose": "^7.0.0",
    "cors": "*",
    "dotenv": "^16.0.0"
  }
}

// server.js
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

mongoose.connect(process.env.MONGO_URI);

// User model
const User = mongoose.model('User', { name: String, email: String });

app.post('/api/chat', async (req, res) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: req.body.messages,
  });
  res.json(response);
});

app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json(user);
});

app.listen(3000);
console.log('Server running');

// src/App.jsx (React frontend)
import { useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: input }]
      })
    });
    const data = await res.json();
    setMessages([...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: data.choices[0].message.content }
    ]);
    setInput('');
  };

  return (
    <div>
      <h1>AI Chat</h1>
      {messages.map((m, i) => <div key={i}>{m.role}: {m.content}</div>)}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;`

function IssueRow({ issue, open, toggle }) {
  const cat = CATEGORIES.find(c => c.key === issue.category) || CATEGORIES[0]
  return (
    <Finding
      verdict={severityVerdict(issue.severity)}
      title={issue.title}
      meta={cat.label}
      side={cap(issue.severity)}
      open={open}
      onToggle={toggle}
    >
      <p>{issue.detail}</p>
      {issue.fix && <FixPanel text={issue.fix} />}
    </Finding>
  )
}

export default function Audit() {
  const { user } = useAuth()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [exp, setExp] = useState({})
  const [filter, setFilter] = useState("all")

  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))

  // Importing a repo audits it straight away.
  const { repoProps } = useRepoImport({
    onImported: (data) => {
      setCode(data.code)
      setResult(null); setExp({})
      setTimeout(() => runAuditWithCode(data.code), 50)
    },
  })

  const runAuditWithCode = async (codeToAudit) => {
    if (!codeToAudit?.trim() || loading) return
    setLoading(true); setResult(null); setError(null); setExp({}); setSuggestions([])

    const { result: scan, suggestions: nextSteps, error: aiError } = await runScan({
      tool: "audit",
      payload: {
        projectDescription: "Audit this project for vibe-coding patterns and responsible engineering practices.",
        files: codeToAudit,
      },
      user,
    })
    if (aiError) { setError(aiError); setLoading(false); return }

    const audit = { ...scan, lineCount: codeToAudit.split("\n").length }
    setResult(audit)
    setSuggestions(nextSteps)
    const ae = {}
    audit.issues.forEach(i => { if (i.severity === "critical" || i.severity === "high") ae[i.id] = true })
    setExp(ae)
    setLoading(false)
  }

  const runAudit = () => runAuditWithCode(code)

  const filtered = result?.issues.filter(i => filter === "all" || i.category === filter) || []

  const sorted = [...filtered].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))
  const lineCount = code.split("\n").length

  return (
    <div>
      <header className="page-head">
        <h1>Vibe-Code Audit</h1>
        <p>Paste your project files or import a repo for a scored report on five categories.</p>
      </header>

      <div className="tool-grid">

        {/* Input */}
        <div className="stack" style={{ gap: 20 }}>
          <RepoImport
            {...repoProps}
            quickLabel="Import recommended files and audit now"
            scanLabel="Audit selected files"
          />

          <div>
            <CodePanel
              label="Project files"
              value={code}
              onChange={setCode}
              placeholder="Paste package.json, server files and frontend code for a complete audit"
              right={<span>{lineCount} lines</span>}
            />
            <div style={{ marginTop: 8 }}>
              <button type="button" className="link-btn" onClick={() => { setCode(SAMPLE_PROJECT); setResult(null) }}>Load sample project</button>
            </div>
          </div>

          <div className="stack" style={{ gap: 12 }}>
            <button type="button" className="btn btn-primary btn-block" onClick={runAudit} disabled={loading || !code.trim()}>
              {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
              Run audit
            </button>
            {error && <Notice tone="error" title="Audit failed" onDismiss={() => setError(null)}>{error} Your files are still here. Run the audit again.</Notice>}
          </div>
        </div>

        {/* Result */}
        <div aria-live="polite" aria-busy={loading}>
          {!loading && !result && (
            <div className="panel empty">
              <h2 className="h2">Paste your project to audit</h2>
              <p>You get a verdict plus a score for security, code quality, maintainability, AI patterns and deploy readiness.</p>
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => { setCode(SAMPLE_PROJECT); setResult(null) }}>Load sample project</button>
              </div>
            </div>
          )}

          {loading && (
            <div className="panel panel-pad stack">
              <div className="h3">Auditing {lineCount} lines</div>
              <p className="muted">Checking security, quality, maintainability, AI patterns and deploy readiness</p>
              <div className="skel" style={{ width: "100%" }} />
              <div className="skel" style={{ width: "85%" }} />
              <div className="skel" style={{ width: "70%" }} />
            </div>
          )}

          {result && (
            <div className="stack" style={{ gap: 24 }}>
              <VerdictBanner verdict={scoreVerdict(result.overallScore)} score={result.overallScore}>
                <p>{result.summary}</p>
                <p className="small muted" style={{ marginTop: 8 }}>{result.lineCount} lines analyzed, {result.issues.length} {result.issues.length === 1 ? "issue" : "issues"}</p>
              </VerdictBanner>

              <section>
                <h2 className="h2" style={{ marginBottom: 8 }}>Scores by category</h2>
                <ul className="ledger">
                  {CATEGORIES.map(c => {
                    const score = result.scores[c.key]
                    return (
                      <li key={c.key}>
                        <div className="row-static">
                          <Flag verdict={scoreVerdict(score)} size={24} labelled />
                          <div>
                            <div className="row-title">{c.label}</div>
                            <div className="row-meta">{c.desc}</div>
                          </div>
                          <span className="display" style={{ fontSize: 28 }}>{score}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <ReportButton
                scanType="audit"
                title={`Vibe-Code Audit: score ${result.overallScore ?? "n/a"}`}
                resultData={result}
              />

              <section>
                <h2 className="h2" style={{ marginBottom: 16 }}>Findings</h2>
                <div className="inline" role="group" aria-label="Filter findings by category" style={{ marginBottom: 16 }}>
                  <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                    {filter === "all" && <Check size={14} aria-hidden="true" />}All ({result.issues.length})
                  </button>
                  {CATEGORIES.map(c => {
                    const count = result.issues.filter(i => i.category === c.key).length
                    if (count === 0) return null
                    return (
                      <button key={c.key} type="button" className="chip" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
                        {filter === c.key && <Check size={14} aria-hidden="true" />}{c.label} ({count})
                      </button>
                    )
                  })}
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
    </div>
  )
}
