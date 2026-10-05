# ShipSafe

**Build, validate and deploy AI projects responsibly.**

*Don't just ship fast. Ship safe.*

ShipSafe is a toolkit for developers who build AI products. It answers two questions before launch: is my code safe, and is my project legal?

**Live:** [shipsafe-app.vercel.app](https://shipsafe-app.vercel.app)

---

## Tools

### AI Debugger
Paste code and get a review of bugs, security holes and vibe-code smells. Those are the habits AI-generated code picks up: hardcoded secrets, missing error handling, hallucinated imports, console.log in every file. Responses stream in as they generate. You can also paste a GitHub repo URL and the Debugger pulls the files for you.

### Vibe-Code Audit
Paste a project description and its code, or import a GitHub repo, and get a report card scored 0 to 100 across five categories: security, code quality, maintainability, AI patterns and deploy readiness. Each category lists up to three issues with a concrete fix.

### Loophole Finder
Describe your AI system and pick the countries you plan to launch in. The tool looks for places where the law is ambiguous or enforcement is unclear, covering regulations such as the EU AI Act, India's DPDP Act and the US Executive Order on AI. It also lists upcoming rule changes and defenses you can put in place now.

### Regulation Explorer
Pick a topic like privacy, deepfakes or bias. You get the regulations that apply, who is at risk, which countries are covered, and a checklist of actions a developer can test. If the AI call fails, the page falls back to sample data so it still renders.

### Dashboard
Scan history, scores, and a single Ship-Readiness Score built from your latest results. After each scan, the app suggests which tool to run next.

### Shareable reports
Every tool has a Report button that creates a public link at `/report/:slug`. Anyone with the link can read the result without signing in.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router |
| Styling | Plain CSS design system (`src/index.css`), light "port clearance" theme |
| Database and auth | Supabase (Postgres, Row Level Security, email and GitHub sign-in) |
| AI | Pooled providers: Gemini 2.5 Flash, Groq, Cerebras, SambaNova |
| Hosting | Vercel (static frontend plus serverless functions in `api/`) |
| Tests and CI | Vitest, with GitHub Actions running lint, test and build on every PR |

---

## Architecture

```
┌──────────────┐        ┌───────────────────┐        ┌──────────────────┐
│ React app    │─ POST ▶│ /api/gemini       │───────▶│ Gemini, Groq,    │
│ (Vite)       │        │ (Vercel function) │        │ Cerebras,        │
│              │◀─ JSON─│ verifies session  │◀───────│ SambaNova        │
└──────────────┘        └───────────────────┘        └──────────────────┘
       │ signed in
       └── save scan ──▶ Supabase (Postgres + RLS)
```

Design decisions worth knowing:

- **Serverless proxy.** The browser calls `/api/gemini` and the function holds the provider keys, so no key appears in frontend code. The system prompt for each tool also lives on the server. The client sends only a tool name and the user's input.
- **Provider pool.** Requests rotate across whichever providers have a key configured. A provider that returns an error goes into a cooldown (60 seconds for a rate limit, 10 minutes for a bad key) and the request falls through to the next one.
- **One service layer.** `scanService` builds prompts, parses JSON, validates each tool's response shape and normalizes it for the pages; with `regulationsService` it is the only code that calls `/api/gemini`. `scanHistory` and `reportService` own the database tables, and `githubImport` owns `/api/github`. `src/app/architecture.test.js` enforces who may call `/api/*` or the Supabase client.
- **Server-side auth on every API route.** `/api/gemini`, `/api/github` and `/api/embed` all verify the caller's Supabase session through the shared helper in `api/_lib/auth.js`. A request without a valid token gets a 401, whatever the frontend does.
- **Row Level Security.** Users see only their own scan history. The rate-limit counter is scoped to `auth.uid()` the same way.

---

## API endpoints

Every route lives under `/api/`, runs on Vercel only, and needs `Authorization: Bearer <supabase access token>`. Locally, `npm run dev` serves the frontend alone, so use `npx vercel dev` to exercise these.

| Endpoint | Purpose |
|---|---|
| `POST /api/gemini` | AI proxy. Takes `tool` and `userPrompt`, optionally `stream: true`. Limited to 20 requests per minute per user, counted in Postgres. |
| `POST /api/github` | Reads a repo's file tree and contents through the GitHub API. Returns up to 25 files of 60 KB or less. |
| `POST /api/embed` | Creates embeddings for scan results and finds the caller's similar past scans through pgvector. |

Example body for `/api/gemini`:

```json
{
  "tool": "debugger",
  "userPrompt": "Review this code for security issues...",
  "stream": false
}
```

Allowed `tool` values are `debugger`, `audit`, `loopholes` and `regulations`. Details for each route are in [`docs/api/`](docs/api/).

---

## Engineering notes

Three problems found after the product was already live.

### Half the AI tools never called the AI

`scanService` exposes `callAI`, and every tool is supposed to go through it. Debugger did. Audit, Deploy Check and Loophole Finder each had a page-local `getMock*()` function that matched regexes against the input and returned results dressed up as AI output.

The real schemas already existed in `callAI`'s validator, and nothing called them. Wiring the pages up took more than one line because the mocks and the AI schema had drifted apart. Audit's mock returned five UI category keys with per-issue severity and fix fields. The AI schema used different category names and returned issues as plain strings. The fix was to rewrite the prompt schemas around what the UI needs, then add a thin normalizer so the pages stayed untouched.

Root cause: a demo-mode fallback outlived the real integration, and no test or type check caught three tools drifting away from the module meant to be their only entry point.

### The login wall lived only in the browser

While testing that fix, a plain `curl -X POST /api/gemini` with no auth header came back with a valid AI response. Every tool page sat behind a `ProtectedRoute`, but that component only redirects a browser to `/login`. It does nothing to the API, so anyone with the URL could spend the metered quota.

The fix verifies the caller's Supabase JWT inside `/api/gemini` before any other work. Rate limiting moved from an in-memory per-IP counter (reset on every cold start, shared by everyone behind one NAT) to a `rate_limits` table. A `SECURITY DEFINER` Postgres function increments the row for `auth.uid()` atomically, and users have no direct write access to the table.

### Two more open endpoints

A later security review found that `/api/github` and `/api/embed` had the same hole. `/api/embed` was worse: it trusted a `userId` from the request body and queried with the service-role key, which skips RLS. Any caller could read another user's similar scans or overwrite an embedding by guessing a scan id.

Both routes now require a session. `/api/embed` takes the user from the token and filters every query by it. Input checks went in alongside: embedding length, text size, GitHub owner and repo names, and an `http`/`https`-only filter on regulation links. Public report slugs now come from a cryptographic random source instead of `Math.random()`.

---

## Getting started

You need Node.js 18 or newer, a [Supabase](https://supabase.com) project, and at least one AI provider key. A [Google AI Studio](https://aistudio.google.com) key on the free tier is enough.

```bash
git clone https://github.com/ishanshaurya/Shipsafe.git
cd Shipsafe
npm install
cp .env.example .env.local
```

Fill in `.env.local` using the variable names in the table below. Server-side keys have no `VITE_` prefix, which keeps Vite from bundling them into the browser build.

Then apply the migrations in `supabase/migrations/`, either in the Supabase SQL editor or with `supabase db push` from a linked project. The AI tools return a 500 until you do, because `/api/gemini` calls the `increment_rate_limit` function that the first migration creates.

```bash
# Frontend only. AI routes will not respond.
npm run dev

# Full stack with the API routes (needs the Vercel CLI)
npx vercel dev
```

### Deploy

```bash
npx vercel --prod
```

Set the environment variables under Vercel, Settings, Environment Variables before the first deploy. If the project is connected to GitHub, a push also triggers a build.

---

## Environment variables

| Variable | Runs in | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Public anon key. RLS protects the data, so exposing it is fine. |
| `GEMINI_API_KEY` | Server | Gemini key. Also used for embeddings. |
| `GROQ_API_KEY` | Server | Optional extra provider in the pool |
| `CEREBRAS_API_KEY` | Server | Optional extra provider in the pool |
| `SAMBANOVA_API_KEY` | Server | Optional extra provider in the pool |
| `GITHUB_TOKEN` | Server | Raises GitHub API limits for repo import. Use a read-only token limited to public repos. |
| `SUPABASE_URL` | Server | Optional. Falls back to `VITE_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE` | Server | Lets `/api/embed` write embeddings. Every query is still filtered by the verified user. Without it, `/api/embed` uses the caller's own session and RLS. |

Never commit `.env.local`. `.env.example` lists every name with placeholder values.

---

## Project structure

```
Shipsafe/
├── api/
│   ├── _lib/auth.js        # Shared Supabase session check
│   ├── gemini.js           # AI proxy and provider pool
│   ├── github.js           # GitHub repo reader
│   └── embed.js            # Embeddings and similar-scan search
├── src/
│   ├── app/                # App routes, Layout, ErrorBoundary, architecture.test.js
│   ├── features/
│   │   ├── auth/           # authService, AuthProvider, Login
│   │   ├── scan/           # scanService, scanRun, scanHistory, crossToolSuggestions
│   │   ├── tools/          # Debugger, Audit, Loopholes pages
│   │   ├── github-import/  # githubImport, RepoImport
│   │   ├── regulations/    # Regulations page, regulationsService
│   │   ├── reports/        # Report page, reportService, ReportButton
│   │   ├── dashboard/      # Dashboard, shipReadiness
│   │   └── landing/        # Landing
│   └── shared/             # supabaseClient, authHeader, toolRegistry, verdict, components/
├── supabase/migrations/    # SQL schema changes
├── docs/                   # Overview, API notes, design, plans, decisions
├── .github/workflows/      # CI
└── vercel.json             # SPA routing and security headers
```

---

## Supabase schema

| Table | Purpose |
|---|---|
| `scan_history` | Every saved scan: type, input snippet, result JSON, score, embedding |
| `reports` | Public report snapshots served at `/report/:slug` |
| `regulations` | Public-read regulation reference data |
| `rate_limits` | Request counters per user and minute window (`0001_rate_limits.sql`) |

Only `rate_limits` is in version control so far. The other tables and their policies were created by hand in the Supabase dashboard, and exporting them into `supabase/migrations/` is still on the to-do list. Until that happens, a fresh Supabase project will not match production.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| AI features fail locally | Run `npx vercel dev`. Plain `npm run dev` does not serve `/api/`. |
| 500 `Rate limit check failed` | The `0001_rate_limits.sql` migration is missing from your Supabase project. Apply it. |
| 401 `Sign in required` | Every API route checks your Supabase session. Sign in through the app. A bare curl needs a valid `Authorization: Bearer` header. |
| 429 on AI calls | You hit 20 requests in a minute. Wait for the window to roll over. |
| `Service unavailable` from `/api/gemini` | No provider key is set. Add at least one in Vercel and redeploy. |
| 502 `AI provider unavailable` | Every configured provider failed or is cooling down. Retry shortly, and check the keys if it persists. |
| GitHub import fails | Public repos work without a token. A private repo or a rate-limit error needs `GITHUB_TOKEN`. |
| Scan history not saving | Check the Supabase keys, and confirm RLS policies allow inserts on `scan_history` for the owner. |
| Auth redirect loop | Add your Vercel domain and `http://localhost:5173` to the Supabase Auth redirect URLs. |

---

## Contributing

```bash
git clone https://github.com/ishanshaurya/Shipsafe.git
cd Shipsafe
npm install
cp .env.example .env.local
npx vercel dev
```

Keep each PR to one feature or fix, run `npm run lint` and `npm test` before pushing, and update this README when you add an environment variable or an endpoint. Planned work lives in [`docs/planning/`](docs/planning/). Bugs go in [GitHub issues](https://github.com/ishanshaurya/Shipsafe/issues).

Built by [Shaurya Ishan](https://github.com/ishanshaurya).
