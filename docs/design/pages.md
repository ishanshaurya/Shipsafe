# Layout and pages

Tokens, verdicts and motion: [system.md](system.md). Components and states: [components.md](components.md).

## App shell (signed-in pages)
```
>=1024                                      <1024
+--------+---------------------------+      +-----------------------------+
| Logo   |  page content (max 1120)  |      | [menu]  ShipSafe     [user] |
|        |                           |      +-----------------------------+
| Dash   |                           |      |  page content, 16px gutters |
|        |                           |      +-----------------------------+
| Code review                        |      menu opens a drawer with the
|  Debugger                          |      same rail content
|  Audit                             |
| AI regulation                      |
|  Regulations                       |
|  Loopholes                         |
|        |                           |
| user@  |                           |
| Sign out                           |
+--------+---------------------------+
```
Rail: 240px, `--ink` background, light text, active item marked by a blue left bar and a filled row. Group headings are sentence case, `--code-muted`. Replaces the current "BUILD · VALIDATE · DEPLOY" tagline; the rail has no tagline.

## Landing (public)
Job: tell a developer what it checks and get them to the first scan.
```
 ShipSafe                                     Sign in   [Open dashboard]
 -----------------------------------------------------------------------
 Know what's blocking your AI        |  Sample review          Blocked 38
 project before you ship it.         |  --------------------------------
                                     |  [pennant] Hardcoded API key   crit
 Paste code or a repo for a scored   |  [pennant] No input validation high
 review. Describe your system to see |  [square ] Missing error handling med
 which AI regulations and legal      |  [flag   ] Dependencies pinned   ok
 grey areas apply.                   |  (flags hoist on load, once)
 [Start a scan]  [See a sample]      |
 -----------------------------------------------------------------------
 What it checks              (ruled list, not cards)
  Code review      AI Debugger     Bugs, security holes and vibe-code smells in pasted code or a GitHub repo
                   Vibe-Code Audit Scored report on security, quality, maintainability, AI patterns, deploy readiness
  AI regulation    Regulations     Laws by topic, who is at risk, a checklist you can act on
                   Loophole Finder Where the rules are ambiguous for your system and countries
 -----------------------------------------------------------------------
 How a scan works  (numbered: it is a real sequence)
  1 Paste code, import a repo, or describe your system
  2 Get a verdict and a list of findings, worst first
  3 Apply the fix shown with each finding, or share the report link
 -----------------------------------------------------------------------
 [Start a scan]                                       footer: GitHub, Sign in
```
- Hero memorable element: the sample review panel with three flags hoisting once. It is real output shape, not decoration.
- Left-aligned headline; no hero stat, no gradient. Hero panel is a white square-cornered panel with a 1px rule.
- Nav: logo, Sign in, Open dashboard. Add a mobile menu (currently none).
- Copy to confirm before shipping: "Free tier · no credit card", "14+ countries covered" (claims not verified in code); "Your API keys stay on the server" is verified (`GEMINI_API_KEY` etc. are server-only).
- Open: the "See a sample" link needs a seeded public report slug. Until one exists, scroll to the sample panel.

## Login
Centered single column (the only centered layout), 400px, paper background.
- Heading "Sign in" / "Create your account" with a text toggle; email, password with show toggle; primary button; "Continue with GitHub" secondary button (exists in code).
- Errors inline under the field or form, saying what to change. Success on signup: "Check your email to confirm your account."
- Planned (backlog): "Forgot password" link; no reset flow exists today.

## Dashboard
```
 Dashboard
 +---------------------------------------------+
 | [flag] 74  Held                             |   Ship-readiness
 | Based on your latest Debugger, Audit and    |
 | Loopholes scans.                            |
 |  AI Debugger     82 [flag] Cleared  2d ago  |
 |  Vibe-Code Audit 61 [flag] Held     2d ago  |
 |  Loophole Finder Not scanned yet   [Run]    |
 +---------------------------------------------+
 Recent scans (ledger)
  [flag] Express.js REST API   AI Debugger   9 issues   2h ago
  ...
 Run a tool   Code review: Debugger, Audit    AI regulation: Regulations, Loopholes
```
- Readiness weights stay debugger 25 / audit 20 / loopholes 25, normalized over what is scanned; the sentence names the tools actually included.
- States: loading skeleton rows; empty "No scans yet. Run the AI Debugger on a file to get your first score." with the button; error "Couldn't load your scan history. Reload to try again."
- Old `deploy-check` rows (if any) appear in Recent scans with a default color; no tool-specific rendering remains. The `MOCK_SCANS` logged-out fallback is unreachable because Dashboard is behind the login redirect: remove or decide on a public demo.

## Tool pages (Debugger, Audit, Loopholes)
```
>=1024: input 5/12 | result 7/12 (sticky header)        <1024: stacked
 AI Debugger                                  
 Find bugs, security holes and vibe-code smells.
 +--------------------+  +--------------------------------+
 | Import from GitHub |  | Blocked  38   9 issues         |  verdict banner
 | [repo url] [Import]|  | Summary sentence.              |
 | Language [v] Context|  | Filter: All  Security  Quality |  (Audit only)
 | +----------------+ |  |  [flag] Hardcoded key  critical v|
 | | code (ink)     | |  |  [flag] ...                    |
 | +----------------+ |  | What's working (Debugger)      |
 | [Run review] Sample|  | Next steps                     |
 +--------------------+  | [Create report link]           |
                         +--------------------------------+
```
- **Debugger:** GitHub import + file picker (selected count and size), language, context, editor, streaming output while running, "What's working", "Similar to earlier scans".
- **Audit:** same import; auto-runs after import (kept); five category scores as flagged rows; category filter; "N lines analyzed" in the banner.
- **Loopholes:** description field; countries as checkable chips; findings are grey areas (regulation, country, risk flag, description, how it is exploited, recommendation), then defenses and upcoming changes. Risk is inverted for the verdict.
- Findings: critical/high open by default; each opens to detail, fix (CodePanel when it is code), Copy fix.
- Result area while idle shows a muted example so the layout does not jump.

## Regulations
- Header, search field with "Search regulations", topic chips (example topics from the current page).
- Result: coverage summary (regulated / draft / unregulated countries as three plain lists), then regulation ledger rows: name, country, year, status (Active/Draft/Proposed), severity flag; expand for summary, who is at risk, developer checklist (copyable), source link.
- **The live lookup silently falls back to sample data on failure.** Design requirement: show a Banner "Showing sample data because the live lookup failed" so users never mistake it for current law.
- Remove the rotating cycling text (motion rule). Saving searches to history is a backlog item.

## Report (public, no rail)
Document layout, 720px column. Header: logo and "Run your own scan". Title, Flag + score + scan type + date, then the same ledger components in read-only mode. Footer: "Generated by ShipSafe". Not found: "This report doesn't exist or is no longer shared." with a link home. Loading: skeleton. An old `deploy-check` report falls through to a raw JSON dump.

## 404
Plain paper page: "Page not found", "This address doesn't match a page. Go to ShipSafe." One link. No decoration.

## Responsive
Breakpoints 480, 768, 1024, 1280. Rail is a drawer below 1024. Tool pages stack below 1024. Content gutters 16px (<768), 32px (≥768). Check 375px: no horizontal scroll, tap targets ≥44px, code panels scroll inside.
