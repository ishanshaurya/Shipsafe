# ShipSafe

**Build, Validate & Deploy AI Responsibly**

*Don't just ship fast. Ship safe.*

ShipSafe is an all-in-one developer toolkit for building, validating, and deploying AI projects responsibly. Every feature answers one of three core questions in a developer's deployment pipeline: **Is my code safe?** → **Is my project legal?** → **Am I ready to ship?**

**Live Demo:** [shipsafe-app.vercel.app](https://shipsafe-app.vercel.app)

---

## The Pipeline

| Stage 1: CODE | Stage 2: LEGAL | Stage 3: DEPLOY |
|---|---|---|
| *"Is my code safe?"* | *"Is my project legal?"* | *"Am I ready to ship?"* |
| AI Debugger + Vibe-Code Audit | Regulation Tracker + Loophole Finder | Deploy Checker + Stress Tester |

---

## Features

### AI Code Debugger
Paste any code and get an instant AI analysis covering bugs, security vulnerabilities, and **vibe-code smells** — patterns unique to AI-generated code that real developers wouldn't write (hardcoded secrets, no error handling, hallucinated imports, console.log everywhere).

<!-- ![AI Debugger Screenshot](screenshots/debugger.png) -->

### Vibe-Code Audit
Goes beyond single-file debugging. Paste your entire project structure and get a **scored report card** across 5 categories: Security, Code Quality, Maintainability, AI-Pattern Detection, and Deployment Readiness.

<!-- ![Vibe-Code Audit Screenshot](screenshots/audit.png) -->

### Loophole Finder
Describe your AI system and select target deployment countries. The AI cross-references regulation databases to find **legal grey areas** — where the law is ambiguous, enforcement is unclear, or competitors might exploit gaps. References real regulations: EU AI Act, India's DPDP Act, US Executive Order on AI, and more.

<!-- ![Loophole Finder Screenshot](screenshots/loopholes.png) -->

### Deploy Readiness Checker
The final gate before shipping. Describe your deployment setup and the AI checks for common production gotchas: missing env vars, CORS misconfig, no rate limiting, missing security headers, and platform-specific issues for Vercel, Netlify, AWS, Railway, and more.

<!-- ![Deploy Checker Screenshot](screenshots/deploy-check.png) -->

### Stress Tester
A simulated load testing tool. Describe your stack and the AI predicts bottlenecks at 10, 100, 1,000, and 10,000 concurrent users — identifying which component breaks first and what the fix is. Includes realistic analysis of free-tier limits (Vercel, Supabase, etc.).

<!-- ![Stress Tester Screenshot](screenshots/stress-test.png) -->

### Dashboard
Track all your scans in one place. Shows scan history, scores, issue counts, and quick actions to every tool. Logged-in users get persistent scan history via Supabase.

<!-- ![Dashboard Screenshot](screenshots/dashboard.png) -->

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

---

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   React Frontend │──POST──▶│  /api/claude      │──────▶  │  Gemini 2.5  │
│   (Vite + React  │         │  (Vercel          │         │  Flash       │
│    Router)       │◀──JSON──│   Serverless)     │◀──────  │              │
└──────────────────┘         └──────────────────┘         └──────────────┘
        │ if (user logged in)
        └──── save scan ────▶  Supabase (PostgreSQL + RLS)
```

**Key design decisions:**
- **Serverless proxy pattern** — React calls `/api/claude`, the serverless function adds the API key and forwards to Gemini. API keys never appear in frontend code.
- **Service layer** — `scanService.js` centralizes all AI calls. One function (`callAI`) handles prompt building, fetching, JSON parsing, and validation for all 5 tools.
- **Row Level Security** — Supabase RLS ensures users can only see their own scan history.

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
│   └── claude.js              # Serverless proxy → Gemini
├── src/
│   ├── components/
│   │   └── Layout.jsx         # Shared navbar + sidebar + dark theme
│   ├── pages/
│   │   ├── Dashboard.jsx      # User home (scan history, quick actions)
│   │   ├── Debugger.jsx       # AI Code Debugger
│   │   ├── Audit.jsx          # Vibe-Code Audit
│   │   ├── Loopholes.jsx      # Loophole Finder
│   │   ├── DeployCheck.jsx    # Deploy Readiness Checker
│   │   ├── StressTest.jsx     # Stress Tester
│   │   ├── Regulations.jsx    # AI Regulation Tracker
│   │   ├── Landing.jsx        # Public landing page
│   │   └── Login.jsx          # Auth page
│   ├── services/
│   │   ├── scanService.js     # AI call handler (all tools use this)
│   │   └── supabaseService.js # Database operations with error handling
│   ├── data/
│   │   └── mockResults.js     # Demo data for logged-out users
│   ├── hooks/
│   │   ├── useAuth.js         # Auth state hook
│   │   └── useIsMobile.js     # Responsive breakpoint hook
│   ├── lib/
│   │   └── supabase.js        # Supabase client init
│   └── App.jsx                # Router setup
├── vercel.json                # SPA routing rewrites
├── package.json
└── README.md
```

---

## Supabase Schema

| Table | Purpose |
|---|---|
| `scan_history` | Stores all scan results (debugger, audit, loopholes, deploy-check, stress-test) |
| `regulations` | AI regulation data (14 countries) — public read |
| `reports` | Public shareable reports (coming soon) |

All tables use **Row Level Security (RLS)** — users can only access their own data.

---

## Environment Variables

| Variable | Where it runs | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase public key (safe to expose — RLS protects data) |
| `GEMINI_API_KEY` | Server only | Google Gemini API key |

---

## Roadmap

- [x] AI Debugger with real Gemini analysis
- [x] Vibe-Code Audit with 5-category scoring
- [x] Loophole Finder with country-specific regulations
- [x] Deploy Readiness Checker
- [x] Stress Tester with tier-based predictions
- [x] Supabase Auth (email + GitHub)
- [x] Scan history dashboard
- [x] Mobile responsive
- [ ] Groq fallback API
- [ ] Public shareable reports (/report/:id)
- [ ] PDF export for reports
- [ ] Real regulation data API integration
- [x] Rate limiting on AI proxy

---

## Built By

**Shaurya Ishan** — [GitHub](https://github.com/ishanshaurya)

---

*ShipSafe • Don't just ship fast. Ship safe.*
