# Phase readiness

Plan the phase before starting it. Every phase must pass the gate, then has a brief of the things to know. Written 2026-10-02 after reading the pages and `scanRun.js`.

## Gate (every phase)
- [ ] Baseline green: `npm run lint` (0 errors), `npm test`, `npm run build`.
- [ ] Brief below read; behaviours-to-preserve list copied into the PR/commit notes.
- [ ] Working tree understood: other sessions' uncommitted work is not touched or reverted.
- [ ] Docs to update named up front (`docs/architecture.md`, `docs/api/*`, `docs/gotchas.md`) and updated in the same change.
- [ ] Manual check script written before coding; done after.
- [ ] No commit unless asked.

## Architecture lens (deletion test, glossary terms)
| Candidate | Module it deepens | Evidence | Strength |
|---|---|---|---|
| Scan run | `scanRun.js` | 3 pages repeated call → normalize → score → suggestions → save; deleting it re-spreads that across 3+ pages | Strong, built |
| GitHub import | `githubImport.js` + hook | 8 `useState`s + 3 fetch handlers duplicated in Audit and Debugger | Strong, service built, hook held |
| Verdict | one score/severity → tone/label/shape module | 7 private maps (`Debugger`, `Report`, `Regulations`, `Audit`, `NextSteps`, `ScoreRing`, `shipReadiness`) | Strong |
| Tool registry | one list of tools (name, path, icon, group, blurb) | `Layout` NAV, `Landing` FEATURES, `Dashboard` TOOLS | Strong |
| Per-tool module | prompt + normalize + score + label per tool | logic split across `scanService`, `scanRun`, `crossToolSuggestions`, pages | Worth exploring (after item 1) |
| Shared tool page frame | header / input / result ledger / next steps | all four tool pages | Speculative, collides with items 1 and 3 |

## Briefs

### Scan run Phase 3 — Debugger (next)
- **Preserve:** streaming text shown live then cleared; result auto-expands critical + high; GitHub quick import does **not** auto-run (Audit's does); `lang` and `ctx` set from repo; similar-scans fetched only when signed in and never blocks the result; embedding attached after save.
- **Change:** `runScan({ tool: "debugger", payload: { code, language, context }, user, stream: true, onChunk })`; similar scans via `findSimilarScans("debugger", result, user)` — a non-blocking call after `setResult`.
- **Watch:** `INPUT_FIELD.debugger = "code"` (full code, saveScan truncates to 500); `EMBEDDED_TOOLS` = debugger only; `setStreamingText("")` must run on both success and error.
- **Docs:** `docs/architecture.md` module map (scanRun now used by all three tools).
- **Done when:** page has no direct `saveScan` / `attachEmbedding` / `/api/embed` calls; lint, test, build green; manual stream + similar-scans check.

### Scan run Phase 4 — cleanup
- Remove now-unused `saveScan`/`getSuggestions` imports in pages, update the "ONLY FILE" header in `scanService.js` if inaccurate, grep for dead `getMock*`.
- `Dashboard` mock fallback (`MOCK_SCANS`) is reachable only when logged out, but every Dashboard route is behind `ProtectedRoute`: confirm dead and remove, or keep for a future public demo (decision).

### GitHub import (item 2)
- **Contract:** `onImport({ code, repo, files, fileCount, totalLines })`. `repo` is passed identically on the quick and picked paths (today quick uses `data.repo`, picked uses `filePickRepo`; unifying is the one deliberate behaviour change).
- **Preserve:** Audit auto-runs after import (`setTimeout 50` stays in the page); Debugger fills `lang`/`ctx`; picker pre-checks `autoSelected`; total size shown from selected files.
- **Bug to fix on the way:** Audit `fetchSelectedFiles` returns on `!res.ok` without resetting `githubLoading`, so the button stays loading after an error. The service/hook owns loading, so this disappears.
- **Design (from council):** hook slimmer than the first 17-member proposal; status-driven view; derive `selectedSize`; use the `AbortSignal` to ignore stale responses (import A then B, A lands last).
- **Known limit, out of scope:** `api/github.js` returns only the ≤25 files `smartSelect()` picks.
- **Tests:** vitest env is `node` and matches `src/**/*.test.js`; check `@testing-library/react` before adding hook tests; otherwise keep logic in pure helpers.
- **Docs:** `docs/api/github.md` if request shapes change (they should not).

### Per-tool modules (item 3)
- Starts only after Phase 3. Decide first: tool registry (UI metadata) and per-tool module (prompt/normalize/score) are separate modules; do not merge by accident.
- Server prompts stay in `api/gemini.js`; client modules must not duplicate shape knowledge beyond `validate`.

### Grab-bags (item 4)
- `api/gemini.js` → `api/_lib/` (providers, cooldowns, prompts). Preserve: CORS, session check, 20/60s limit, fallback order, stream cannot switch mid-stream. Add tests for provider ordering/cooldown before moving.
- `supabaseService.js` split by domain next to its feature: done (`scanHistory`, `reportService`, `shared/authHeader`).
- Fold in `endpoint-hardening.md` only if the user asks; it changes behaviour.

### Folder reshape (item 6)
- Gate: items 1–4 landed, tree clean. Run `/sdlc` for the move map (`app/`, `features/*`, `shared/`, `api/_lib/`) and get approval before any `git mv`.

### Frontend F1–F2
- See [`../frontend/redesign.md`](../frontend/redesign.md) and [`../../design/`](../../design/). Needs the branch OK and verdict-band decision first.
