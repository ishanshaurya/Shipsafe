# CI

Workflows in `.github/workflows/`, Dependabot in `.github/dependabot.yml`.

| Workflow | Job | What turns it red |
|---|---|---|
| `ci.yml` | `lint` | `npm run lint` errors |
| | `test` | any failing vitest test |
| | `build` | `npm run build` fails |
| | `audit` | `npm audit --omit=dev --audit-level=high` finds a high/critical advisory (same as `scripts/gate.sh`) |
| | `gitleaks` | a secret in the commits the push/PR adds (value redacted in logs) |
| `e2e.yml` | `e2e` | preview deploy fails, or `api-auth.spec.js` fails. Signed-in `tools.spec.js` runs only when `E2E_EMAIL` and `E2E_PASSWORD` are both set (deferred) |

`ci.yml` runs on push and PR to `main` and `redesign/**`. `e2e.yml` runs on PRs and manual dispatch.

## Repo secrets (names only, set in GitHub → Settings → Secrets → Actions)

| Name | Required | Used for |
|---|---|---|
| `VERCEL_TOKEN` | yes | `vercel deploy` of the preview |
| `VERCEL_ORG_ID` | yes | links the CLI to the team |
| `VERCEL_PROJECT_ID` | yes | links the CLI to the project |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | if previews are protected | `x-vercel-protection-bypass` header so e2e reaches the preview |
| `E2E_EMAIL`, `E2E_PASSWORD` | no (deferred) | enables signed-in tests |

If a required Vercel secret is missing (fork PRs, not yet configured) the e2e job skips with a notice instead of failing. Preview env vars (Supabase, AI keys) live in the Vercel project, not in GitHub.

## Known leaks in history (not fixed here)

`gitleaks detect` over full history reports 2 findings, so CI scans only new commits to stay usable:

- `backend/.env`, rule `jwt`, commit `a2b59045` (2026-03-28)
- `src/pages/Debugger.jsx:43`, rule `generic-api-key`, commit `74cc4eb5` (2026-03-16)

Owner action: confirm what these are and rotate them if live. Removing them from history needs approval (rewrite + force push). Alternative: add their fingerprints to `.gitleaksignore` after rotation.

## Verified locally (no push)

- `actionlint` clean on both workflows.
- Throwaway clone with a committed fake token and a failing test: `gitleaks detect --log-opts=<base>..HEAD` exits 1 (1 leak), `npm test` exits 1. Clean range: 0 leaks.
- `npm run e2e -- api-auth.spec.js` (the CI e2e command with no E2E_* set): 6/6 against prod.
