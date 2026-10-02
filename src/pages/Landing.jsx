import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Bug, Search, KeyRound, Rocket, FlaskConical, ArrowRight, Github, Scale, Shield, Zap } from "lucide-react"
import Logo from "../components/Logo"
import { GradientShimmer } from "@/components/ui/gradient-shimmer"

const FEATURES = [
  { icon: Bug, title: "AI Code Debugger", desc: "Finds bugs, security holes, and vibe-code smells that linters miss. Credential leak detection built in.", color: "#ef4444", tag: "CODE", path: "/debugger" },
  { icon: Search, title: "Vibe-Code Audit", desc: "Full project health report. Security, quality, maintainability, AI-pattern detection — all scored.", color: "#f97316", tag: "CODE", path: "/audit" },
  { icon: Scale, title: "Regulation Tracker", desc: "Browse 14+ global AI laws. Know exactly which regulations apply to your deployment countries.", color: "#0ea5e9", tag: "LEGAL", path: "/regulations" },
  { icon: KeyRound, title: "Loophole Finder", desc: "Find legal grey areas before your competitors do. Know where enforcement is unclear.", color: "#a855f7", tag: "LEGAL", path: "/loopholes" },
  { icon: Rocket, title: "Deploy Checker", desc: "Catches missing env vars, CORS issues, security headers, and platform-specific gotchas.", color: "#34d399", tag: "DEPLOY", path: "/deploy-check" },
  { icon: FlaskConical, title: "Stress Tester", desc: "Simulate 10 to 10,000 concurrent users. Predicts which component breaks first.", color: "#eab308", tag: "DEPLOY", path: "/stress-test" },
]

export default function Landing() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef(null)

  useEffect(() => {
    const handleMouse = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("mousemove", handleMouse)
    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("mousemove", handleMouse)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .fu { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
        .fu1{animation-delay:0.1s} .fu2{animation-delay:0.2s} .fu3{animation-delay:0.3s} .fu4{animation-delay:0.4s} .fu5{animation-delay:0.6s}
        .nav-link { color: rgba(255,255,255,0.5); font-size:14px; text-decoration:none; transition:color 0.2s; font-weight:500; }
        .nav-link:hover { color:#fff; }
        .feat-card { background:#0a0a0a; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:28px; text-decoration:none; display:block; transition:all 0.3s; }
        .feat-card:hover { border-color:rgba(255,255,255,0.12); transform:translateY(-4px); background:#111; }
        .cta-btn { display:inline-flex; align-items:center; gap:8px; background:#34d399; color:#000; font-weight:700; font-size:15px; padding:14px 32px; border-radius:10px; text-decoration:none; transition:all 0.2s; }
        .cta-btn:hover { background:#2fbf8a; transform:translateY(-1px); }
        .sec-btn { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.7); font-weight:500; font-size:15px; padding:14px 32px; border-radius:10px; text-decoration:none; border:1px solid rgba(255,255,255,0.1); transition:all 0.2s; }
        .sec-btn:hover { background:rgba(255,255,255,0.1); color:#fff; }
        .tag-pill { display:inline-block; font-size:10px; font-weight:700; letter-spacing:0.1em; padding:4px 10px; border-radius:20px; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)",
        padding: "0 48px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo size={28} />
          <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>ShipSafe</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#pipeline" className="nav-link">How it works</a>
          <a href="https://github.com/ishanshaurya/shipsafe" target="_blank" rel="noreferrer" className="nav-link">GitHub</a>
          <Link to="/login" className="nav-link">Sign in</Link>
          <Link to="/dashboard" style={{ background: "#34d399", color: "#000", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", paddingTop: 60 }}>

        {/* Cursor-reactive background orbs */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          transition: "transform 0.1s ease-out",
        }}>
          <div style={{
            position: "absolute",
            top: "30%", left: "50%",
            width: 600, height: 600,
            background: "radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: `translate(-50%, -50%) translate(${mouse.x * 30}px, ${mouse.y * 20}px)`,
            transition: "transform 0.3s ease-out",
          }} />
          <div style={{
            position: "absolute",
            top: "60%", left: "30%",
            width: 400, height: 400,
            background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: `translate(-50%, -50%) translate(${mouse.x * -20}px, ${mouse.y * 15}px)`,
            transition: "transform 0.4s ease-out",
          }} />
        </div>

        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 100%)",
        }} />

        <div style={{ textAlign: "center", maxWidth: 900, padding: "0 40px", position: "relative", zIndex: 1 }}>

          {/* Badge */}
          <div className="fu fu1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 20, padding: "6px 16px", marginBottom: 40 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "float 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600, letterSpacing: "0.05em" }}>Now powered by Gemini 2.5 Flash</span>
          </div>

          {/* Headline */}
          <h1 className="fu fu2" style={{
            fontSize: "clamp(52px, 9vw, 96px)",
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            marginBottom: 32,
            transform: `translate(${mouse.x * 8}px, ${mouse.y * 4}px)`,
            transition: "transform 0.2s ease-out",
          }}>
            Don't just ship fast.
            <br />
            <GradientShimmer
              as="span"
              gradient="mint"
              easing="smooth"
              duration={1.6}
              spread={2.5}
              pauseBetween={1200}
              baseColor="#34d399"
              style={{ color: "#34d399" }}
            >
              Ship safe.
            </GradientShimmer>
          </h1>

          {/* Subtext */}
          <p className="fu fu3" style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.7,
            maxWidth: 580,
            margin: "0 auto 48px",
            fontWeight: 400,
          }}>
            The all-in-one AI toolkit that scans your code for bugs, checks legal compliance, and validates deployment readiness. Six tools. One pipeline.
          </p>

          {/* CTAs */}
          <div className="fu fu4" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/debugger" className="cta-btn">Start scanning → </Link>
            <Link to="/dashboard" className="sec-btn"><span>View dashboard</span></Link>
          </div>

          {/* Trust line */}
          <div className="fu fu5" style={{ marginTop: 48, display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
            {["Free tier · no credit card", "API keys never leave the server", "14+ countries covered"].map((t, i) => (
              <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#34d399" }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: "float 2s ease-in-out infinite" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>SCROLL</span>
          <div style={{ width: 1, height: 40, background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent)" }} />
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section id="pipeline" style={{ padding: "120px 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: "0.15em", marginBottom: 16 }}>THE PIPELINE</div>
            <h2 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Code. Legal. Deploy.
              <br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>In that order.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {[
              { num: "01", label: "CODE", q: "Is my code safe?", tools: ["AI Debugger", "Vibe-Code Audit"], color: "#ef4444" },
              { num: "02", label: "LEGAL", q: "Is my project legal?", tools: ["Regulation Tracker", "Loophole Finder"], color: "#a855f7" },
              { num: "03", label: "DEPLOY", q: "Am I ready to ship?", tools: ["Deploy Checker", "Stress Tester"], color: "#34d399" },
            ].map((stage, i) => (
              <div key={i} style={{
                background: i === 1 ? "#0a0a0a" : "transparent",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: i === 0 ? "16px 0 0 16px" : i === 2 ? "0 16px 16px 0" : "0",
                padding: "40px 32px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, letterSpacing: "0.15em", marginBottom: 12 }}>STAGE {stage.num}</div>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 8 }}>{stage.label}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginBottom: 24 }}>"{stage.q}"</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stage.tools.map((t, j) => (
                    <div key={j} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: stage.color }} /> {t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "120px 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 80 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: "0.15em", marginBottom: 16 }}>SIX TOOLS</div>
            <h2 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 600 }}>
              Everything you need.
              <br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Nothing you don't.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {FEATURES.map((f, i) => (
              <Link key={i} to={f.path} className="feat-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}12`, border: `1px solid ${f.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <f.icon size={18} color={f.color} />
                  </div>
                  <span className="tag-pill" style={{ background: `${f.color}10`, color: f.color, border: `1px solid ${f.color}20` }}>{f.tag}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{f.desc}</div>
                <div style={{ marginTop: 20, fontSize: 12, color: f.color, display: "flex", alignItems: "center", gap: 4 }}>
                  Try it <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "120px 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: "0.15em", marginBottom: 16 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 48 }}>
              Three steps.
              <br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Zero setup.</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { num: "01", title: "Paste your code or describe your system", desc: "No config files. No setup. Just paste and go." },
                { num: "02", title: "AI analyzes across every dimension", desc: "Bugs, security, legal compliance, deploy readiness — simultaneously." },
                { num: "03", title: "Get fixes, not just warnings", desc: "Every issue includes a concrete fix you can apply immediately." },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 24, padding: "28px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", minWidth: 28, paddingTop: 3 }}>{step.num}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo card */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
              AI Debugger · Live scan
            </div>
            {[
              { sev: "CRITICAL", color: "#ef4444", title: "SQL injection vulnerability", line: "L37" },
              { sev: "CRITICAL", color: "#ef4444", title: "🔑 Hardcoded API key detected", line: "L12" },
              { sev: "HIGH", color: "#f97316", title: "No error handling on DB query", line: "L54" },
              { sev: "MEDIUM", color: "#eab308", title: "Vibe-code: console.log in production", line: "L89" },
            ].map((issue, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: issue.color, background: `${issue.color}12`, padding: "3px 7px", borderRadius: 4, letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>{issue.sev}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{issue.title}</div>
                </div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{issue.line}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Health score</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>23</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: "23%", height: "100%", background: "#ef4444", borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "120px 48px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 24 }}>
            Ready to ship
            <br />
            <span style={{ color: "#34d399" }}>responsibly?</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.35)", marginBottom: 40, lineHeight: 1.7 }}>
            Start scanning in 30 seconds. No setup, no API key required for the demo.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/debugger" className="cta-btn">Start free scan <ArrowRight size={16} /></Link>
            <a href="https://github.com/ishanshaurya/shipsafe" target="_blank" rel="noreferrer" className="sec-btn"><Github size={16} /> View on GitHub</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "60px 48px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Logo size={24} />
                <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>ShipSafe</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", lineHeight: 1.7, maxWidth: 260 }}>
                Build, validate & deploy AI responsibly. The developer toolkit for shipping AI that works and complies.
              </p>
            </div>
            {[
              { heading: "Product", links: [["AI Debugger","/debugger"],["Vibe-Code Audit","/audit"],["Loophole Finder","/loopholes"],["Deploy Checker","/deploy-check"],["Stress Tester","/stress-test"]] },
              { heading: "Resources", links: [["Regulations","/regulations"],["Dashboard","/dashboard"]] },
              { heading: "Connect", links: [["GitHub","https://github.com/ishanshaurya/shipsafe"],["Sign in","/login"]] },
            ].map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 16 }}>{col.heading.toUpperCase()}</div>
                {col.links.map(([label, href], j) => (
                  href.startsWith("http")
                    ? <a key={j} href={href} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}>{label}</a>
                    : <Link key={j} to={href} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}>{label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            <span>Built by Shaurya Ishan</span>
            <span>© 2026 ShipSafe. Ship responsibly.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
