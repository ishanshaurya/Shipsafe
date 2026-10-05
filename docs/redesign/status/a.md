# Lane A status

- Phase: Wave 2, A2 leftovers (one module per tool, shared GitHub picker)
- State: DONE (gate green, committed on redesign/a-frontend)
- Last update: 2026-10-05
- Branch: redesign/a-frontend

## Done
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
- Per-tool display label still lives in `shared/toolRegistry` (and a local `SCAN_NAME` in Debugger for similar scans), not in the tool modules.
- ErrorBoundary and the new hook have no automated test (node test env, no DOM). Needs the signed-in e2e or a manual check.
- No signed-in browser check has run for any of A1, A2 or Wave 2. Manual click-through needed before the preview is trusted.

## Blocked
(nothing for lane A)

## Requests
(none open) Integrator: CONTRACTS.md and PLAN.md already updated for the new module homes.
