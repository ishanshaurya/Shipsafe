# Lane A status

- Phase: A2 (feature folders)
- State: DONE in code (gate green, committed on redesign/a-frontend). Item 3 (one module per tool) NOT done, see Notes.
- Last update: 2026-10-04
- Branch: redesign/a-frontend

## Done
- A1: all `/api/*` calls go through services (commit 6f45c62).
- A2 steps 1-3 (dc92623): files moved into `src/{app,shared,features/*}` by `git mv` with every import and test mock rewritten from a move map. `supabaseService` split into `features/scan/scanHistory.js`, `features/reports/reportService.js`, `shared/authHeader.js`. Regulations code left `scanService` for `features/regulations/`. Mock data moved next to its only user.
- Step 4: `features/auth/authService.js` is now the only Supabase Auth caller. Login and AuthProvider use it. 3 tests added.
- Step 5: `app/ErrorBoundary.jsx` wraps the app (outside router and auth provider).
- `app/architecture.test.js`: allowlist for `/api` callers, allowlist for Supabase-client importers, 400-line cap. Old `src/services/`, `pages/`, `components/`, `hooks/`, `utils/`, `lib/`, `data/` folders are gone.
- Dead code deleted (no callers): getScanById, deleteScan, getRegulations, getRegulationById, getUserProfile, updateUserProfile, MOCK_REGULATIONS, SCAN_COLORS.
- Verified every moved page and component differs from its A1 version only in import lines, except the three auth calls in `Login.jsx`. No label, field name, text or markup changed, so lane C selectors still hold.
- Gate: lint clean, 49 of 49 tests, build OK, audit 0.

## Notes
- Refactor item 3 (one module per tool, each owning normalize, score, suggestions, label) is not done. It means moving the normalizers out of `scanService`, which is a design change beyond a safe move. Left for a later wave if wanted.
- The loading, error and file-picker state is still duplicated in Debugger and Audit (candidate for one hook).
- ErrorBoundary has no automated test (node test env, no DOM). Needs the signed-in e2e or a manual check.
- No signed-in browser check has run for any of A1 or A2. Manual click-through needed before the preview is trusted.

## Blocked
(nothing for lane A)

## Requests
- Integrator, CONTRACTS.md "Client service surface": function names are unchanged but module homes moved. `scanService` (callAI, callAIStream, validate, normalizers), `scanRun`, `scanHistory` (saveScan, getScanHistory, attachEmbedding, embeddingText), `reportService` (saveReport, getReportBySlug), `shared/authHeader` (authHeader), `githubImport`, `regulationsService` (fetchRegulations). `getScanById` and `deleteScan` were deleted (no callers).
- Integrator, root `AGENTS.md` "Layout rules" and README "Project structure" still describe `src/pages|components|services`. Both need the new layout. Not lane A files.
