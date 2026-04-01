import { useState } from "react"
import { Link } from "react-router-dom"
import { Bug, Play, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, ChevronRight, Copy, Check, Lock, Code2, Sparkles, Github, Star } from "lucide-react"
import { callAI, extractScore } from "../services/scanService"
import { saveScan } from "../services/supabaseService"
import { useAuth } from "../hooks/useAuth"
import { useIsMobile } from "../hooks/useIsMobile"
import ReportButton from "../components/ReportButton"
import NextSteps from "../components/NextSteps"
import { getSuggestions } from "../utils/crossToolSuggestions"

const LANGS = ["JavaScript","TypeScript","Python","Java","Go","Rust","C++","PHP","Ruby","SQL"]

function mapLanguage(ghLang) {
  if (!ghLang) return "JavaScript"
  const exact = LANGS.find(l => l.toLowerCase() === ghLang.toLowerCase())
  if (exact) return exact
  const map = { "Kotlin": "Java", "Scala": "Java", "Swift": "JavaScript", "C": "C++", "C#": "JavaScript", "Shell": "JavaScript" }
  return map[ghLang] || "JavaScript"
}
const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)", icon: AlertCircle, label: "CRITICAL" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)", icon: AlertTriangle, label: "HIGH" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.06)",  border: "rgba(234,179,8,0.15)",  icon: Info, label: "MEDIUM" },
  low:      { color: "#34d399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)", icon: CheckCircle, label: "LOW" },
}
const CAT = {
  security:   { icon: Lock,     color: "#f97316", label: "Security" },
  bug:        { icon: Bug,      color: "#ef4444", label: "Bug" },
  vibecode:   { icon: Sparkles, color: "#a855f7", label: "Vibe-Code" },
  style:      { icon: Code2,    color: "#38bdf8", label: "Style" },
  credential: { icon: Lock,     color: "#ef4444", label: "Credential" },
}
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

function ScoreRing({ score }) {
  const s=120, w=8, r=(s-w)/2, c=2*Math.PI*r, off=c-(score/100)*c
  const col = score>=80?"#34d399":score>=60?"#eab308":score>=40?"#f97316":"#ef4444"
  return (
    <div style={{ position:"relative", width:s, height:s, flexShrink:0 }}>
      <svg width={s} height={s} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={w}/>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={col} strokeWidth={w} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:30, fontWeight:900, color:col, letterSpacing:"-0.03em" }}>{score}</span>
        <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>/ 100</span>
      </div>
    </div>
  )
}

function IssueCard({ issue, open, toggle }) {
  const s = SEV[issue.severity]||SEV.medium
  const ct = CAT[issue.category]||CAT.bug
  const SI=s.icon, CI=ct.icon
  return (
    <div style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10 }}>
      <div onClick={toggle} style={{ padding:"13px 16px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:12 }}>
        <SI size={14} color={s.color} style={{ marginTop:2, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            {issue.line && <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", padding:"1px 6px", borderRadius:4, fontFamily:"monospace" }}>L{issue.line}</span>}
            <span style={{ fontSize:9, color:ct.color, display:"flex", alignItems:"center", gap:3 }}><CI size={9}/> {ct.label}</span>
            <span style={{ fontSize:9, fontWeight:700, color:s.color, letterSpacing:"0.08em", marginLeft:"auto" }}>{s.label}</span>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{issue.title}</div>
        </div>
        {open?<ChevronDown size={13} color="rgba(255,255,255,0.25)"/>:<ChevronRight size={13} color="rgba(255,255,255,0.25)"/>}
      </div>
      {open && (
        <div style={{ padding:"0 16px 14px", borderTop:`1px solid ${s.border}`, paddingTop:12 }}>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.7, marginBottom:10 }}>{issue.description}</p>
          {issue.codeSnippet && (
            <div style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:6, padding:"8px 12px", marginBottom:10, fontFamily:"monospace", fontSize:11, color:"#ef4444", lineHeight:1.6 }}>
              {issue.codeSnippet}
            </div>
          )}
          {issue.fix && (
            <div style={{ background:"rgba(52,211,153,0.04)", border:"1px solid rgba(52,211,153,0.12)", borderRadius:6, padding:"10px 12px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#34d399", marginBottom:6, letterSpacing:"0.1em" }}>FIX</div>
              <pre style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.7, fontFamily:"monospace", whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>{issue.fix}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Debugger() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [code, setCode] = useState("")
  const [lang, setLang] = useState("JavaScript")
  const [ctx, setCtx] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState(null)
  const [exp, setExp] = useState({})
  const [copied, setCopied] = useState(false)
  const [githubUrl, setGithubUrl] = useState("")
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubInfo, setGithubInfo] = useState(null)
  const [githubError, setGithubError] = useState(null)
  const toggle = (id) => setExp(p => ({ ...p, [id]: !p[id] }))
  const lc = code.split("\n").length

  const fetchFromGitHub = async () => {
    if (!githubUrl.trim() || githubLoading) return
    setGithubLoading(true); setGithubError(null); setGithubInfo(null)
    try {
      const res = await fetch("/api/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: githubUrl.trim() }) })
      const data = await res.json()
      if (!res.ok) { setGithubError(data.error || "Failed to fetch repo"); return }
      setCode(data.code)
      setLang(mapLanguage(data.repo.language))
      setCtx(`${data.repo.name}${data.repo.description ? " - " + data.repo.description : ""}`)
      setGithubInfo(data)
      setResult(null); setError(null); setExp({})
    } catch {
      setGithubError("Network error — could not reach GitHub")
    } finally {
      setGithubLoading(false)
    }
  }

  const runScan = async () => {
    if (!code.trim()||loading) return
    setLoading(true); setResult(null); setError(null); setExp({}); setSuggestions([])
    try {
      const { content:parsed, error:aiError } = await callAI("debugger", { code, language:lang, context:ctx })
      if (aiError) { setError(aiError); return }
      setResult(parsed)
      setSuggestions(getSuggestions("debugger", parsed))
      if (user) saveScan(user.id,"debugger",code,parsed,extractScore("debugger",parsed)).then(({error})=>{ if(error) console.error("Save failed:",error.message) })
      const ae={}
      parsed.issues.forEach(i=>{ if(i.severity==="critical"||i.severity==="high") ae[i.id]=true })
      setExp(ae)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Bug size={17} color="#ef4444"/>
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>AI Code Debugger</h1>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>
              Bugs · Security holes · Vibe-code smells · Credential leaks
              <span style={{ color:"#34d399", marginLeft:10 }}>● Live AI</span>
            </p>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:16, alignItems:"start" }}>

        {/* LEFT — Input */}
        <div>
          {/* GitHub fetch */}
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", flex:1, gap:0, background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, overflow:"hidden" }}>
                <div style={{ padding:"0 10px", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center" }}>
                  <Github size={13} color="rgba(255,255,255,0.25)"/>
                </div>
                <input
                  value={githubUrl}
                  onChange={e => { setGithubUrl(e.target.value); setGithubError(null) }}
                  onKeyDown={e => e.key === "Enter" && fetchFromGitHub()}
                  placeholder="Paste GitHub repo URL to auto-scan"
                  style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"rgba(255,255,255,0.7)", fontSize:12, padding:"8px 10px", fontFamily:"inherit" }}
                />
              </div>
              <button onClick={fetchFromGitHub} disabled={githubLoading || !githubUrl.trim()} style={{ background: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color: githubLoading || !githubUrl.trim() ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontSize:12, padding:"8px 14px", cursor: githubLoading || !githubUrl.trim() ? "not-allowed" : "pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
                {githubLoading ? <><Loader2 size={11} style={{ animation:"spin 1s linear infinite" }}/> Fetching...</> : "Fetch & Scan"}
              </button>
            </div>
            {githubError && (
              <div style={{ marginTop:6, padding:"8px 12px", borderRadius:7, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", display:"flex", alignItems:"center", gap:8, justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"#ef4444" }}>{githubError}</span>
                <button onClick={() => setGithubError(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
              </div>
            )}
            {githubInfo && (
              <div style={{ marginTop:6, padding:"8px 12px", borderRadius:7, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:8 }}>
                <Github size={11} color="rgba(255,255,255,0.3)"/>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", flex:1 }}>Fetched {githubInfo.fileCount} files ({githubInfo.totalLines} lines) from <span style={{ color:"rgba(255,255,255,0.7)" }}>{githubInfo.repo.name}</span></span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", gap:3 }}><Star size={10} color="#eab308" fill="#eab308"/> {githubInfo.repo.stars.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
            <select value={lang} onChange={e=>setLang(e.target.value)} style={{ background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, color:"rgba(255,255,255,0.6)", fontSize:12, padding:"7px 10px", outline:"none", fontFamily:"inherit" }}>
              {LANGS.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
            <input placeholder="Context (optional)" value={ctx} onChange={e=>setCtx(e.target.value)} style={{ flex:1, background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, color:"rgba(255,255,255,0.7)", fontSize:12, padding:"7px 10px", outline:"none", fontFamily:"inherit" }}/>
            <button onClick={()=>{ setCode(SAMPLE); setLang("JavaScript"); setCtx("Express.js REST API"); setResult(null); setError(null) }} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, color:"rgba(255,255,255,0.35)", fontSize:11, padding:"7px 12px", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>Sample</button>
          </div>

          {/* Code editor */}
          <div style={{ background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display:"flex", gap:5 }}>
                {["#ef4444","#eab308","#34d399"].map((c,i)=><div key={i} style={{ width:9, height:9, borderRadius:"50%", background:c, opacity:0.6 }}/>)}
              </div>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)", fontFamily:"monospace" }}>{lang.toLowerCase()}</span>
              <button onClick={()=>{ navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000) }} style={{ background:"none", border:"none", cursor:"pointer", color:copied?"#34d399":"rgba(255,255,255,0.25)", display:"flex", alignItems:"center", gap:4, fontSize:11, fontFamily:"inherit" }}>
                {copied?<Check size={11}/>:<Copy size={11}/>} {copied?"Copied":"Copy"}
              </button>
            </div>
            <div style={{ display:"flex", minHeight:380, maxHeight:520, overflow:"auto" }}>
              <div style={{ padding:"14px 0", minWidth:40, textAlign:"right", userSelect:"none", borderRight:"1px solid rgba(255,255,255,0.04)", background:"rgba(0,0,0,0.2)" }}>
                {Array.from({ length:Math.max(lc,20) },(_,i)=>(
                  <div key={i} style={{ padding:"0 10px", fontSize:11, lineHeight:"20px", color:"rgba(255,255,255,0.15)", fontFamily:"monospace" }}>{i+1}</div>
                ))}
              </div>
              <textarea value={code} onChange={e=>setCode(e.target.value)} placeholder="Paste your code here..." spellCheck={false} style={{ flex:1, background:"transparent", border:"none", outline:"none", resize:"none", color:"rgba(255,255,255,0.85)", fontFamily:"'JetBrains Mono',monospace", fontSize:12, lineHeight:"20px", padding:14, minHeight:380, width:"100%", whiteSpace:"pre", overflowX:"auto" }}/>
            </div>
          </div>

          <button onClick={runScan} disabled={loading||!code.trim()} style={{ width:"100%", marginTop:10, padding:13, borderRadius:9, border:"none", background:loading||!code.trim()?"rgba(255,255,255,0.04)":"#34d399", color:loading||!code.trim()?"rgba(255,255,255,0.2)":"#000", fontSize:14, fontWeight:700, cursor:loading||!code.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit", transition:"all 0.2s" }}>
            {loading?<><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> Analyzing...</>:<><Play size={15}/> Run ShipSafe Scan</>}
          </button>

          {error && (
            <div style={{ marginTop:10, padding:"11px 14px", borderRadius:9, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", display:"flex", gap:10, alignItems:"flex-start" }}>
              <AlertCircle size={14} color="#ef4444" style={{ marginTop:1, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#ef4444", marginBottom:2 }}>Scan failed</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>{error}</div>
              </div>
              <button onClick={()=>setError(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:"rgba(255,255,255,0.25)", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
            </div>
          )}

          {result && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginTop:10 }}>
              {[{l:"Total",v:result.stats.totalIssues,c:"rgba(255,255,255,0.5)"},{l:"Critical",v:result.stats.critical,c:"#ef4444"},{l:"High",v:result.stats.high,c:"#f97316"},{l:"Medium",v:result.stats.medium,c:"#eab308"},{l:"Low",v:result.stats.low,c:"#34d399"}].map((s,i)=>(
                <div key={i} style={{ background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:s.c, letterSpacing:"-0.02em" }}>{s.v}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", letterSpacing:"0.06em", marginTop:2 }}>{s.l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Results */}
        <div>
          {!loading && !result && !error && (
            <div style={{ background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"60px 32px", textAlign:"center", minHeight:480, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:56, height:56, borderRadius:14, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                <Bug size={24} color="#ef4444"/>
              </div>
              <h3 style={{ fontSize:17, fontWeight:700, color:"#fff", marginBottom:8 }}>Paste code to scan</h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.3)", lineHeight:1.7, maxWidth:300 }}>Finds bugs, security holes, credential leaks, and vibe-code smells. Try the sample code.</p>
            </div>
          )}

          {loading && (
            <div style={{ background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"80px 32px", textAlign:"center", minHeight:480, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <Loader2 size={32} color="#34d399" style={{ animation:"spin 1.5s linear infinite", marginBottom:18 }}/>
              <h3 style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:6 }}>Scanning {lc} lines of {lang}</h3>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>AI is analyzing your code...</p>
            </div>
          )}

          {result && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* Score card */}
              <div style={{ background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:22, display:"flex", gap:20, alignItems:"center" }}>
                <ScoreRing score={result.healthScore}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em", marginBottom:6 }}>CODE HEALTH SCORE</div>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.7, marginBottom:10 }}>{result.summary}</p>
                  {result.positives?.map((p,i)=>(
                    <div key={i} style={{ display:"flex", gap:6, fontSize:11, color:"#34d399", marginTop:4 }}>
                      <CheckCircle size={11} style={{ marginTop:2, flexShrink:0 }}/> {p}
                    </div>
                  ))}
                </div>
              </div>

              <ReportButton
                scanType="debugger"
                title={`Debugger scan — ${lang} · ${result.stats?.totalIssues??0} issues`}
                resultData={result}
              />

              <div style={{ display:"flex", justifyContent:"space-between", padding:"0 2px" }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em" }}>{result.issues.length} ISSUES</span>
                <button onClick={()=>{ const a=result.issues.every(i=>exp[i.id]); setExp(a?{}:Object.fromEntries(result.issues.map(i=>[i.id,true]))) }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#34d399", fontFamily:"inherit" }}>
                  {result.issues.every(i=>exp[i.id])?"Collapse all":"Expand all"}
                </button>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {result.issues.sort((a,b)=>({critical:0,high:1,medium:2,low:3}[a.severity]??4)-({critical:0,high:1,medium:2,low:3}[b.severity]??4)).map(issue=>(
                  <IssueCard key={issue.id} issue={issue} open={!!exp[issue.id]} toggle={()=>toggle(issue.id)}/>
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
