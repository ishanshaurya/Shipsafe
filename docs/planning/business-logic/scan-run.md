# Scan run module

Status: in progress. Part of the refactor sequence in [`../plans/refactor-sequence.md`](../plans/refactor-sequence.md) (item 1 — do first; items 2–3 build on it).

## Deepen scan run  _(in progress — phases 0–2 done)_

Goal: one module owns `call AI → normalize → score → suggestions → save`. Pages keep only UI state (loading/result/expand) and per-tool auto-expand rules.
File: `src/features/scan/scanRun.js` (+ `scanRun.test.js`); moved there in the folder reshape (item 6).

Findings from reading the code (what the plan is based on):
- 3 pages (Debugger, Audit, Loopholes) repeat the same ~15-line sequence; only Debugger streams, embeds, and finds similar scans.
- `saveScan` already truncates input to 500 chars, so page-level `.slice(0, 500)` is redundant, not drift.
- **Deploy Check and Stress Test removed** (2026-10-02) — scope is now AI regulations + code review. Stress Test was broken (never saved, always showed fallback, result shape disagreed with server prompt, Share button never rendered). Both come back later: see [`../frontend/parked-tools.md`](../frontend/parked-tools.md).

### Phase 0 — Confirm interface (no code)
- [x] Agree on call shape. Proposal: `runScan({ tool, payload, user, stream, onChunk })` → `{ result, score, suggestions, error }`; save is fire-and-forget when `user` is set.
- [x] Decide: normalize inside `runScan` (via per-tool map) or stay in pages? Proposal: inside; page-only extras (e.g. Audit `lineCount`) added after the call, so they are no longer saved.
- [x] Decide: embeddings only for debugger (current) or all tools? Proposal: keep debugger-only, behind the same module.
- [x] Decide: where similar-scans lookup lives. Proposal: `findSimilarScans(result, user)` exported from the same module.

### Phase 1 — Build the module with tests (no page changes)
- [x] Write `scanRun.js`: tool check → `callAI` / `callAIStream` → normalize → `extractScore` → `getSuggestions` → `saveScan`.
- [x] Tests (mock `callAI`, `saveScan`): success returns result+score+suggestions; AI error returns `{error}` and does not save; no user → no save; save failure is logged, not thrown.
- [x] Move debugger embed (`attachEmbedding`) + `findSimilarScans` behind it, tested.

### Phase 2 — Migrate simplest pages (one commit each)
- [x] Loopholes — uses `runScan`; page keeps only UI state and the auto-expand rule (high risk).
- [x] Audit — uses `runScan`; `lineCount` is now added in the page after the call, so it is no longer saved to `scan_history` (nothing read it). GitHub flow untouched (item 2).
- Verified: lint 0 errors, 35 tests, build. **Not yet manually checked** (needs `npx vercel dev` + a signed-in user): run each tool, confirm the scan row appears in Dashboard history.

### Phase 3 — Migrate Debugger (streaming + embeddings)
- [x] Debugger via `runScan({ stream: true, onChunk })`; similar-scans via `findSimilarScans`. The inline save and embed code in the page is gone. **Not yet manually checked:** streaming text rendering and the similar-scans panel need `npx vercel dev` and a signed-in user.

### Phase 4 — Cleanup & verify
- [ ] Remove dead code (per-page save blocks, unused imports); update the "ONLY FILE" header comments in `scanService.js` if now inaccurate.
- [ ] `npm run lint`, `npm test`, `npm run build` clean.
- [ ] Manual check: each tool runs logged-in and logged-out; scan appears in Dashboard history; Debugger streams and shows similar scans.
- [x] Split `supabaseService.js` by domain next to its feature (refactor item 4, data half): `scanHistory`, `reportService`, `shared/authHeader`.

## Next: one module per tool (refactor item 3)
- [ ] `debugger`, `audit`, `loopholes` (and later `deploy-check`, `stress-test`) each own prompt, normalize, score, suggestions, label; the shared scan run consumes them. Starts after phases 2–3 above.
