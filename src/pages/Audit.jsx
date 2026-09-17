import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, Play, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, FileCode, Shield, Zap, TestTube, Lock, PackageCheck, Sparkles, Github, Star, File } from "lucide-react"
import { saveScan } from "../services/supabaseService"
import { callAI, extractScore, normalizeAuditResult } from "../services/scanService"
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

// eslint-disable-next-line no-unused-vars -- Icon is used below in JSX; false positive on this destructure-rename pattern
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
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [exp, setExp] = useState({})
  const [filter, setFilter] = useState("all")
  const [githubUrl, setGithubUrl] = useState("")
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubInfo, setGithubInfo] = useState(null)
  const [githubError, setGithubError] = useState(null)
  // File picker state
  const [fileList, setFileList] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [filePickRepo, setFilePickRepo] = useState(null)

  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  const totalSelectedSize = fileList
    ? fileList.filter(f => selectedFiles.includes(f.path)).reduce((s, f) => s + f.size, 0)
    : 0

  // Quick scan: one-step auto-select + fetch + auto-audit
  const fetchFromGitHub = async () => {
    if (!githubUrl.trim() || githubLoading) return
    setGithubLoading(true); setGithubError(null); setGithubInfo(null); setFileList(null)
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

  // Step 1: Fetch file tree only (list mode)
  const fetchFileList = async () => {
    if (!githubUrl.trim() || githubLoading) return
    setGithubLoading(true); setGithubError(null); setGithubInfo(null); setFileList(null)
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim(), mode: "list" }),
      })
      const data = await res.json()
      if (!res.ok) { setGithubError(data.error || "Failed to fetch repo"); return }
      setFileList(data.files)
      setFilePickRepo(data.repo)
      setSelectedFiles(data.files.filter(f => f.autoSelected).map(f => f.path))
    } catch {
      setGithubError("Network error — could not reach GitHub")
    } finally {
      setGithubLoading(false)
    }
  }

  // Step 3: Fetch only selected files then auto-audit
  const fetchSelectedFiles = async () => {
    if (!selectedFiles.length || githubLoading) return
    setGithubLoading(true); setGithubError(null)
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim(), files: selectedFiles }),
      })
      const data = await res.json()
      if (!res.ok) { setGithubError(data.error || "Failed to fetch files"); return }
      setCode(data.code)
      setGithubInfo(data)
      setFileList(null)
      setResult(null); setExp({})
      setGithubLoading(false)
      setTimeout(() => runAuditWithCode(data.code), 50)
    } catch {
      setGithubError("Network error — could not reach GitHub")
      setGithubLoading(false)
    }
  }

  const runAuditWithCode = async (codeToAudit) => {
    if (!codeToAudit?.trim() || loading) return
    setLoading(true); setResult(null); setError(null); setExp({}); setSuggestions([])

    const { content, error: aiError } = await callAI("audit", {
      projectDescription: "Audit this project for vibe-coding patterns and responsible engineering practices.",
      files: codeToAudit,
    })
    if (aiError) { setError(aiError); setLoading(false); return }

    const audit = normalizeAuditResult(content)
    audit.lineCount = codeToAudit.split("\n").length
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

  const runAudit = () => runAuditWithCode(code)

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
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* LEFT — Input */}
        <div>
          {/* GitHub fetch — two-step file picker */}
          <div style={{ marginBottom: 10 }}>
            {/* URL input row */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: fileList ? 8 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", flex: 1, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ padding: "0 10px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center" }}>
                  <Github size={13} color="rgba(255,255,255,0.25)" />
                </div>
                <input
                  value={githubUrl}
                  onChange={e => { setGithubUrl(e.target.value); setGithubError(null); setFileList(null) }}
                  onKeyDown={e => e.key === "Enter" && fetchFileList()}
                  placeholder="Paste GitHub repo URL…"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "8px 10px", fontFamily: "inherit" }}
                />
              </div>
              {/* Fetch Files — step 1 */}
              <button
                onClick={fetchFileList}
                disabled={githubLoading || !githubUrl.trim()}
                style={{ background: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.04)" : "rgba(249,115,22,0.08)", border: `1px solid ${githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.08)" : "rgba(249,115,22,0.2)"}`, borderRadius: 7, color: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.2)" : "#f97316", fontSize: 12, padding: "8px 12px", cursor: githubLoading || !githubUrl.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                {githubLoading && !fileList ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Loading…</> : <><FileCode size={11} /> Fetch Files</>}
              </button>
              {/* Quick Scan — old one-step flow */}
              <button
                onClick={fetchFromGitHub}
                disabled={githubLoading || !githubUrl.trim()}
                title="Auto-select & audit in one step"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)", fontSize: 12, padding: "8px 12px", cursor: githubLoading || !githubUrl.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                <Zap size={11} /> Quick
              </button>
            </div>

            {/* File picker panel — step 2 */}
            {fileList && (
              <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                {/* Picker header */}
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                  <Github size={12} color="rgba(255,255,255,0.3)" />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", flex: 1, fontWeight: 500 }}>
                    {filePickRepo?.name} <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>— {fileList.length} files found</span>
                  </span>
                  <button
                    onClick={() => setSelectedFiles(fileList.filter(f => f.autoSelected).map(f => f.path))}
                    style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 5, color: "#f97316", fontSize: 10, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Auto-select recommended
                  </button>
                  <button
                    onClick={() => selectedFiles.length === fileList.length ? setSelectedFiles([]) : setSelectedFiles(fileList.map(f => f.path))}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, color: "rgba(255,255,255,0.4)", fontSize: 10, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    {selectedFiles.length === fileList.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* File list */}
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {fileList.map(f => {
                    const checked = selectedFiles.includes(f.path)
                    return (
                      <label key={f.path} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.03)", background: checked ? "rgba(249,115,22,0.03)" : "transparent" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedFiles(p => checked ? p.filter(x => x !== f.path) : [...p, f.path])}
                          style={{ accentColor: "#f97316", width: 13, height: 13, flexShrink: 0 }}
                        />
                        <FileCode size={11} color={checked ? "#f97316" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: checked ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.path}
                        </span>
                        {f.autoSelected && <span style={{ fontSize: 9, color: "rgba(249,115,22,0.7)", background: "rgba(249,115,22,0.06)", padding: "1px 5px", borderRadius: 3, flexShrink: 0 }}>rec</span>}
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0, fontFamily: "monospace" }}>{formatSize(f.size)}</span>
                      </label>
                    )
                  })}
                </div>

                {/* Picker footer */}
                <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flex: 1 }}>
                    Selected: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{selectedFiles.length} files</span>
                    {totalSelectedSize > 0 && <span style={{ color: "rgba(255,255,255,0.25)" }}> ({formatSize(totalSelectedSize)})</span>}
                  </span>
                  <button
                    onClick={() => setFileList(null)}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                  <button
                    onClick={fetchSelectedFiles}
                    disabled={!selectedFiles.length || githubLoading}
                    style={{ background: !selectedFiles.length || githubLoading ? "rgba(255,255,255,0.04)" : "#f97316", border: "none", borderRadius: 7, color: !selectedFiles.length || githubLoading ? "rgba(255,255,255,0.2)" : "#000", fontSize: 12, fontWeight: 700, padding: "7px 16px", cursor: !selectedFiles.length || githubLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                    {githubLoading ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Fetching…</> : "Audit Selected Files →"}
                  </button>
                </div>
              </div>
            )}

            {githubError && (
              <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 7, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#ef4444" }}>{githubError}</span>
                <button onClick={() => setGithubError(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            )}
            {githubInfo && !fileList && (
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

          {error && (
            <div style={{ marginTop: 10, padding: "11px 14px", borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 2 }}>Audit failed</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{error}</div>
              </div>
              <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}
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
