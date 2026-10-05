# Lane C status

- Phase: C1 (safety net)
- State: DONE (signed-in tests deferred)
- Last update: 2026-10-05
- Branch: redesign/c-qa

## Done
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
- Integrator: tool selectors were written from reading `src/` at this commit. Lane A's A1/A2 must keep accessible names (button labels, field labels, `Verdict` region) or tell C.
