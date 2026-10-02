# ShipSafe

**Build, Validate & Deploy AI Responsibly**

*Don't just ship fast. Ship safe.*

ShipSafe is a developer toolkit for building and validating AI projects responsibly. It answers two questions: **Is my code safe?** and **Is my project legal?**

**Live Demo:** [shipsafe-app.vercel.app](https://shipsafe-app.vercel.app)

---

## Features

### AI Code Debugger
Paste any code and get an instant AI analysis covering bugs, security vulnerabilities, and **vibe-code smells** — patterns unique to AI-generated code that real developers wouldn't write (hardcoded secrets, no error handling, hallucinated imports, console.log everywhere). Supports **streaming responses** and **GitHub repo scanning** — paste a repo URL to fetch and analyze files automatically.

<!-- ![AI Debugger Screenshot](screenshots/debugger.png) -->

### Vibe-Code Audit
Goes beyond single-file debugging. Paste your entire project structure or connect a **GitHub repository** and get a **scored report card** across 5 categories: Security, Code Quality, Maintainability, AI-Pattern Detection, and Deployment Readiness.

<!-- ![Vibe-Code Audit Screenshot](screenshots/audit.png) -->

### Loophole Finder
Describe your AI system and select target deployment countries. The AI cross-references regulation databases to find **legal grey areas** — where the law is ambiguous, enforcement is unclear, or competitors might exploit gaps. References real regulations: EU AI Act, India's DPDP Act, US Executive Order on AI, and more.

<!-- ![Loophole Finder Screenshot](screenshots/loopholes.png) -->

### Regulation Explorer
Topic-driven global regulation explorer. Pick a topic (Privacy, Deepfakes, Bias, etc.) and get AI-surfaced regulations, real-world risks, country coverage, and a developer checklist. Powered by Gemini 2.5 Flash.

### Dashboard
Track all your scans in one place. Shows scan history, scores, issue counts, a unified **Ship-Readiness Score**, and quick actions to every tool. Logged-in users get persistent scan history via Supabase. **Cross-tool suggestions** recommend the next best scan based on your results.

<!-- ![Dashboard Screenshot](screenshots/dashboard.png) -->

### Shareable Reports
Every tool page includes a **Report** button that generates a public link (`/report/:slug`). Share scan results with teammates or stakeholders without requiring a login.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite + React Router |
| **Styling** | Tailwind CSS + custom dark theme |
| **Backend/DB** | Supabase (Auth + PostgreSQL + Row Level Security) |
| **AI Engine** | Google Gemini 2.5 Flash |
| **Hosting** | Vercel (free tier) |
| **API Security** | Vercel Serverless Functions (API keys never reach the browser) |
| **Testing/CI** | Vitest (unit tests) + GitHub Actions (lint, test, build on every PR) |

---

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   React Frontend │──POST──▶│  /api/gemini      │──────▶  │  Gemini 2.5  │
│   (Vite + React  │         │  (Vercel          │         │  Flash       │
│    Router)       │◀──JSON──│   Serverless)     │◀──────  │              │
└──────────────────┘         └──────────────────┘         └──────────────┘
        │ if (user logged in)
        └──── save scan ────▶  Supabase (PostgreSQL + RLS)
```

**Key design decisions:**
- **Serverless proxy pattern** — React calls `/api/gemini`, the serverless function adds the API key and forwards to Gemini. API keys never appear in frontend code.
- **Service layer** — `scanService.js` centralizes all AI calls. One function (`callAI`) handles prompt building, fetching, JSON parsing, and validation for all 6 tools.
- **Server-side auth on every AI call** — `/api/gemini` verifies the caller's Supabase JWT before doing anything else, so the endpoint can't be reached by an unauthenticated request regardless of what the frontend does or doesn't enforce.
- **Row Level Security** — Supabase RLS ensures users can only see their own scan history, and the same RLS policies scope the rate-limit counter (see below) to `auth.uid()`.
- **Regulations page** — uses live Gemini queries with in-memory caching and schema normalization — no static database.

See [Engineering Notes](#engineering-notes) for two bugs found and fixed while building this.

---

## API Endpoints

All serverless routes live under `/api/` and run on Vercel only (not available via `npm run dev` alone).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/gemini` | POST | AI proxy — forwards tool prompts to Gemini 2.5 Flash. Supports streaming on Debugger. Requires a valid Supabase session (`Authorization: Bearer <access_token>`); rate-limited to 10 req/min per authenticated user, persisted in Postgres. |
| `/api/github` | POST | Fetches repo file tree and contents via GitHub Trees API for Debugger and Audit scans. |
| `/api/embed` | POST | Generates vector embeddings for scan results (pgvector similarity search). |

**Example request** (`/api/gemini`):
```json
{
  "tool": "debugger",
  "userPrompt": "Review this code for security issues...",
  "stream": false
}
```

Allowed `tool` values: `debugger`, `audit`, `loopholes`, `regulations`.

---

## Engineering Notes

Two real bugs found and fixed after the product was already shipped.

### Half the "AI" tools weren't calling the AI

`scanService.js` has one function, `callAI`, that every tool is supposed to route through — it builds the prompt, calls `/api/gemini`, parses the JSON, and validates the response against a per-tool schema. Debugger and Stress Test used it correctly. Audit, Deploy Check, and Loophole Finder didn't: each had a page-local `getMock*()` function doing rule-based regex/string matching against the input, dressed up to look like AI output.

The schemas for those three tools already existed in `callAI`'s validator and were fully correct — nothing was ever calling them. Wiring the pages up to the real path wasn't a one-line fix, though: the mock functions and the AI response schema had diverged. Audit's mock returned five UI-specific category keys (`security`, `quality`, `maintainability`, `aiPatterns`, `deployReady`) with per-issue `severity`/`fix` fields; the AI schema had different category names entirely and only returned issues as plain strings. Fixing it meant reconciling both sides — rewriting the AI prompt schemas to match what the UI actually needed, and adding a thin normalization layer (mirroring a pattern already used for the Regulations tool) so the pages didn't have to change.

**Root cause:** a fallback path built for local development/demo mode never got removed once the real integration landed, and there was no test or type check anywhere that would have caught three tools silently diverging from the module that was supposed to be their only entry point.

### The login wall was client-side only

While testing the fix above, `curl -X POST /api/gemini` with no auth header returned a valid Gemini response — no login required, despite every tool page being wrapped in a `<ProtectedRoute>` in the React Router config. `ProtectedRoute` redirects an unauthenticated browser to `/login`; it does nothing to the API itself. Anyone with the URL could call the AI proxy directly and consume the (metered, billed) Gemini quota.

Fixed by verifying the caller's Supabase JWT server-side in `/api/gemini` before any other work happens, and rebuilding rate limiting around it: instead of Vercel's in-memory, per-IP counter (which reset on every cold start and treated everyone behind the same NAT as one user), the limiter is now a `rate_limits` table in the existing Supabase Postgres database, incremented atomically per `auth.uid()` via a `SECURITY INVOKER` Postgres function — so it's enforced through RLS as the calling user, not a service-role bypass, and it survives restarts.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- A [Google AI Studio](https://aistudio.google.com) API key (free tier)

### Setup

```bash
# Clone the repo
git clone https://github.com/ishanshaurya/shipsafe.git
cd shipsafe

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

Add your keys to `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_key
```

> **Note:** `GEMINI_API_KEY` has no `VITE_` prefix — it runs server-side only and is never exposed to the browser.

Apply the database migrations in `supabase/migrations/` to your Supabase project (SQL editor, or `supabase db push` if you have the CLI linked) — the AI tools won't work without them, since `/api/gemini` now requires the `increment_rate_limit` function they create.

### Run locally

```bash
# Frontend only (AI features won't work — use deployed URL to test AI)
npm run dev

# Full stack locally (requires Vercel CLI)
npx vercel dev
```

### Deploy to Vercel

```bash
# Push to GitHub — Vercel auto-deploys
git push

# Or deploy manually
npx vercel --prod
```

Add environment variables in Vercel dashboard → Settings → Environment Variables.

---

## Project Structure

```
shipsafe/
├── api/
│   ├── gemini.js              # Serverless AI proxy → Gemini
│   ├── github.js              # GitHub repo file fetcher
│   └── embed.js               # Vector embedding generator
├── src/
│   ├── components/
│   │   ├── Layout.jsx         # Navbar + sidebar + mobile drawer
│   │   ├── ReportButton.jsx   # Shareable report link generator
│   │   ├── NextSteps.jsx      # Cross-tool suggestion cards
│   │   └── Logo.jsx           # Brand mark
│   ├── pages/
│   │   ├── Dashboard.jsx      # Scan history + Ship-Readiness Score
│   │   ├── Debugger.jsx       # AI Code Debugger (streaming + GitHub)
│   │   ├── Audit.jsx          # Vibe-Code Audit (GitHub repo scan)
│   │   ├── Loopholes.jsx      # Loophole Finder
│   │   ├── Regulations.jsx    # Live AI regulation explorer
│   │   ├── Report.jsx         # Public shareable report viewer
│   │   ├── Landing.jsx        # Public landing page
│   │   └── Login.jsx          # Auth page
│   ├── services/
│   │   ├── scanService.js     # AI call handler (all tools)
│   │   └── supabaseService.js # Database + report operations
│   ├── utils/
│   │   ├── shipReadiness.js   # Unified readiness score calculator
│   │   └── crossToolSuggestions.js  # Smart next-step recommendations
│   ├── data/
│   │   └── mockResults.js     # Demo data for logged-out users
│   ├── hooks/
│   │   ├── useAuth.jsx        # Auth state provider
│   │   ├── useReport.js       # Report slug generation
│   │   └── useIsMobile.js     # Responsive breakpoint hook
│   ├── lib/
│   │   └── supabase.js        # Supabase client init
│   └── App.jsx                # Router setup
├── vercel.json                # SPA routing + security headers
├── package.json
└── README.md
```

---

## Supabase Schema

| Table | Purpose |
|---|---|
| `scan_history` | Stores all scan results (debugger, audit, loopholes) |
| `regulations` | AI regulation data (14 countries) — public read |
| `reports` | Public shareable scan reports (`/report/:slug`) |
| `rate_limits` | Per-user, per-time-window request counters backing `/api/gemini`'s rate limit (see `supabase/migrations/0001_rate_limits.sql`) |

All tables use **Row Level Security (RLS)** — users can only access their own data. Schema changes are version-controlled as SQL migrations under `supabase/migrations/` — apply them via the Supabase SQL editor or `supabase db push`.

---

## Environment Variables

| Variable | Where it runs | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase public key (safe to expose — RLS protects data) |
| `GEMINI_API_KEY` | Server only | Google Gemini API key |
| `GITHUB_TOKEN` | Server only | Optional — higher GitHub API rate limits for repo scanning |

---

## Roadmap

- [x] AI Debugger with real Gemini analysis
- [x] Vibe-Code Audit with 5-category scoring
- [x] Loophole Finder with country-specific regulations
- [x] Supabase Auth (email + GitHub)
- [x] Scan history dashboard
- [x] Public shareable reports (/report/:id)
- [x] GitHub repo scanning (Debugger + Audit)
- [x] Streaming AI responses on Debugger
- [x] Ship-Readiness Score on Dashboard
- [x] Cross-tool suggestions across all pages
- [x] Rate limiting on AI proxy — persistent, per-authenticated-user, Postgres-backed (replaced the original in-memory-per-IP version)
- [x] Server-side auth check on `/api/gemini` (previously enforced only client-side)
- [x] Automated tests (Vitest) + CI (GitHub Actions: lint, test, build)

---

Project docs: [`docs/`](docs/). Planned work and open TODOs: [`docs/planning/`](docs/planning/).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| AI features return errors locally | Use `npx vercel dev` instead of `npm run dev`. The `/api/` routes only run on Vercel. |
| `Service unavailable` from `/api/gemini` | Check `GEMINI_API_KEY` is set in Vercel env vars (no `VITE_` prefix). |
| GitHub repo scan fails | Public repos work without a token. For private repos or higher rate limits, add `GITHUB_TOKEN` to Vercel env vars. |
| Scan history not saving | Confirm Supabase keys in `.env.local` and that RLS policies are enabled on `scan_history`. |
| `401 Sign in required` from `/api/gemini` | The AI tools require a logged-in session — `/api/gemini` verifies your Supabase JWT server-side. Sign in through the UI (curling the endpoint directly won't work without a valid `Authorization: Bearer <token>` header). |
| Rate limit hit (429) | 10 requests per minute per user, tracked in the `rate_limits` table. Make sure the `0001_rate_limits.sql` migration has been applied to your Supabase project — see [Supabase Schema](#supabase-schema). |
| Auth redirect loop | Ensure Supabase Auth redirect URL includes your Vercel domain and `http://localhost:5173` for local dev. |

---

## Contributing

Contributions welcome. Quick start:

```bash
git clone https://github.com/ishanshaurya/shipsafe.git
cd shipsafe
npm install
cp .env.example .env.local   # fill in your keys
npx vercel dev               # full stack with API routes
```

**Guidelines:**
- One feature or fix per PR
- Run `npm run lint` before committing
- Never commit `.env.local` or API keys
- README updates appreciated for new features or env vars

Found a bug? Open an issue on [GitHub](https://github.com/ishanshaurya/Shipsafe/issues).

---

**Shaurya Ishan** — [GitHub](https://github.com/ishanshaurya)

---

*ShipSafe • Don't just ship fast. Ship safe.*
