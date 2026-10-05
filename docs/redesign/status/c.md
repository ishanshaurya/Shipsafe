# Lane C status

- Phase: 4a (grounding eval design)
- State: DONE (signed-in tests deferred; baseline answers not collected, needs owner session)
- Last update: 2026-10-05
- Dependencies needed (baton is lane A this wave): none. Script change for the baton holder, optional: `"test": "vitest run"` and drop `test:api` (root `vitest.config.js` now runs both; current `npm test` still works but runs the API tests twice).
- Branch: redesign/c-qa

## Done (4a)
- `git merge --ff-only redesign/main` ok. Gate green (lane B's contract test is fixed upstream, so the earlier request is closed).
- `tests/fixtures/regulations/questions.json`: 20 questions, 15 jurisdictions/standards, required names + forbidden claims; 3 required names marked `needs_human_check` (TAKE IT DOWN Act, Colorado AI Act, Korea AI Basic Act). `known-regulations.json`: 82 real laws/standards for flagging unfamiliar names. `samples/{good,bad}/` hand-written responses.
- `scripts/grounding-eval.mjs`: offline scorer + CLI (coverage, forbidden hits, unlisted names, citation; `--json`, `--strict`, `--min-coverage`, `--max-hallucinations`). No network, no keys.
- `scripts/grounding-eval.test.js`: 16 tests (fixture sanity, good vs bad responses, matching edge cases). `vitest.config.js` include extended with `scripts/**/*.test.js`.
- `docs/redesign/grounding-eval.md` (metrics, limits, collection protocol, proposed success criteria); `testing.md` updated.
- No package.json or lockfile changes.
- Facts in fixtures are from model knowledge, not checked against live sources: owner/lawyer review needed before treating as ground truth.
- Not done: baseline collection (needs a signed-in session), Loophole Finder scoring.

## Done (C3)
- Merged `redesign/main` (normal merge, no conflicts); backlog TODO edit committed first as its own docs commit.
- `scripts/health.sh <url>`: page 200, 5 security headers, `/api/gemini|github|embed` 401 without token, response times; exit 1 on failure. Verified on prod (HEALTHY) and against a bad URL (exit 1).
- Root `vitest.config.js` runs `src/` and `tests/api/` together. `tests/api/vitest.config.js` kept as a thin wrapper so `npm run test:api` works. `vite.config.js` untouched.
- `docs/redesign/cost-alerts.md`, `docs/redesign/testing.md`.
- No package.json or lockfile changes.

## Done (C2)
- `.github/workflows/ci.yml`: lint, test, build, audit, gitleaks as separate jobs; triggers on `main` and `redesign/**`.
- `.github/workflows/e2e.yml`: preview deploy via Vercel CLI, then `api-auth.spec.js` only unless `E2E_EMAIL`/`E2E_PASSWORD` set. Skips with a notice if Vercel secrets are missing.
- `.github/dependabot.yml`: npm + github-actions, weekly.
- `e2e/playwright.config.js`: optional `x-vercel-protection-bypass` header from `VERCEL_AUTOMATION_BYPASS_SECRET`.
- `docs/redesign/ci.md`: jobs, secret names, verification.
- Red check shown locally: fake token + failing test in a throwaway clone turns gitleaks and vitest red. actionlint clean.
- No app code, package.json or lockfile changes.

## Done (C1)
- Playwright (`@playwright/test`) added as devDependency; `npm run e2e` script. Baton held (package.json, lockfile).
- `e2e/playwright.config.js`: needs `BASE_URL`; traces, video, screenshots off so credentials never land in artifacts.
- `e2e/fixtures.js`: UI sign-in per test from env vars, no storageState file. `E2E_STRIP_AUTH=1` removes the Authorization header from `/api/*` calls (negative control).
- `e2e/api-auth.spec.js`: `/api/gemini|github|embed` return 401 `{"error":"Sign in required"}` with no token and with a bogus token. Passes against https://shipsafe-app.vercel.app (6/6).
- `e2e/tools.spec.js`: sign in, Debugger review plus report link opened signed-out, Audit, Loophole Finder, Regulations, public GitHub import.
- `scripts/smoke.sh <base-url>`; eslint block for `e2e/**` (node globals).
- `scripts/gate.sh`: GATE GREEN.

## Deferred (integrator decision 2026-10-05)
- No E2E user signed up. All of `tools.spec.js` (needs sign-in) is DEFERRED: sign-in, Debugger + shared report, Audit, Loophole Finder, Regulations, GitHub import.
- Chromium download stopped (was hanging; no process left). `e2e/playwright.config.js` now uses `channel: 'chrome'` (system Chrome, /Applications/Google Chrome.app).
- Unauthed `api-auth.spec.js` needs no user; re-run with system Chrome to confirm.
- To finish later: create user (see below), set `E2E_EMAIL`/`E2E_PASSWORD`, run `tools.spec.js`, then `scripts/smoke.sh https://shipsafe-app.vercel.app` (must pass) and `E2E_STRIP_AUTH=1 scripts/smoke.sh ...` (must fail).
- Candidate user: `ishannshaurya+shipsafe-e2e@gmail.com`, password in macOS Keychain service `shipsafe-e2e`. Needs owner approval.

## Requests
- RESOLVED upstream (gate green at 4a). Was: lane B / integrator: `tests/api/contract.test.js` fails 4 assertions on `redesign/main` (also with lane B's original config, so not caused by the config merge). It lists 429 for `/api/github` and `/api/embed` under `ADDITIONS` (undocumented), but commit `c08a255` documented 429 in `CONTRACTS.md`. Fix in lane B's file: remove the two 429 entries from `ADDITIONS` and add them to the replay map. Until then `scripts/gate.sh` and CI `test` are red. File is outside lane C's scope, so not edited.
- Integrator/owner: full-history gitleaks finds 2 existing leaks (`backend/.env` JWT in `a2b59045`; generic key in `src/pages/Debugger.jsx:43` in `74cc4eb5`). Rotate if live; history rewrite needs approval. Details in `docs/redesign/ci.md`. CI scans new commits only.
- Owner: set repo secrets listed in `docs/redesign/ci.md`.
- Integrator: tool selectors were written from reading `src/` at this commit. Lane A's A1/A2 must keep accessible names (button labels, field labels, `Verdict` region) or tell C.
