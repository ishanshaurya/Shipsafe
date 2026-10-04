# Things to know

- **Local AI needs Vercel.** `npm run dev` serves only the frontend; `/api/*` runs under `npx vercel dev` or on Vercel.
- **Migrations first.** `/api/gemini` calls `increment_rate_limit`; without `supabase/migrations/0001_rate_limits.sql` applied every AI call fails with 500.
- **Migrations are incomplete in the repo.** Only `rate_limits` is there. `scan_history` (incl. `embedding`), `reports`, `regulations`, `users`, the `match_scans` function and their RLS policies exist in Supabase but not in version control. TODO(confirm) and export them.
- **Env vars.** Server-only keys have no `VITE_` prefix. `.env.example` lacks `GITHUB_TOKEN`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`, which the code reads (`api/github.js`, `api/embed.js`). Never print or commit `.env*`; `.env.local.save` also exists locally.
- **Rate limit is 20 requests/60 s per user** (code), though some comments/README text say 10.
- **Tool names are an allowlist in two places:** `ALLOWED_TOOLS` in `api/gemini.js` and `TOOLS` in `src/services/scanService.js`. Currently `debugger`, `audit`, `loopholes`, `regulations`.
- **AI output shape is a contract.** Changing a system prompt in `api/gemini.js` means updating `scanService.validate` and the normalizer.
- **Old data.** Deploy Check and Stress Test are fully removed from the code (no read-side support). Past `deploy-check` rows in `scan_history`/`reports` may still exist: they show with a default color in Dashboard history, and an old shared `/report/:slug` for one renders as a raw JSON dump. No `stress-test` scans were ever reliably saved. Rows are not deleted; cleanup is a manual SQL decision.
- **Working tree is mid-refactor.** `scanRun.js` and `githubImport.js` are new and uncommitted; pages don't use them yet.
- **Regulations fall back to mock data** (`mockRegulationResult`) when the AI call fails.

## Known endpoint risks
Tracked in [planning/api/endpoint-hardening.md](planning/api/endpoint-hardening.md).
- `/api/embed` and `/api/github` now require a Supabase session (shared `api/_lib/auth.js`). Neither has its own rate limit, so a signed-in user can still spend Gemini/`GITHUB_TOKEN` quota.
- `/api/gemini` is authenticated and rate limited; its CORS allows only `Content-Type`, fine because production is same-origin.
