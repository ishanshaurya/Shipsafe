# Lane A status

- Phase: Wave 3, A3 (UI primitives, loading/error states audit)
- State: DONE (gate green except tests/api/contract.test.js, red on redesign/main before A3; see Requests)
- Last update: 2026-10-05
- Branch: redesign/a-frontend

## Done
- A3 (after `git merge --ff-only redesign/main`; no new packages, `package.json` and lockfile untouched):
  - `src/shared/ui/`: Button, Card, Field, Badge, Spinner, Skeleton/SkeletonLines, EmptyState, ErrorState, Notice (moved from `shared/components`), Progress, `useProgressStep`. Render tests in `ui.test.js` (react-dom/server, no new dependency). Commit 4e37390.
  - Adopted in Debugger (35667d3), Audit and Loophole Finder (a513903), Regulations (5479cb8), Dashboard (07f4cb4), Report (da62517), and Login, RepoImport, ReportButton, CodePanel, Layout (ec30bb0). Landing still uses its own `ls-btn` styles.
  - Loading: Debugger names its step and counts findings as they stream in (the old "mostly blank" panel). Audit, Loophole Finder and Regulations show named steps (Regulations: Connecting, Analysing laws and drafts, Building checklist) in a `role="status"` region. Steps without a real signal advance on a timer, so they are an estimate. Dashboard shows its skeleton from the first paint instead of flashing mock rows.
  - Errors: a Try again button on every tool, the Regulations sample-data fallback, GitHub import, report-link creation, Dashboard load, and the shared report page. Report now tells "load failed" (retry) apart from "not found".
  - Empty states: Regulations with zero results got one. The tools, Dashboard and Regulations landing already had them.
  - `prefers-reduced-motion`: the existing global rule in `index.css` already collapses animations (spinner, skeleton pulse, banner hoist). Progress is plain text, so nothing else was needed.
  - `aria-busy` removed from the result regions of the four tool pages: it silenced the new progress announcements.
  - Accessible names: no label, button name or Verdict region changed. New names added: `Try again` (retry buttons), `Progress` (aria-label on the step list), and sr-only loading texts ("Loading ship readiness", "Loading recent scans"). None contains a string `e2e/tools.spec.js` matches by substring (checked).
- Wave 2 leftovers (after `git merge --ff-only redesign/main`):
  - `useRepoImport` (`features/github-import/`) replaces the duplicated picker state and handlers in Debugger and Audit (077a74a). `RepoImport` markup and labels untouched.
  - One module per tool (f72ef04, 94545ba): `features/{debugger,audit,loopholes}/<tool>Tool.js` own prompt, validate, normalize, score, input field and suggestions, registered in `features/scan/toolModules.js`. `scanService` and `scanRun` dispatch through it. `extractScore` and `crossToolSuggestions` removed (folded in). Pages moved next to their modules; `features/tools/` is gone. Regulations already was its own module (`regulationsService`), left as is.
  - Selectors check: every label and button name used by `e2e/tools.spec.js` still exists in `src/`; no label, aria or placeholder line changed. Signed-in e2e still not run (deferred, see c.md).
  - Gate: lint clean, 50 of 50 tests, build OK, audit 0.
- A1: all `/api/*` calls go through services (commit 6f45c62).
- A2 steps 1-3 (dc92623): files moved into `src/{app,shared,features/*}` by `git mv` with every import and test mock rewritten from a move map. `supabaseService` split into `features/scan/scanHistory.js`, `features/reports/reportService.js`, `shared/authHeader.js`. Regulations code left `scanService` for `features/regulations/`. Mock data moved next to its only user.
- Step 4: `features/auth/authService.js` is now the only Supabase Auth caller. Login and AuthProvider use it. 3 tests added.
- Step 5: `app/ErrorBoundary.jsx` wraps the app (outside router and auth provider).
- `app/architecture.test.js`: allowlist for `/api` callers, allowlist for Supabase-client importers, 400-line cap. Old `src/services/`, `pages/`, `components/`, `hooks/`, `utils/`, `lib/`, `data/` folders are gone.
- Dead code deleted (no callers): getScanById, deleteScan, getRegulations, getRegulationById, getUserProfile, updateUserProfile, MOCK_REGULATIONS, SCAN_COLORS.
- Verified every moved page and component differs from its A1 version only in import lines, except the three auth calls in `Login.jsx`. No label, field name, text or markup changed, so lane C selectors still hold.
- Gate: lint clean, 49 of 49 tests, build OK, audit 0.

## Notes
- Per-tool display label still lives in `shared/toolRegistry` (and a local `SCAN_NAME` in Debugger), not in the tool modules.
- No DOM test environment: ErrorBoundary, the hooks and the page-level states have no automated test; only the `ui` primitives do (server render).
- No signed-in browser check has run for any of A1, A2, A3 or Wave 2. Manual click-through needed before the preview is trusted, especially the new progress, retry and error states (force one with the network offline).
- Backlog items touched: "Debugger loading state", "Dashboard skeleton loaders" (the integrator ticks them).

## Blocked
(nothing for lane A)

## Requests
- Integrator / lane B: `tests/api/contract.test.js` fails on `redesign/main` at c08a255 (4 tests, not touched by lane A): CONTRACTS.md now documents `429` for `/api/github` and `/api/embed`, but the replay table has no 429 case, and `errorCodes()` reports `502` twice for those routes (expected `[400,401,404,429,502,502]`, got `[400,401,404,502]`). So `scripts/gate.sh` is red on the baseline. Lane A ran lint, `vitest run src`, build and audit for each commit instead.
