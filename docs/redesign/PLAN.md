# Redesign plan: three lanes, four waves

Goal: same behavior, cleaner structure, tests and gates that catch regressions before prod. No new features. Builds on [refactor-sequence](../planning/plans/refactor-sequence.md).

## Rules for every agent
1. Work only in your own git worktree and branch. Touch only the paths your lane owns.
2. Never `git commit --amend`, force-push, or push. Never commit unless this plan says to. Never deploy. Never run `supabase db push` or touch prod data. The user does those.
3. A phase is done only when `scripts/gate.sh` prints `GATE GREEN` and the lane's own checks pass.
4. Never edit another lane's files, `package.json` or `package-lock.json` unless you hold the dependency baton (below).
5. Frozen shapes live in [CONTRACTS.md](CONTRACTS.md). Do not change them. File a change request instead.
6. Update your status file at every checkpoint (start, blocked, done). Read the other status files before starting a phase.
7. Never read or print `.env*` values. Never log secrets.

## Lanes and ownership

| Lane | Branch / worktree | Owns (write access) | Never touches |
|---|---|---|---|
| **A: Frontend** | `redesign/a-frontend` in `../Shipsafe-wt/a` | `src/**`, `index.html`, `public/` | `api/`, `supabase/`, `.github/`, `e2e/` |
| **B: Backend + data** | `redesign/b-backend` in `../Shipsafe-wt/b` | `api/**`, `supabase/**`, `tests/api/**` | `src/`, `.github/`, `e2e/` |
| **C: QA + infra** | `redesign/c-qa` in `../Shipsafe-wt/c` | `e2e/**`, `.github/**`, `scripts/**`, `vercel.json`, `eslint.config.js`, `vite.config.js` | `src/`, `api/`, `supabase/` |

Docs: each lane writes only `docs/redesign/status/<lane>.md` plus the docs for its own area (A: `docs/design/`, `docs/architecture.md` frontend parts; B: `docs/api/`; C: `docs/redesign/testing.md`).

**Dependency baton.** `package.json` and the lockfile are shared. One lane holds the baton per wave. Wave 1: C. Wave 2: B. Wave 3: A. Others list the packages they need in their status file and wait. Vitest config is lane C's, so lanes A and B add test files only.

## Waves and phases

### Wave 0: integrator setup (this session plus you, before lanes start)
- [x] You rotate the leaked Supabase service key and update `SUPABASE_SERVICE_ROLE` on Vercel. (done by user)
- [x] You tell the integrator to commit the pending GitHub-import fix. Then the integrator tags `baseline-pre-redesign` on that commit and creates branch `redesign/main`. (commit 17c9f70, tag `baseline-pre-redesign`)
- [x] Integrator creates the three worktrees from `redesign/main`.
- [ ] You provide a test account (email and password) as env vars `E2E_EMAIL` and `E2E_PASSWORD` in your shell only. Never in files. DEFERRED 2026-10-05: signed-in e2e skipped, see status/c.md.
- Gate: tag exists, three worktrees exist, `scripts/gate.sh` is green on `redesign/main`.

### Wave 1: foundations (all three lanes in parallel, no overlap)
**A, phase A1: one fetch path.** Pages stop calling `/api/*` directly. Debugger and Audit use `githubImport` and `scanRun`. Inline embed logic in `Debugger.jsx` goes away (refactor-sequence items 1 and 2).
- Done when: `grep -rn 'fetch("/api' src` matches only files in `src/services/`. Existing tests pass. New unit tests cover `githubImport` 401 handling and `findSimilarScans` sending the auth header.
- Status: Done, commit 6f45c62, gate green.

**B, phase B1: database in git.** Dump the real schema and policies read-only into new numbered files under `supabase/migrations/` (`scan_history`, `reports`, `regulations`, `users` if it exists, `match_scans`, indexes). Add `supabase/tests/rls.sql` that asserts: user A cannot read, update or delete user B's `scan_history`, anonymous cannot read a private report, anyone can read a public report. Record what exists in prod versus what the code expects in `docs/redesign/status/b.md`.
- Done when: migrations replay cleanly on a fresh local Supabase (`supabase start`, `supabase db reset`) and `rls.sql` passes. No prod writes.

**C, phase C1: safety net.** Add Playwright under `e2e/` with a smoke suite: sign in with `E2E_EMAIL`/`E2E_PASSWORD`, run each of the four tools with a small input, open a shared report, import a public GitHub repo, confirm `/api/*` without a token returns 401. Add the `e2e` npm script and a `scripts/smoke.sh` that targets a base URL. C holds the dependency baton.
- Done when: the suite passes against the current prod URL (baseline) and fails when the auth header is removed.

Sync point 1: all three lanes green. Integrator merges A, B, C into `redesign/main` one at a time (order: C, B, A), running the gate after each. Then the e2e suite runs against a preview deploy of `redesign/main`.

### Wave 2: structure
**A, phase A2: feature folders.** `src/features/{scan,tools,github-import,regulations,reports,auth,dashboard,landing}/`, `src/shared/`, `src/app/` (refactor-sequence item 6), one tool module per tool (item 3), split `supabaseService.js` by domain (item 4). Add an error boundary. Move in small commits, one folder at a time, gate green after each.
- Done when: no behavior change (e2e green), no file over about 400 lines, no page imports Supabase or calls `fetch("/api")`.
- Status: Done, commits dc92623 / 9a68b9f / fe560e8, gate green. Item 3 (one module per tool) was left for the Wave 2 follow-up below.
- Wave 2 follow-up (A2 leftovers): Done, one module per tool (Debugger, Audit, Loophole Finder; Regulations already has `regulationsService`) and shared `useRepoImport`, gate green.

**B, phase B2: API layer.** Split `api/_lib/` into `auth.js`, `rateLimit.js`, `providers.js`, `validate.js`. Add rate limits to `/api/embed` and `/api/github` using the same `increment_rate_limit` function with separate buckets (new migration, applied by you). Add API tests in `tests/api/` with mocked `fetch`: 401, 400, 429, provider failover, SSE framing, embed ownership filter, GitHub name validation. B holds the dependency baton.
- Done when: contracts unchanged (a contract test replays every example in CONTRACTS.md), tests cover each error code, gate green.

**C, phase C2: CI gates.** GitHub Actions: lint, test, build, audit, gitleaks, a preview-deploy e2e job (needs repo secrets, set by you), Dependabot config. No change to app code.
- Done when: a deliberately broken PR (committed secret, failing test) turns CI red, and a clean PR turns it green.

Sync point 2: same merge procedure. After the merge you apply any new migrations (`supabase db push`) and the integrator runs e2e against a preview.

### Wave 3: hardening
**A, phase A3:** UI primitives (refactor-sequence item 5) and loading/error states audit. A holds the dependency baton.
- Status: Done, commits 4e37390 .. ec30bb0, no new packages. Primitives in `src/shared/ui/`; every tool, Regulations, Dashboard and Report has progress, error with retry, and empty states. Gate: lint, `src` tests, build and audit green. `tests/api/contract.test.js` was already red on `redesign/main` (see status/a.md Requests).
**B, phase B3:** structured JSON logging in the API (request id, user id hash, route, status, latency, never prompts or tokens).
**C, phase C3:** post-deploy health check script, cost-alert notes for provider keys, `docs/redesign/testing.md`.
Sync point 3: full merge, e2e on preview, then you decide on prod.

### Wave 4 (optional, only if the `regulations` table passes review)
Grounding for Regulation Explorer and Loophole Finder (see the council verdict). Separate plan, lane B first.

## Merge and release procedure (integrator only)
1. Read all three status files. Every lane must say DONE for the wave.
2. In `redesign/main`: merge one lane at a time, `scripts/gate.sh` after each. A red gate means that lane's merge is reverted and sent back.
3. Deploy `redesign/main` as a preview (not prod) and run `e2e` against it.
4. You approve prod. Tag `redesign-wave-N`. Rollback target is the previous tag.

## Change requests
A lane that needs a contract change, a file it does not own, or a dependency writes one entry in its status file under `## Requests` (what, why, which lane it affects) and keeps working on something else. The integrator resolves it at the next sync point or earlier if blocking.

## Starting prompts
See [AGENT-PROMPTS.md](AGENT-PROMPTS.md). Paste one into each terminal.
