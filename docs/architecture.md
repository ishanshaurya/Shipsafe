# Architecture

## Stack
React 19 + Vite 8 + React Router 7 (SPA, inline styles, Tailwind v4 installed) · Vercel serverless functions in `api/` · Supabase (Auth, Postgres, RLS) · Vitest + ESLint, CI on GitHub Actions (lint, test, build; Node 22).

## Module map
Frontend (`src/`), grouped by feature. `src/main.jsx` mounts `app/App.jsx`; `index.css` holds the design system.

| Path | Responsibility |
|---|---|
| `app/` | `App.jsx` (routes), `Layout.jsx` (top bar, menu below 1024px), `ErrorBoundary.jsx`, `architecture.test.js` (boundary rules) |
| `features/auth/` | `authService` (only caller of Supabase Auth), `AuthProvider`, `useAuth`, `ProtectedRoute`, `Login` |
| `features/scan/` | `scanService` (only caller of `/api/gemini` for the scan tools: request, parse, dispatch to the tool's validator), `scanRun` (one scan start to finish), `scanHistory` (`scan_history` table and embeddings), `toolModules` (registry of the tool modules below), `NextSteps` |
| `features/github-import/` | `githubImport` (only caller of `/api/github`, never throws), `RepoImport` (URL field and file picker) |
| `features/debugger/`, `features/audit/`, `features/loopholes/` | One folder per tool: the page plus a pure `<tool>Tool.js` that owns the user prompt, response validation, normalizer, score, input field and next-step suggestions. `github-import/useRepoImport` holds the repo picker state shared by Debugger and Audit |
| `features/regulations/` | `Regulations` page, `regulationsService` (AI query, normalize, flagged fallback), `mockRegulation` |
| `features/reports/` | `Report` (public viewer), `ReportButton`, `useReport`, `reportService` (`reports` table) |
| `features/dashboard/` | `Dashboard`, `shipReadiness` (weighted score), `mockScans` |
| `features/landing/` | `Landing` |
| `shared/` | `supabaseClient`, `authHeader`, `toolRegistry`, `verdict`, `components/` (Logo, Flag, Finding, CodePanel, VerdictBanner), `ui/` (Button, Card, Field, Badge, Spinner, Skeleton, EmptyState, ErrorState, Notice, Progress, `useProgressStep`) |
| `api/` | `gemini.js` (AI proxy), `github.js` (repo fetcher), `embed.js` (embeddings), `_lib/auth.js` |
| `supabase/migrations/` | Only `0001_rate_limits.sql` is on `redesign/main`; lane B is adding the rest |

Rules, enforced by `app/architecture.test.js`:
- Only `scanService`, `scanRun`, `scanHistory`, `githubImport` and `regulationsService` call `fetch("/api/...")`. Each attaches the session token.
- Only `supabaseClient`, `authHeader`, `authService`, `scanHistory` and `reportService` touch the Supabase client. Pages and components never do.
- No source file over 400 lines.
Adding a new API caller or Supabase user means editing the allowlist in that test on purpose.

## Request flow (a scan)
1. Page calls `runScan({ tool, payload, user })` in `scanRun`, which calls `callAI` or `callAIStream` in `scanService`.
2. `scanService` POSTs `/api/gemini` with the user's Supabase access token.
3. The function verifies the session, applies a per-user rate limit, picks the system prompt for `tool` server-side, and tries providers in rotation.
4. `scanService` parses the JSON and validates it with the tool's module; `scanRun` normalizes it, scores it and asks the module for next steps.
5. `scanRun` saves the scan via `saveScan` (`scan_history`) without blocking the page; Debugger scans are also embedded via `/api/embed`, and `findSimilarScans` looks up similar past scans.

## External services
| Service | Used for | Env var names |
|---|---|---|
| Supabase | Auth, `scan_history`, `reports`, `regulations`, `users`, `rate_limits` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` (embed only) |
| Gemini | Primary AI + `text-embedding-004` embeddings | `GEMINI_API_KEY` |
| Groq (`openai/gpt-oss-120b`) | AI fallback | `GROQ_API_KEY` |
| Cerebras (`gpt-oss-120b`) | AI fallback | `CEREBRAS_API_KEY` |
| SambaNova (`Meta-Llama-3.3-70B-Instruct`) | AI fallback | `SAMBANOVA_API_KEY` |
| GitHub REST API | Repo trees and file contents | `GITHUB_TOKEN` (optional) |
| Vercel | Hosting, serverless functions | — |
