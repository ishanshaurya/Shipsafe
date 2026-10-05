# Testing

| Layer | What it checks | Where | Run | Needs |
|---|---|---|---|---|
| Lint | eslint rules incl. hooks and e2e globals | repo | `npm run lint` | nothing |
| Unit (frontend) | services, tool modules, scan run, verdict, architecture rules | `src/**/*.test.js` | `npm test` | nothing |
| API | auth, validation, rate limits, provider failover, SSE, contract replay against `CONTRACTS.md` | `tests/api/` | `npm test` (or `npm run test:api`) | nothing; Supabase and providers are faked in `tests/api/harness.js` |
| DB (RLS) | row-level security on user tables | `supabase/tests/rls.sql` | see the header of that file | local Supabase only, never prod |
| e2e (unauthenticated) | `/api/gemini|github|embed` return 401 with no or bogus token | `e2e/api-auth.spec.js` | `BASE_URL=<url> npm run e2e -- api-auth.spec.js` | system Chrome, a deployed URL |
| e2e (signed in) | sign-in, Debugger + shared report, Audit, Loopholes, Regulations, GitHub import | `e2e/tools.spec.js` | `scripts/smoke.sh <url>` | **deferred**, see below |
| Health | page 200, API 401s, security headers, response times | `scripts/health.sh` | `scripts/health.sh <url>` | nothing; optional `VERCEL_AUTOMATION_BYPASS_SECRET` for protected previews |
| Gate | lint + test + build + audit | `scripts/gate.sh` | `scripts/gate.sh` | nothing |
| CI | the gate pieces split into jobs, gitleaks, preview e2e | `.github/workflows/` | on push/PR | repo secrets, see `docs/redesign/ci.md` |

One vitest config (`vitest.config.js`) covers `src/` and `tests/api/`. `tests/api/vitest.config.js` is a thin wrapper kept so `npm run test:api` still works.

## Which layer catches what

- Logic bug in a service or tool module: unit.
- Endpoint behaviour or a status code drifting from `CONTRACTS.md`: API contract tests.
- Missing auth check or auth stripped from a route: e2e unauthenticated and `health.sh`.
- Broken deploy, wrong headers, slow responses: `health.sh`.
- A tool page that renders but cannot complete a review: signed-in e2e.
- A secret in a new commit, a vulnerable dependency: CI (gitleaks, audit).

## Deferred: signed-in e2e

No e2e user exists (integrator decision 2026-10-05). `tools.spec.js` and `scripts/smoke.sh` are written but never run. To finish:

1. Owner creates a test account (candidate: a plus-alias of the owner's inbox), confirms the email, stores the password in the macOS Keychain, service `shipsafe-e2e`.
2. In the shell: `export E2E_EMAIL=...` and `export E2E_PASSWORD="$(security find-generic-password -s shipsafe-e2e -w)"`. Do not echo or commit them.
3. `scripts/smoke.sh <preview-url>` must pass.
4. Negative control: `E2E_STRIP_AUTH=1 scripts/smoke.sh <preview-url>` must fail. If it passes, the suite is not testing auth.
5. For CI, add `E2E_EMAIL` and `E2E_PASSWORD` as repo secrets; `e2e.yml` then runs the full suite instead of only `api-auth.spec.js`.
6. Fix selector drift first: lane A's UI changes may have renamed buttons or labels (`Run review`, `Verdict` region).

Traces, video and screenshots are off in `e2e/playwright.config.js` so credentials cannot land in artifacts. Keep them off.

## Known open item

`tests/api/contract.test.js` fails 4 assertions on `redesign/main`: it still lists 429 for `/api/github` and `/api/embed` as an undocumented addition, but `CONTRACTS.md` now documents it. Lane B should drop those two entries from `ADDITIONS` and add them to the replay map.
