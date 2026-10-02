import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Github, Loader2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import Logo from "../components/Logo"

/* ═══════════════════════════════════════════════════════════
   LOGIN / SIGNUP PAGE — Supabase Auth

   Supports: Email + password, GitHub OAuth
   After login, redirects to /dashboard
   ═══════════════════════════════════════════════════════════ */

export default function Login() {
  const [mode, setMode] = useState("login") // login | signup
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const navigate = useNavigate()

  const handleEmail = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage("Check your email to confirm your account.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate("/dashboard")
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleGitHub = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: window.location.origin + "/dashboard" }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const isLogin = mode === "login"

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--color-ink)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}>
            <Logo size={32} tone="light" />
            ShipSafe
          </Link>
          <h1 className="display" style={{ fontSize: 40, marginTop: 24 }}>{isLogin ? "Sign in" : "Create your account"}</h1>
        </div>

        <div className="panel panel-pad">
          <button type="button" className="btn btn-secondary btn-block" onClick={handleGitHub} disabled={loading}>
            <Github size={18} aria-hidden="true" /> Continue with GitHub
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }} aria-hidden="true">
            <div style={{ flex: 1, height: 1, background: "var(--color-rule)" }} />
            <span className="small muted">or</span>
            <div style={{ flex: 1, height: 1, background: "var(--color-rule)" }} />
          </div>

          <form onSubmit={handleEmail} className="stack" noValidate={false}>
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input id="login-email" className="field" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" aria-describedby={error ? "login-error" : undefined} />
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="field-row">
                <input id="login-password" className="field" type={showPw ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} minLength={6} aria-describedby={error ? "login-error" : "login-pw-hint"} />
                <button type="button" className="btn btn-ghost btn-sm" aria-pressed={showPw} onClick={() => setShowPw(!showPw)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {!isLogin && <div id="login-pw-hint" className="hint">Use at least 6 characters.</div>}
            </div>

            {error && <div id="login-error" className="msg msg-error" role="alert"><div className="msg-title">{error}</div></div>}
            {message && <div className="msg" role="status"><div className="msg-title">{message}</div></div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !email || !password}>
              {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }} className="muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" className="link-btn" onClick={() => { setMode(isLogin ? "signup" : "login"); setError(null); setMessage(null) }}>
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link to="/" className="small">Back to ShipSafe</Link>
        </div>
      </div>
    </main>
  )
}
