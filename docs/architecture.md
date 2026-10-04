# Architecture

## Stack
React 19 + Vite 8 + React Router 7 (SPA, inline styles, Tailwind v4 installed) · Vercel serverless functions in `api/` · Supabase (Auth, Postgres, RLS) · Vitest + ESLint, CI on GitHub Actions (lint, test, build; Node 22).

## Module map (current)
| Path | Responsibility |
|---|---|
| `src/pages/` | One page per route: Landing, Login, Dashboard, Debugger, Audit, Regulations, Loopholes, Report |
| `src/components/` | Layout (rail/drawer), Flag, VerdictBanner, Finding, CodePanel, RepoImport, Notice, NextSteps, ReportButton, ProtectedRoute, Logo |
| `src/hooks/` | `useAuth`/`AuthProvider`, `useReport` |
| `src/services/scanService.js` | Only caller of `/api/gemini`: prompt building, parse, validate, per-tool normalizers, `extractScore` |
| `src/services/scanRun.js` | *New, uncommitted.* One scan start-to-finish: call → normalize → score → suggestions → save |
| `src/services/githubImport.js` | *New, uncommitted.* Client for `/api/github` (quick / list / fetch); never throws |
| `src/services/supabaseService.js` | Only module that talks to Supabase tables |
| `src/utils/` | `crossToolSuggestions` (rules engine), `shipReadiness` (weighted score) |
| `src/data/mockResults.js` | Demo data for logged-out Dashboard + regulations fallback |
| `api/` | `gemini.js` (AI proxy), `github.js` (repo fetcher), `embed.js` (embeddings) |
| `supabase/migrations/` | Only `0001_rate_limits.sql` is in the repo (see gotchas) |

Target layout after the refactor (`app/`, `features/*`, `shared/`, `api/_lib/`): [`planning/plans/refactor-sequence.md`](planning/plans/refactor-sequence.md) item 6.

## Request flow (a scan)
1. Page calls `callAI(tool, payload)` (or `callAIStream`) in `scanService`.
2. `scanService` POSTs `/api/gemini` with the user's Supabase access token.
3. The function verifies the session, applies a per-user rate limit, picks the system prompt for `tool` server-side, and tries providers in rotation.
4. `scanService` parses the JSON, validates it, normalizes it for the page.
5. The page saves the scan via `saveScan` (Supabase `scan_history`); Debugger also embeds it via `/api/embed`.

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
