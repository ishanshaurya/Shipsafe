import { Link } from "react-router-dom"
import { Shield, Bug, Search, KeyRound, Rocket, FlaskConical, ArrowRight, Github, ChevronRight, Zap, Lock, Globe, Code2, Scale } from "lucide-react"

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE — Railway-inspired design
   
   Sections:
   1. Nav bar (sticky, glassmorphism)
   2. Hero (big headline + subtitle + CTAs + product screenshot)
   3. Pipeline (3-stage visual: Code → Legal → Deploy)
   4. Features (6 tools with descriptions)
   5. How it works (3 steps)
   6. Tech stack / trust bar
   7. CTA banner
   8. Footer
   ═══════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: Bug,
    title: "AI Code Debugger",
    desc: "Paste code, get instant analysis. Finds bugs, security vulnerabilities, and vibe-code smells that AI-generated code is known for.",
    color: "#ef4444",
    tag: "STAGE 1: CODE",
    path: "/debugger",
  },
  {
    icon: Search,
    title: "Vibe-Code Audit",
    desc: "Full project health report across 5 categories: Security, Code Quality, Maintainability, AI-Pattern Detection, and Deploy Readiness.",
    color: "#f97316",
    tag: "STAGE 1: CODE",
    path: "/audit",
  },
  {
    icon: Scale,
    title: "Regulation Tracker",
    desc: "Browse 14+ global AI regulations. Search, filter, and understand which laws apply to your AI project across jurisdictions.",
    color: "#0ea5e9",
    tag: "STAGE 2: LEGAL",
    path: "/regulations",
  },
  {
    icon: KeyRound,
    title: "Loophole Finder",
    desc: "Find legal grey areas in AI regulations. Know where the law is ambiguous, where enforcement is unclear, and what competitors might exploit.",
    color: "#a855f7",
    tag: "STAGE 2: LEGAL",
    path: "/loopholes",
  },
  {
    icon: Rocket,
    title: "Deploy Checker",
    desc: "Validate your deployment config before shipping. Catches missing env vars, CORS issues, security headers, and platform-specific gotchas.",
    color: "#22c55e",
    tag: "STAGE 3: DEPLOY",
    path: "/deploy-check",
  },
  {
    icon: FlaskConical,
    title: "Stress Tester",
    desc: "Simulate 10 to 10,000 concurrent users. Predicts which component breaks first and what the fix is. Realistic free-tier limit analysis.",
    color: "#eab308",
    tag: "STAGE 3: DEPLOY",
    path: "/stress-test",
  },
]

const STEPS = [
  { num: "01", title: "Paste your code or describe your system", desc: "No setup, no config files. Just paste and go." },
  { num: "02", title: "AI analyzes across multiple dimensions", desc: "Bugs, security, legal compliance, deploy readiness — all at once." },
  { num: "03", title: "Get actionable fixes, not just warnings", desc: "Every issue comes with a concrete fix you can apply immediately." },
]

const STACK = [
  { name: "React", icon: "⚛️" },
  { name: "Vite", icon: "⚡" },
  { name: "Supabase", icon: "🔋" },
  { name: "Gemini AI", icon: "✨" },
  { name: "Vercel", icon: "▲" },
  { name: "Tailwind", icon: "🎨" },
]

export default function Landing() {
  return (
    <div style={{ background: "#09090f", color: "#e2e8f0", minHeight: "100vh", fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(52,211,153,0.15); }
          50% { box-shadow: 0 0 40px rgba(52,211,153,0.25); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .fade-up { animation: fadeInUp 0.8s ease forwards; opacity: 0; }
        .fade-up-d1 { animation-delay: 0.1s; }
        .fade-up-d2 { animation-delay: 0.2s; }
        .fade-up-d3 { animation-delay: 0.3s; }
        .fade-up-d4 { animation-delay: 0.4s; }
        .fade-up-d5 { animation-delay: 0.5s; }
        .fade-in { animation: fadeIn 1s ease forwards; opacity: 0; }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .nav-link { color: #94a3b8; font-size: 14px; text-decoration: none; transition: color 0.2s; font-weight: 500; }
        .nav-link:hover { color: #e2e8f0; }
      `}</style>

      {/* ─── NAVBAR ─────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(9,9,15,0.8)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(52,211,153,0.06)",
        padding: "0 40px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1400, margin: "0 auto", width: "100%",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #34d399, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={16} color="#09090f" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>ShipSafe</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#stack" className="nav-link">Stack</a>
          <Link to="/login" className="nav-link">Sign in</Link>
          <Link to="/dashboard" style={{
            background: "linear-gradient(135deg, #34d399, #06b6d4)",
            color: "#09090f", fontWeight: 700, fontSize: 13,
            padding: "8px 20px", borderRadius: 8,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
            transition: "opacity 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            Dashboard <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ─── HERO ──────────────────────────────────────── */}
      <section style={{
        position: "relative", textAlign: "center",
        padding: "120px 40px 80px",
        background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(52,211,153,0.08) 0%, transparent 60%)",
        overflow: "hidden",
      }}>
        {/* Atmospheric glow orbs */}
        <div style={{ position: "absolute", top: -100, left: "20%", width: 400, height: 400, background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -50, right: "15%", width: 300, height: 300, background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          {/* Badge */}
          <div className="fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)",
            borderRadius: 100, padding: "6px 16px 6px 8px", marginBottom: 32,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "block", animation: "pulse-glow 2s ease infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399", letterSpacing: "0.02em" }}>Now powered by Gemini 2.5 Flash</span>
          </div>

          {/* Headline */}
          <h1 className="fade-up fade-up-d1" style={{
            fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900,
            lineHeight: 1.05, letterSpacing: "-0.035em",
            color: "#f1f5f9", marginBottom: 20,
          }}>
            Don't just ship fast.<br />
            <span style={{
              background: "linear-gradient(135deg, #34d399, #06b6d4, #a855f7)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "gradient-shift 4s ease infinite",
            }}>Ship safe.</span>
          </h1>

          {/* Subtitle */}
          <p className="fade-up fade-up-d2" style={{
            fontSize: "clamp(16px, 2vw, 20px)", color: "#64748b",
            lineHeight: 1.6, maxWidth: 560, margin: "0 auto 40px",
            fontWeight: 400,
          }}>
            The all-in-one AI toolkit that scans your code for bugs,
            checks legal compliance, and validates deployment readiness.
            Six tools. One pipeline.
          </p>

          {/* CTA buttons */}
          <div className="fade-up fade-up-d3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/debugger" style={{
              background: "linear-gradient(135deg, #34d399, #06b6d4)",
              color: "#09090f", fontWeight: 700, fontSize: 15,
              padding: "14px 32px", borderRadius: 10,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.3s", boxShadow: "0 4px 20px rgba(52,211,153,0.2)",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(52,211,153,0.3)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(52,211,153,0.2)" }}>
              Start Scanning <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" style={{
              background: "rgba(241,245,249,0.05)", border: "1px solid rgba(241,245,249,0.1)",
              color: "#e2e8f0", fontWeight: 600, fontSize: 15,
              padding: "14px 32px", borderRadius: 10,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.3s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(241,245,249,0.08)"; e.currentTarget.style.borderColor = "rgba(241,245,249,0.2)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(241,245,249,0.05)"; e.currentTarget.style.borderColor = "rgba(241,245,249,0.1)" }}>
              View Demo
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="fade-up fade-up-d4" style={{
            display: "flex", gap: 24, justifyContent: "center", marginTop: 32,
            fontSize: 12, color: "#475569",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={12} color="#34d399" /> Free tier — no credit card
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={12} color="#34d399" /> API keys never leave the server
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Globe size={12} color="#34d399" /> 14+ countries covered
            </span>
          </div>
        </div>

        {/* Product screenshot mockup */}
        <div className="fade-up fade-up-d5" style={{
          maxWidth: 1000, margin: "60px auto 0",
          borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(52,211,153,0.1)",
          background: "linear-gradient(180deg, rgba(15,22,40,0.8) 0%, rgba(9,9,15,0.9) 100%)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(52,211,153,0.05)",
        }}>
          {/* Browser chrome */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px", borderBottom: "1px solid rgba(241,245,249,0.05)",
            background: "rgba(15,22,40,0.6)",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.7 }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.7 }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.7 }} />
            </div>
            <div style={{
              flex: 1, textAlign: "center", fontSize: 11, color: "#475569",
              background: "rgba(241,245,249,0.03)", borderRadius: 6, padding: "4px 12px",
              maxWidth: 300, margin: "0 auto",
            }}>
              shipsafe-app.vercel.app/debugger
            </div>
          </div>
          {/* Placeholder for product screenshot */}
          <div style={{
            padding: "40px", minHeight: 400,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, rgba(15,22,40,0.4) 0%, rgba(9,9,15,0.6) 100%)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, width: "100%", maxWidth: 800 }}>
              {/* Mock code panel */}
              <div style={{ background: "rgba(8,12,22,0.6)", borderRadius: 12, padding: 20, border: "1px solid rgba(241,245,249,0.05)" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 12, letterSpacing: "0.1em" }}>INPUT</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
                  <div><span style={{ color: "#c084fc" }}>const</span> <span style={{ color: "#67e8f9" }}>password</span> = <span style={{ color: "#fbbf24" }}>'admin123'</span>;</div>
                  <div><span style={{ color: "#c084fc" }}>const</span> <span style={{ color: "#67e8f9" }}>query</span> = <span style={{ color: "#fbbf24" }}>"SELECT * WHERE id='"</span></div>
                  <div style={{ paddingLeft: 16 }}>+ <span style={{ color: "#67e8f9" }}>userId</span> + <span style={{ color: "#fbbf24" }}>"'"</span>;</div>
                  <div style={{ color: "#475569", marginTop: 8 }}>// no error handling</div>
                  <div style={{ color: "#475569" }}>// no input validation</div>
                </div>
              </div>
              {/* Mock results panel */}
              <div style={{ background: "rgba(8,12,22,0.6)", borderRadius: 12, padding: 20, border: "1px solid rgba(241,245,249,0.05)" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 12, letterSpacing: "0.1em" }}>ANALYSIS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>25</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>CRITICAL</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>8 issues found</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["SQL Injection Vulnerability", "Hardcoded Credentials", "No Error Handling"].map((issue, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94a3b8" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? "#ef4444" : i === 1 ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PIPELINE ──────────────────────────────────── */}
      <section style={{
        padding: "100px 40px", maxWidth: 1100, margin: "0 auto",
        borderTop: "1px solid rgba(241,245,249,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#34d399", letterSpacing: "0.15em", marginBottom: 12 }}>THE SHIPSAFE PIPELINE</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#f1f5f9" }}>
            Three stages. Six tools. One command.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { num: "01", stage: "CODE", question: "Is my code safe?", tools: ["AI Debugger", "Vibe-Code Audit"], color: "#0ea5e9", icon: Code2 },
            { num: "02", stage: "LEGAL", question: "Is my project legal?", tools: ["Regulation Tracker", "Loophole Finder"], color: "#f59e0b", icon: Scale },
            { num: "03", stage: "DEPLOY", question: "Am I ready to ship?", tools: ["Deploy Checker", "Stress Tester"], color: "#22c55e", icon: Rocket },
          ].map((step, i) => (
            <div key={i} className="hover-lift" style={{
              background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)",
              borderRadius: 16, padding: "32px 28px", position: "relative",
              transition: "all 0.3s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${step.color}30`}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(241,245,249,0.06)"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${step.color}12`, border: `1px solid ${step.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <step.icon size={16} color={step.color} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: "0.1em" }}>STAGE {step.num}</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>{step.stage}</h3>
              <p style={{ fontSize: 14, color: "#64748b", fontStyle: "italic", marginBottom: 16 }}>"{step.question}"</p>
              <div style={{ display: "flex", gap: 8 }}>
                {step.tools.map((tool, j) => (
                  <span key={j} style={{
                    fontSize: 11, fontWeight: 600, color: step.color,
                    background: `${step.color}10`, border: `1px solid ${step.color}20`,
                    padding: "5px 12px", borderRadius: 6,
                  }}>{tool}</span>
                ))}
              </div>
              {i < 2 && <div style={{ position: "absolute", right: -16, top: "50%", transform: "translateY(-50%)", color: "#1e293b", fontSize: 20, fontWeight: 300 }}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────────── */}
      <section id="features" style={{
        padding: "80px 40px 100px", maxWidth: 1100, margin: "0 auto",
        borderTop: "1px solid rgba(241,245,249,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#34d399", letterSpacing: "0.15em", marginBottom: 12 }}>FEATURES</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#f1f5f9" }}>
            Every tool a developer needs before shipping AI
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <Link key={i} to={f.path} className="hover-lift" style={{
              background: "rgba(241,245,249,0.02)", border: "1px solid rgba(241,245,249,0.06)",
              borderRadius: 16, padding: "28px 24px", textDecoration: "none",
              transition: "all 0.3s", display: "flex", flexDirection: "column",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${f.color}30`; e.currentTarget.style.background = `${f.color}04` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(241,245,249,0.06)"; e.currentTarget.style.background = "rgba(241,245,249,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${f.color}10`, border: `1px solid ${f.color}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <f.icon size={18} color={f.color} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: "0.1em" }}>{f.tag}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, flex: 1 }}>{f.desc}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 16, fontSize: 12, fontWeight: 600, color: f.color }}>
                Try it <ChevronRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: "80px 40px 100px", maxWidth: 900, margin: "0 auto",
        borderTop: "1px solid rgba(241,245,249,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#34d399", letterSpacing: "0.15em", marginBottom: 12 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#f1f5f9" }}>
            Three steps. Zero setup.
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
          {/* Vertical timeline line */}
          <div style={{
            position: "absolute", left: 24, top: 24, bottom: 24, width: 2,
            background: "linear-gradient(180deg, #34d399 0%, rgba(52,211,153,0.1) 100%)",
          }} />

          {STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 28, padding: "28px 0", position: "relative" }}>
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: i === 0 ? "linear-gradient(135deg, #34d399, #06b6d4)" : "rgba(241,245,249,0.04)",
                border: i === 0 ? "none" : "1px solid rgba(241,245,249,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: i === 0 ? "#09090f" : "#475569",
                flexShrink: 0, zIndex: 1,
              }}>
                {step.num}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TECH STACK ────────────────────────────────── */}
      <section id="stack" style={{
        padding: "60px 40px", maxWidth: 1100, margin: "0 auto",
        borderTop: "1px solid rgba(241,245,249,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", letterSpacing: "0.15em" }}>BUILT WITH</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          {STACK.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#475569", fontWeight: 500 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span> {s.name}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA BANNER ────────────────────────────────── */}
      <section style={{
        padding: "80px 40px", maxWidth: 800, margin: "0 auto", textAlign: "center",
        borderTop: "1px solid rgba(241,245,249,0.04)",
      }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 800, color: "#f1f5f9", marginBottom: 16, letterSpacing: "-0.02em" }}>
          Ready to ship responsibly?
        </h2>
        <p style={{ fontSize: 16, color: "#64748b", marginBottom: 32, lineHeight: 1.7 }}>
          Start scanning your code in 30 seconds. No setup, no API key needed for the demo.
        </p>
        <Link to="/debugger" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg, #34d399, #06b6d4)",
          color: "#09090f", fontWeight: 700, fontSize: 16,
          padding: "16px 40px", borderRadius: 12,
          textDecoration: "none",
          boxShadow: "0 4px 30px rgba(52,211,153,0.2)",
          transition: "all 0.3s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(52,211,153,0.3)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 30px rgba(52,211,153,0.2)" }}>
          Start Free Scan <ArrowRight size={18} />
        </Link>
      </section>

      {/* ─── FOOTER ────────────────────────────────────── */}
      <footer style={{
        padding: "60px 40px 40px", maxWidth: 1100, margin: "0 auto",
        borderTop: "1px solid rgba(241,245,249,0.04)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #34d399, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={14} color="#09090f" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>ShipSafe</span>
            </div>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, maxWidth: 280 }}>
              Build, validate & deploy AI responsibly. The developer toolkit for shipping AI that works and complies.
            </p>
          </div>

          {/* Product */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 16 }}>Product</div>
            {[
              { label: "AI Debugger", path: "/debugger" },
              { label: "Vibe-Code Audit", path: "/audit" },
              { label: "Loophole Finder", path: "/loopholes" },
              { label: "Deploy Checker", path: "/deploy-check" },
              { label: "Stress Tester", path: "/stress-test" },
            ].map((l, i) => (
              <Link key={i} to={l.path} style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
                onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Resources */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 16 }}>Resources</div>
            {[
              { label: "Regulations", path: "/regulations" },
              { label: "Dashboard", path: "/dashboard" },
              { label: "Documentation", path: "#" },
            ].map((l, i) => (
              <Link key={i} to={l.path} style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
                onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Connect */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 16 }}>Connect</div>
            <a href="https://github.com/ishanshaurya/shipsafe" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
              onMouseLeave={e => e.currentTarget.style.color = "#475569"}>
              <Github size={14} /> GitHub
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 24, borderTop: "1px solid rgba(241,245,249,0.04)",
          fontSize: 12, color: "#334155",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg, #34d399, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={10} color="#09090f" strokeWidth={3} />
            </div>
            <span>Built by Shaurya Ishan</span>
          </div>
          <span>© 2026 ShipSafe. Ship responsibly.</span>
        </div>
      </footer>
    </div>
  )
}
