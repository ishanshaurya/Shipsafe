import { Link } from "react-router-dom"
import Logo from "../components/Logo"
import Flag from "../components/Flag"
import { TOOL_GROUPS } from "../utils/toolRegistry"

const GITHUB_URL = "https://github.com/ishanshaurya/shipsafe"

const SAMPLE_FINDINGS = [
  { verdict: "blocked", title: "Hardcoded API key", file: "server/db.js:12", severity: "Critical" },
  { verdict: "blocked", title: "No input validation on /api/users", file: "routes/users.js:37", severity: "High" },
  { verdict: "held", title: "Missing error handling on DB query", file: "routes/users.js:54", severity: "Medium" },
  { verdict: "cleared", title: "Dependencies pinned", file: "package.json", severity: "Passed" },
]

const STEPS = [
  "Paste code, import a repo, or describe your system",
  "Get a verdict and a list of findings, worst first",
  "Apply the fix shown with each finding, or share the report link",
]

export default function Landing() {
  return (
    <div className="ls-root">
      <style>{`
        .ls-root {
          --focus-ring: var(--color-signal-blue);
          background: var(--color-paper);
          color: var(--color-ink);
          font-family: var(--font-sans);
          line-height: 1.55;
          min-height: 100vh;
        }
        .ls-root a { color: inherit; }
        .ls-skip { position: absolute; left: 16px; top: -48px; background: var(--color-ink); color: var(--color-code-text) !important; padding: 10px 16px; border-radius: var(--radius-control); z-index: 10; }
        .ls-skip:focus { top: 12px; }

        .ls-wrap { max-width: 1120px; margin: 0 auto; padding: 0 32px; }
        .ls-nav { border-bottom: 1px solid var(--color-rule); }
        .ls-nav .ls-wrap { display: flex; align-items: center; justify-content: space-between; height: 68px; }
        .ls-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; font-family: var(--font-display); font-weight: 800; font-size: 26px; letter-spacing: 0; }
        .ls-nav-actions { display: flex; align-items: center; gap: 8px; }

        .ls-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 20px; border-radius: var(--radius-control); font-size: 16px; font-weight: 600; text-decoration: none; border: 1px solid transparent; transition: background var(--dur-fast), border-color var(--dur-fast); }
        .ls-btn-primary { background: var(--color-signal-blue); color: #fff !important; }
        .ls-btn-primary:hover { background: #1a50a0; }
        .ls-btn-secondary { border-color: var(--color-ink); color: var(--color-ink); }
        .ls-btn-secondary:hover { background: var(--color-surface); }
        .ls-btn-ghost { color: var(--color-ink); }
        .ls-btn-ghost:hover { background: var(--color-surface); }

        .ls-display { font-family: var(--font-display); font-weight: 800; letter-spacing: 0; line-height: 1.05; }

        .ls-hero { padding: 80px 0 96px; }
        .ls-hero .ls-wrap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 480px); gap: 64px; align-items: start; }
        .ls-hero h1 { font-size: 64px; max-width: 12em; margin-bottom: 24px; }
        .ls-lede { font-size: 18px; color: var(--color-muted); max-width: 52ch; margin-bottom: 32px; }
        .ls-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }

        .ls-panel { background: var(--color-surface); border: 1px solid var(--color-rule); }
        .ls-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; border-bottom: 1px solid var(--color-rule); }
        .ls-panel-title { font-size: 14px; color: var(--color-muted); }
        .ls-panel-name { font-size: 16px; font-weight: 600; }
        .ls-verdict { display: flex; align-items: center; gap: 12px; }
        .ls-verdict-score { font-size: 48px; }
        .ls-verdict-word { font-size: 24px; color: var(--color-pennant-red-text); }
        .ls-finding { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--color-rule); }
        .ls-finding:last-child { border-bottom: 0; }
        .ls-finding-title { font-weight: 500; }
        .ls-finding-file { font-family: var(--font-mono); font-size: 13px; color: var(--color-muted); overflow-wrap: anywhere; }
        .ls-finding-sev { font-size: 14px; color: var(--color-muted); }

        .ls-staff { position: relative; width: 30px; height: 32px; overflow: hidden; border-left: 2px solid var(--color-ink); padding-left: 4px; }
        .ls-staff svg { display: block; animation: ls-hoist 700ms var(--ease-out) both; animation-delay: var(--delay, 0ms); }
        @keyframes ls-hoist { from { transform: translateY(110%); } to { transform: translateY(0); } }

        .ls-section { padding: 80px 0; border-top: 1px solid var(--color-rule); }
        .ls-section h2 { font-size: 40px; margin-bottom: 40px; }

        .ls-ledger { list-style: none; border-top: 1px solid var(--color-rule); }
        .ls-tool-row { display: grid; grid-template-columns: 200px 240px minmax(0, 1fr); gap: 24px; padding: 24px 0; border-bottom: 1px solid var(--color-rule); text-decoration: none; align-items: baseline; }
        .ls-tool-group { color: var(--color-muted); font-size: 14px; }
        .ls-tool-name { font-family: var(--font-display); font-weight: 700; font-size: 28px; line-height: 1.1; }
        .ls-tool-row:hover .ls-tool-name { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; }
        .ls-tool-desc { color: var(--color-muted); max-width: 60ch; }

        .ls-steps { list-style: none; border-top: 1px solid var(--color-rule); max-width: 760px; }
        .ls-step { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 16px; padding: 24px 0; border-bottom: 1px solid var(--color-rule); align-items: baseline; }
        .ls-step-num { font-family: var(--font-display); font-weight: 800; font-size: 40px; line-height: 1; color: var(--color-signal-blue); }
        .ls-step-text { font-size: 20px; font-weight: 500; max-width: 40ch; }

        .ls-final .ls-wrap { display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
        .ls-final h2 { margin-bottom: 12px; }
        .ls-final p { color: var(--color-muted); max-width: 52ch; }

        .ls-footer { border-top: 1px solid var(--color-rule); padding: 32px 0; font-size: 14px; color: var(--color-muted); }
        .ls-footer .ls-wrap { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ls-footer nav { display: flex; gap: 24px; }

        @media (max-width: 1023px) {
          .ls-hero .ls-wrap { grid-template-columns: minmax(0, 1fr); gap: 48px; }
          .ls-tool-row { grid-template-columns: 160px minmax(0, 1fr); }
          .ls-tool-desc { grid-column: 2; }
        }
        @media (max-width: 767px) {
          .ls-wrap { padding: 0 16px; }
          .ls-hero { padding: 48px 0 64px; }
          .ls-hero h1 { font-size: 44px; }
          .ls-section { padding: 56px 0; }
          .ls-section h2 { font-size: 32px; margin-bottom: 32px; }
          .ls-panel-head, .ls-finding { padding-left: 16px; padding-right: 16px; }
          .ls-finding { grid-template-columns: 30px minmax(0, 1fr); }
          .ls-finding-sev { grid-column: 2; }
          .ls-tool-row { grid-template-columns: minmax(0, 1fr); gap: 4px; }
          .ls-tool-desc { grid-column: 1; }
          .ls-step { grid-template-columns: 40px minmax(0, 1fr); }
          .ls-step-text { font-size: 18px; }
        }
        @media (max-width: 479px) {
          .ls-brand { font-size: 22px; }
          .ls-btn-ghost { padding: 0 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-staff svg { animation: none; }
        }
      `}</style>

      <a href="#main" className="ls-skip">Skip to content</a>

      <header className="ls-nav">
        <div className="ls-wrap">
          <Link to="/" className="ls-brand">
            <Logo size={30} tone="light" />
            ShipSafe
          </Link>
          <nav className="ls-nav-actions" aria-label="Account">
            <Link to="/login" className="ls-btn ls-btn-ghost">Sign in</Link>
            <Link to="/dashboard" className="ls-btn ls-btn-primary">Open dashboard</Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="ls-hero">
          <div className="ls-wrap">
            <div>
              <h1 className="ls-display">Know what's blocking your AI project before you ship it.</h1>
              <p className="ls-lede">
                Paste code or import a GitHub repo for a scored review. Describe your system to see which AI regulations and legal grey areas apply.
              </p>
              <div className="ls-cta-row">
                <Link to="/debugger" className="ls-btn ls-btn-primary">Start a scan</Link>
                <a href="#sample" className="ls-btn ls-btn-secondary">See a sample</a>
              </div>
            </div>

            <div id="sample" className="ls-panel" role="group" aria-label="Sample review">
              <div className="ls-panel-head">
                <div>
                  <div className="ls-panel-title">Sample review</div>
                  <div className="ls-panel-name">Express REST API</div>
                </div>
                <div className="ls-verdict">
                  <Flag verdict="blocked" size={48} />
                  <span className="ls-display ls-verdict-score">38</span>
                  <span className="ls-display ls-verdict-word">Blocked</span>
                </div>
              </div>
              <ul style={{ listStyle: "none" }}>
                {SAMPLE_FINDINGS.map((f, i) => (
                  <li key={f.title} className="ls-finding">
                    <span className="ls-staff" style={{ "--delay": `${i * 120}ms` }}>
                      <Flag verdict={f.verdict} size={24} labelled />
                    </span>
                    <div>
                      <div className="ls-finding-title">{f.title}</div>
                      <div className="ls-finding-file">{f.file}</div>
                    </div>
                    <span className="ls-finding-sev">{f.severity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="ls-section" aria-labelledby="checks-heading">
          <div className="ls-wrap">
            <h2 id="checks-heading" className="ls-display">What it checks</h2>
            <ul className="ls-ledger">
              {TOOL_GROUPS.flatMap(({ group, tools }) =>
                tools.map((t, i) => (
                  <li key={t.path}>
                    <Link to={t.path} className="ls-tool-row">
                      <span className="ls-tool-group">{i === 0 ? group : ""}</span>
                      <span className="ls-tool-name">{t.name}</span>
                      <span className="ls-tool-desc">{t.desc}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="ls-section" aria-labelledby="steps-heading">
          <div className="ls-wrap">
            <h2 id="steps-heading" className="ls-display">How a scan works</h2>
            <ol className="ls-steps">
              {STEPS.map((text, i) => (
                <li key={text} className="ls-step">
                  <span className="ls-step-num" aria-hidden="true">{i + 1}</span>
                  <span className="ls-step-text">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="ls-section ls-final" aria-labelledby="final-heading">
          <div className="ls-wrap">
            <div>
              <h2 id="final-heading" className="ls-display">Run your first scan</h2>
              <p>Your API keys stay on the server and never reach the browser.</p>
            </div>
            <Link to="/debugger" className="ls-btn ls-btn-primary">Start a scan</Link>
          </div>
        </section>
      </main>

      <footer className="ls-footer">
        <div className="ls-wrap">
          <span>Built by Shaurya Ishan</span>
          <nav aria-label="Footer">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
            <Link to="/login">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
