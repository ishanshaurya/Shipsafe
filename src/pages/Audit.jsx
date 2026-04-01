import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, Play, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, FileCode, Shield, Zap, TestTube, Lock, PackageCheck, Sparkles, Github, Star } from "lucide-react"
import { saveScan } from "../services/supabaseService"
import { extractScore } from "../services/scanService"
import { useAuth } from "../hooks/useAuth"
import { useIsMobile } from "../hooks/useIsMobile"
import ReportButton from "../components/ReportButton"
import NextSteps from "../components/NextSteps"
import { getSuggestions } from "../utils/crossToolSuggestions"

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
  { key: "security", label: "Security", icon: Lock, color: "#ef4444", desc: "Auth, secrets, input validation, XSS/CSRF protection" },
  { key: "quality", label: "Code Quality", icon: FileCode, color: "#0ea5e9", desc: "Error handling, separation of concerns, DRY principles" },
  { key: "maintainability", label: "Maintainability", icon: PackageCheck, color: "#a855f7", desc: "File structure, naming, documentation, modularity" },
  { key: "aiPatterns", label: "AI-Pattern Detection", icon: Sparkles, color: "#f59e0b", desc: "Hallucinated imports, copy-paste blocks, missing tests" },
  { key: "deployReady", label: "Deploy Readiness", icon: Zap, color: "#22c55e", desc: "Env vars, error boundaries, build config, monitoring" },
]

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

function getMockAudit(code) {
  const lines = code.split("\n")
  const lineCount = lines.length
  const findings = []
  let fid = 1

  // Security checks
  const securityIssues = []
  if (!code.includes("helmet") && !code.includes("security headers")) securityIssues.push({ id: fid++, title: "No security headers (helmet)", severity: "high", detail: "Express app has no helmet middleware. Missing headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.", fix: "npm install helmet && app.use(helmet())" })
  if (code.includes("cors()") || code.includes('cors("*")') || code.includes("cors: *")) securityIssues.push({ id: fid++, title: "CORS allows all origins", severity: "high", detail: "Wildcard CORS lets any website make requests to your API. Credential theft possible.", fix: "cors({ origin: ['https://yourdomain.com'], credentials: true })" })
  if (!code.includes("rateLimit") && !code.includes("rate-limit") && !code.includes("throttle")) securityIssues.push({ id: fid++, title: "No rate limiting", severity: "medium", detail: "API has no rate limiting. Vulnerable to brute force and DDoS.", fix: "npm install express-rate-limit && app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))" })
  if (!code.includes("validate") && !code.includes("joi") && !code.includes("zod") && !code.includes("yup")) securityIssues.push({ id: fid++, title: "No input validation", severity: "high", detail: "No validation library detected. User input goes directly to database/API without sanitization.", fix: "Use zod or joi to validate all request bodies before processing." })
  if (code.includes("req.body") && !code.includes("sanitize")) securityIssues.push({ id: fid++, title: "No input sanitization", severity: "medium", detail: "Request body is used directly without sanitization. XSS and injection risk.", fix: "Sanitize all user inputs before storing or displaying." })
  const secScore = Math.max(0, 100 - securityIssues.length * 18)

  // Code quality checks
  const qualityIssues = []
  if (!code.includes("try") && !code.includes("catch")) qualityIssues.push({ id: fid++, title: "No try/catch error handling", severity: "critical", detail: "Zero error handling found. Any async failure will crash the server or return 500 without useful error messages.", fix: "Wrap all async route handlers in try/catch blocks." })
  if (code.includes("console.log")) qualityIssues.push({ id: fid++, title: "Console.log used instead of logger", severity: "low", detail: "Debug statements found. Use a structured logger (winston, pino) with log levels.", fix: "Replace console.log with logger.info() / logger.error()" })
  if (code.match(/app\.(get|post|put|delete)/g)?.length > 2 && !code.includes("router") && !code.includes("Router")) qualityIssues.push({ id: fid++, title: "All routes in single file", severity: "medium", detail: "Multiple routes defined in one file without Express Router. Hard to maintain as the app grows.", fix: "Split into route files: routes/users.js, routes/chat.js, etc." })
  if (!code.includes("async") && code.includes("await")) qualityIssues.push({ id: fid++, title: "Await without async", severity: "high", detail: "Code uses await but function may not be marked async.", fix: "Ensure all functions using await are declared as async." })
  const qualScore = Math.max(0, 100 - qualityIssues.length * 20)

  // Maintainability checks
  const maintIssues = []
  if (!code.includes("// ") && !code.includes("/* ") && !code.includes("/** ")) maintIssues.push({ id: fid++, title: "No code comments", severity: "medium", detail: "No documentation or comments found. Other developers (or future you) will struggle to understand the codebase.", fix: "Add JSDoc comments to functions and inline comments for complex logic." })
  if (lineCount > 50 && !code.includes("import") && !code.includes("require") && !code.includes("module")) maintIssues.push({ id: fid++, title: "No modular structure", severity: "medium", detail: "Large codebase without imports/exports suggests everything is in one file.", fix: "Split into modules: models/, routes/, middleware/, utils/" })
  if (!code.includes(".env") && !code.includes("process.env") && code.includes("http")) maintIssues.push({ id: fid++, title: "Hardcoded configuration", severity: "medium", detail: "URLs and config values are hardcoded instead of using environment variables.", fix: "Use dotenv and process.env for all configuration." })
  if (code.includes("process.env")) maintIssues.push({ id: fid++, title: "No .env.example file mentioned", severity: "low", detail: "Uses env vars but no .env.example template for other developers.", fix: "Create .env.example with all required variables (without values)." })
  const maintScore = Math.max(0, 100 - maintIssues.length * 15)

  // AI pattern detection
  const aiIssues = []
  if (!code.includes("test") && !code.includes("spec") && !code.includes("jest") && !code.includes("mocha") && !code.includes("vitest")) aiIssues.push({ id: fid++, title: "Zero tests detected", severity: "critical", detail: "No test files, test runner, or testing library found. This is the #1 indicator of vibe-coded projects — AI generates features but never tests.", fix: "Add at minimum: unit tests for utils, integration tests for API routes." })
  if (code.includes("cors()") && !code.includes("origin")) aiIssues.push({ id: fid++, title: "AI-generated CORS — too permissive", severity: "high", detail: "cors() with no config is a classic AI-generated pattern. Every AI code generator defaults to wide-open CORS.", fix: "Configure specific origins: cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') })" })
  if (code.match(/require\(['"][^'"]+['"]\)/g)?.length > 3 && !code.includes("package-lock") && !code.includes("lock")) aiIssues.push({ id: fid++, title: "No lockfile referenced", severity: "low", detail: "Multiple dependencies but no package-lock.json mentioned. Dependency versions may drift.", fix: "Commit package-lock.json and use npm ci in CI/CD." })
  if (code.includes("mongoose.connect") && !code.includes("useNewUrlParser") && !code.includes("connection error")) aiIssues.push({ id: fid++, title: "Database connection without error handling", severity: "high", detail: "MongoDB connection has no error handler. If the DB is down, the app silently fails. Vibe-coders connect and forget.", fix: "mongoose.connect(uri).then(() => logger.info('DB connected')).catch(err => { logger.error(err); process.exit(1) })" })
  const aiScore = Math.max(0, 100 - aiIssues.length * 22)

  // Deploy readiness
  const deployIssues = []
  if (!code.includes("PORT") && code.includes("3000")) deployIssues.push({ id: fid++, title: "Hardcoded port number", severity: "medium", detail: "Port 3000 is hardcoded. Most hosting platforms assign a dynamic port via PORT env var.", fix: "const PORT = process.env.PORT || 3000" })
  if (!code.includes("Sentry") && !code.includes("monitoring") && !code.includes("errorHandler")) deployIssues.push({ id: fid++, title: "No error monitoring", severity: "medium", detail: "No error tracking service (Sentry, DataDog, etc.) configured. Production errors will go unnoticed.", fix: "Add Sentry: npm install @sentry/node && Sentry.init({ dsn: process.env.SENTRY_DSN })" })
  if (!code.includes("graceful") && !code.includes("SIGTERM") && !code.includes("shutdown")) deployIssues.push({ id: fid++, title: "No graceful shutdown", severity: "low", detail: "No SIGTERM handler. Container restarts will drop in-flight requests.", fix: "process.on('SIGTERM', () => { server.close(() => process.exit(0)) })" })
  if (code.includes("*") && code.includes("dependencies")) deployIssues.push({ id: fid++, title: "Wildcard dependency version", severity: "high", detail: "Using '*' as version means any version gets installed. Breaking changes will randomly break your app.", fix: "Pin to specific versions: cors: '^2.8.5' not '*'" })
  const deployScore = Math.max(0, 100 - deployIssues.length * 18)

  const overallScore = Math.round((secScore + qualScore + maintScore + aiScore + deployScore) / 5)

  const allIssues = [
    ...securityIssues.map(i => ({ ...i, category: "security" })),
    ...qualityIssues.map(i => ({ ...i, category: "quality" })),
    ...maintIssues.map(i => ({ ...i, category: "maintainability" })),
    ...aiIssues.map(i => ({ ...i, category: "aiPatterns" })),
    ...deployIssues.map(i => ({ ...i, category: "deployReady" })),
  ]

  return {
    overallScore,
    scores: { security: secScore, quality: qualScore, maintainability: maintScore, aiPatterns: aiScore, deployReady: deployScore },
    summary: overallScore >= 70
      ? `This project scores ${overallScore}/100. Good foundation with ${allIssues.length} areas for improvement.`
      : overallScore >= 40
      ? `This project scores ${overallScore}/100. Multiple issues across ${new Set(allIssues.map(i => i.category)).size} categories need attention before deployment.`
      : `This project scores ${overallScore}/100. Significant gaps in security, testing, and error handling. Likely vibe-coded — needs substantial hardening before production.`,
    issues: allIssues,
    lineCount,
    verdict: overallScore >= 70 ? "SHIP-READY" : overallScore >= 40 ? "NEEDS WORK" : "NOT SAFE TO SHIP",
    verdictColor: overallScore >= 70 ? "#22c55e" : overallScore >= 40 ? "#f59e0b" : "#ef4444",
  }
}

function ScoreBar({ label, score, color, icon: Icon }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={12} color={color} /> {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{score}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 100, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 100, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
    </div>
  )
}

function IssueItem({ issue, open, toggle }) {
  const cat = CATEGORIES.find(c => c.key === issue.category) || CATEGORIES[0]
  const sevColor = issue.severity === "critical" ? "#ef4444" : issue.severity === "high" ? "#f97316" : issue.severity === "medium" ? "#eab308" : "#22c55e"
  return (
    <div style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}18`, borderRadius: 10 }}>
      <div onClick={toggle} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <cat.icon size={13} color={cat.color} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{issue.title}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: sevColor, letterSpacing: "0.08em", background: `${sevColor}12`, padding: "2px 6px", borderRadius: 4 }}>{issue.severity.toUpperCase()}</span>
        {open ? <ChevronDown size={13} color="rgba(255,255,255,0.2)" /> : <ChevronRight size={13} color="rgba(255,255,255,0.2)" />}
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${sevColor}12`, paddingTop: 10 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 10 }}>{issue.detail}</p>
          <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.1)", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#34d399", marginBottom: 4, letterSpacing: "0.1em" }}>FIX</div>
            <pre style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{issue.fix}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Audit() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [exp, setExp] = useState({})
  const [filter, setFilter] = useState("all")
  const [githubUrl, setGithubUrl] = useState("")
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubInfo, setGithubInfo] = useState(null)
  const [githubError, setGithubError] = useState(null)

  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))

  const fetchFromGitHub = async () => {
    if (!githubUrl.trim() || githubLoading) return
    setGithubLoading(true); setGithubError(null); setGithubInfo(null)
    try {
      const res = await fetch("/api/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: githubUrl.trim() }) })
      const data = await res.json()
      if (!res.ok) { setGithubError(data.error || "Failed to fetch repo"); setGithubLoading(false); return }
      setCode(data.code)
      setGithubInfo(data)
      setResult(null); setExp({})
      setGithubLoading(false)
      // Auto-run audit after fetching
      setTimeout(() => runAuditWithCode(data.code), 50)
    } catch {
      setGithubError("Network error — could not reach GitHub")
      setGithubLoading(false)
    }
  }

  const runAuditWithCode = async (codeToAudit) => {
    if (!codeToAudit?.trim() || loading) return
    setLoading(true); setResult(null); setExp({}); setSuggestions([])
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 1000))
    const audit = getMockAudit(codeToAudit)
    setResult(audit)
    setSuggestions(getSuggestions("audit", audit))
    if (user) {
      saveScan(user.id, "audit", codeToAudit.slice(0, 500), audit, extractScore("audit", audit))
        .then(({ error }) => { if (error) console.error("Failed to save scan:", error.message) })
    }
    const ae = {}
    audit.issues.forEach(i => { if (i.severity === "critical" || i.severity === "high") ae[i.id] = true })
    setExp(ae)
    setLoading(false)
  }

  const runAudit = async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setResult(null)
    setExp({})
    setSuggestions([])
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 1000))
    const audit = getMockAudit(code)
    setResult(audit)
    setSuggestions(getSuggestions("audit", audit))
    if (user) {
      saveScan(user.id, "audit", code.slice(0, 500), audit, extractScore("audit", audit))
        .then(({ error }) => { if (error) console.error("Failed to save scan:", error.message) })
    }
    const ae = {}
    audit.issues.forEach(i => { if (i.severity === "critical" || i.severity === "high") ae[i.id] = true })
    setExp(ae)
    setLoading(false)
  }

  const filtered = result?.issues.filter(i => filter === "all" || i.category === filter) || []

  return (
    <div className="animate-fade-in">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Search size={18} color="#f97316" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>Vibe-Code Audit</h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            Paste your project files → scored report card across 5 categories
            <span style={{ color: "#34d399", marginLeft: 8 }}>● Live AI</span>
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* LEFT — Input */}
        <div>
          {/* GitHub fetch */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ padding: "0 10px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
                  <Github size={13} color="rgba(255,255,255,0.25)" />
                </div>
                <input
                  value={githubUrl}
                  onChange={e => { setGithubUrl(e.target.value); setGithubError(null) }}
                  onKeyDown={e => e.key === "Enter" && fetchFromGitHub()}
                  placeholder="Paste GitHub repo URL to auto-scan"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "8px 10px", fontFamily: "inherit" }}
                />
              </div>
              <button onClick={fetchFromGitHub} disabled={githubLoading || !githubUrl.trim()} style={{ background: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontSize: 12, padding: "8px 14px", cursor: githubLoading || !githubUrl.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                {githubLoading ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Fetching...</> : "Fetch & Audit"}
              </button>
            </div>
            {githubError && (
              <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 7, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#ef4444" }}>{githubError}</span>
                <button onClick={() => setGithubError(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            )}
            {githubInfo && (
              <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
                <Github size={11} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", flex: 1 }}>Fetched {githubInfo.fileCount} files ({githubInfo.totalLines} lines) from <span style={{ color: "rgba(255,255,255,0.7)" }}>{githubInfo.repo.name}</span></span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 3 }}><Star size={10} color="#eab308" fill="#eab308" /> {githubInfo.repo.stars.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <button
              onClick={() => { setCode(SAMPLE_PROJECT); setResult(null) }}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.4)", fontSize: 11, padding: "6px 12px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f97316"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)" }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
              Load Sample
            </button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Paste package.json + server files + frontend code</span>
          </div>

          {/* Editor */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
            {/* Title bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.6 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.6 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.6 }} />
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>project files</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{code.split("\n").length} lines</span>
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Paste your project code here — include package.json, server files, and frontend code for a complete audit..."
              spellCheck={false}
              style={{ width: "100%", minHeight: 450, maxHeight: 600, background: "transparent", border: "none", outline: "none", resize: "vertical", color: "rgba(255,255,255,0.75)", fontFamily: "monospace", fontSize: 12, lineHeight: "20px", padding: 16, whiteSpace: "pre", overflowX: "auto" }}
            />
          </div>

          <button
            onClick={runAudit}
            disabled={loading || !code.trim()}
            style={{ width: "100%", marginTop: 10, padding: "13px 0", borderRadius: 10, border: "none", background: loading || !code.trim() ? "rgba(255,255,255,0.04)" : "#34d399", color: loading || !code.trim() ? "rgba(255,255,255,0.2)" : "#000", fontSize: 14, fontWeight: 700, cursor: loading || !code.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Auditing project...</>
              : <><Search size={15} /> Run Vibe-Code Audit</>}
          </button>
        </div>

        {/* RIGHT — Results */}
        <div>
          {/* Empty state */}
          {!loading && !result && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "60px 40px", textAlign: "center", minHeight: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <Search size={24} color="#f97316" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>Paste your project to audit</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: 300, marginBottom: 20 }}>Scored report card across 5 categories. Detects vibe-coded patterns.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {CATEGORIES.map((c, i) => (
                  <span key={i} style={{ fontSize: 10, color: c.color, background: `${c.color}10`, border: `1px solid ${c.color}20`, padding: "3px 9px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                    <c.icon size={9} /> {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "80px 40px", textAlign: "center", minHeight: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={32} color="#f97316" style={{ animation: "spin 1.5s linear infinite", marginBottom: 18 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>Auditing {code.split("\n").length} lines across 5 categories</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Checking security, quality, maintainability, AI patterns, deploy readiness...</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Verdict banner */}
              <div style={{ background: `${result.verdictColor}08`, border: `1px solid ${result.verdictColor}20`, borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: result.verdictColor, lineHeight: 1, letterSpacing: "-0.04em" }}>{result.overallScore}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>/ 100</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: result.verdictColor, letterSpacing: "0.1em", marginBottom: 5 }}>{result.verdict}</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>{result.lineCount} lines analyzed · {result.issues.length} issues found</div>
                </div>
              </div>

              {/* Score bars */}
              <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", marginBottom: 16 }}>CATEGORY SCORES</div>
                {CATEGORIES.map(c => (
                  <ScoreBar key={c.key} label={c.label} score={result.scores[c.key]} color={c.color} icon={c.icon} />
                ))}
              </div>

              <ReportButton
                scanType="audit"
                title={`Vibe-Code Audit · score ${result.overallScore ?? "—"}`}
                resultData={result}
              />

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setFilter("all")}
                  style={{ background: filter === "all" ? "rgba(255,255,255,0.08)" : "transparent", border: `1px solid ${filter === "all" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius: 7, padding: "5px 11px", fontSize: 10, color: filter === "all" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)", cursor: "pointer", fontWeight: filter === "all" ? 600 : 400 }}>
                  All ({result.issues.length})
                </button>
                {CATEGORIES.map(c => {
                  const count = result.issues.filter(i => i.category === c.key).length
                  if (count === 0) return null
                  return (
                    <button
                      key={c.key}
                      onClick={() => setFilter(c.key)}
                      style={{ background: filter === c.key ? `${c.color}12` : "transparent", border: `1px solid ${filter === c.key ? `${c.color}30` : "rgba(255,255,255,0.06)"}`, borderRadius: 7, padding: "5px 11px", fontSize: 10, color: filter === c.key ? c.color : "rgba(255,255,255,0.3)", cursor: "pointer", fontWeight: filter === c.key ? 600 : 400, display: "flex", alignItems: "center", gap: 4 }}>
                      <c.icon size={9} /> {c.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Issues list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {filtered.sort((a, b) => {
                  const o = { critical: 0, high: 1, medium: 2, low: 3 }
                  return (o[a.severity] ?? 4) - (o[b.severity] ?? 4)
                }).map(issue => (
                  <IssueItem key={issue.id} issue={issue} open={!!exp[issue.id]} toggle={() => toggle(issue.id)} />
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
