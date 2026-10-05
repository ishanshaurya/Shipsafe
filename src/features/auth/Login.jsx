import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Github } from "lucide-react"
import { signUp, signInWithPassword, signInWithGitHub } from "./authService"
import Logo from "../../shared/components/Logo"
import Button from "../../shared/ui/Button"
import Card from "../../shared/ui/Card"
import Field from "../../shared/ui/Field"

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
        const { error } = await signUp(email, password)
        if (error) throw error
        setMessage("Check your email to confirm your account.")
      } else {
        const { error } = await signInWithPassword(email, password)
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
      const { error } = await signInWithGitHub()
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

        <Card pad>
          <Button variant="secondary" block onClick={handleGitHub} disabled={loading}>
            <Github size={18} aria-hidden="true" /> Continue with GitHub
          </Button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }} aria-hidden="true">
            <div style={{ flex: 1, height: 1, background: "var(--color-rule)" }} />
            <span className="small muted">or</span>
            <div style={{ flex: 1, height: 1, background: "var(--color-rule)" }} />
          </div>

          <form onSubmit={handleEmail} className="stack" noValidate={false}>
            <div>
              <Field id="login-email" label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" aria-describedby={error ? "login-error" : undefined} />
            </div>

            <div>
              <Field
                id="login-password" label="Password" type={showPw ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                aria-describedby={error ? "login-error" : "login-pw-hint"}
                action={
                  <Button variant="ghost" size="sm" aria-pressed={showPw} onClick={() => setShowPw(!showPw)}>
                    {showPw ? "Hide" : "Show"}
                  </Button>
                }
              />
              {!isLogin && <div id="login-pw-hint" className="hint">Use at least 6 characters.</div>}
            </div>

            {error && <div id="login-error" className="msg msg-error" role="alert"><div className="msg-title">{error}</div></div>}
            {message && <div className="msg" role="status"><div className="msg-title">{message}</div></div>}

            <Button type="submit" block loading={loading} disabled={!email || !password}>
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }} className="muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" className="link-btn" onClick={() => { setMode(isLogin ? "signup" : "login"); setError(null); setMessage(null) }}>
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link to="/" className="small">Back to ShipSafe</Link>
        </div>
      </div>
    </main>
  )
}
