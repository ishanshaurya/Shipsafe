# Frontend redesign

Refactor item 5 (UI primitives) is covered by F2 below. Tool-page restyle waits for the scan-run migration ([`../business-logic/scan-run.md`](../business-logic/scan-run.md)).

> Note: written before Deploy Checker and Stress Test were removed (2026-10-02). They are parked; see [`parked-tools.md`](parked-tools.md). The tool set is now two groups: Code review and AI regulation.

## Status (2026-10-02)
Built: tokens (F1), Verdict module (`src/utils/verdict.js`, thresholds 80 / 60 and tested), tool registry, Flag, VerdictBanner, Finding, CodePanel, RepoImport, Notice, shell rail + drawer (F3), Landing (F4), Dashboard (F5), Debugger / Audit / Loopholes (F6), Regulations (F7), Report / Login / 404 (F8), and ScoreRing is removed. Tool pages were restyled only; Debugger still has its own fetch logic (not on `scanRun` yet). Not done: F9 QA at 375px and a screen-reader pass, `shipReadiness.js` still carries its own 40 band and verdict labels, open decisions below.
The Tailwind Vite plugin is not installed, so tokens are plain `:root` variables, not `@theme`.

## Design source of truth
Full design in [`../../design/`](../../design/): [system](../../design/system.md), [components](../../design/components.md), [pages](../../design/pages.md). This file only tracks phases and open decisions.

Revisions from the first plan (critique pass): page color `#F6F7F3` → `#F2F5F7` (too close to warm cream); stage tags, numbered stages and uppercase eyebrows dropped with the pipeline; mono restricted to code; yellow is a fill only (navy on it); red text uses `#B42318`; only one orchestrated motion (the flag hoist).

## Open decisions (need the user)
- [ ] OK to create branch `frontend-redesign` (nothing committed unless asked).
- [ ] Verdict bands: Cleared ≥80, Held 60–79, Blocked <60 (drops the 40 band); severity critical/high → Blocked, medium → Held, low → Cleared; loophole risk inverted.
- [ ] Landing claims: keep "Free tier · no credit card" and "14+ countries covered"? Not verified in code.
- [ ] "See a sample report" needs a seeded public report slug, or link to the hero panel.
- [ ] Remove the dead `MOCK_SCANS` logged-out Dashboard fallback, or build a public demo.
- [ ] Regulations: show a "sample data" banner when the live lookup falls back.

Decisions already made: light theme · F1–F2 first · tool-page restyle (F6) waits for the scan-run migration · work on a branch (the app looks nearly unchanged until F3/F4 because pages hardcode `#000` and emerald).

## F1. Foundation  _(files: `index.html`, `src/index.css`, 3 pages)_
- [ ] Tokens in `src/index.css`: palette, greys/borders, type scale, radii, spacing, motion durations. Expose via Tailwind v4 `@theme` + CSS vars (pages use inline styles). Drop the unused navy set.
- [ ] Load fonts once via `<link>` + `preconnect` in `index.html`. Delete the `@import` lines in `Landing.jsx`, `Dashboard.jsx`, `Layout.jsx`, `index.css`.
- [ ] Base styles: body bg/text from tokens, visible `:focus-visible` ring, `prefers-reduced-motion` rule.
- [ ] One shared reveal keyframe set. Leave per-page keyframes until each page migrates.
- [ ] `npm run lint`, `npm test`, `npm run build` clean; app still renders.

## F2. Deep modules + primitives  _(files go flat in `src/components/` / `src/utils/` — no new folders until item 6)_
- [ ] **Verdict module** (candidate 1, Strong): one owner for score → cleared/held/blocked and severity → tone/label/shape. Replaces 7 private maps: `Debugger.jsx:22`, `Report.jsx:29`, `Regulations.jsx:73`, `Audit.jsx:138`, `NextSteps.jsx:10`, `ScoreRing` thresholds, `shipReadiness.js:107`. Label + shape ship with color (not color alone). Unit-test the thresholds (80 / 60 / 40).
- [ ] **Tool registry module** (candidate 2, Strong): the four tools with group (Code review / AI regulation), path, name, one-line purpose, icon. Replaces `Layout.jsx:9` NAV, `Landing.jsx:6` FEATURES, `Dashboard.jsx:19` actions; check `crossToolSuggestions.js`. Keep separate from item 3 (prompt/scoring per tool) or merge deliberately.
- [ ] Restyle `ScoreRing`: keep props (5 callers), default colors from the Verdict module, stencil number.
- [ ] `Button` (primary/secondary/ghost, sizes, Link support, loading), `Field` (Input/Textarea, label, focus, error). Only primitives that hide behavior.
- [ ] `Badge` (verdict or neutral) — replaces repeated `tag-pill` styling.
- [ ] Optional: dev-only `/design` gallery route; delete after F3.

## Deferred (after scan-run Phases 2–3; Phase 2 is done, Debugger is next)
- [ ] F3 Shell: rail grouped Code review / AI regulation from the tool registry; drawer below 1024. See `pages.md`.
- [ ] F4 Landing: hero with the sample review panel and the one-time flag hoist; tool list; how a scan works; mobile menu.
- [ ] F5 Dashboard: readiness block, per-tool rows, recent scans ledger, skeleton/empty/error states.
- [ ] F6 Tool pages: shared frame decision (candidate 3, Speculative) then Debugger, Audit, Loopholes.
- [ ] F7 Regulations: coverage summary, ledger, sample-data banner, remove cycling text.
- [ ] F8 Edges: Report, Login (+ forgot-password if prioritized), 404.
- [ ] F9 QA: contrast, keyboard focus, reduced motion, 375px, lint/test/build.
- [ ] Candidate 4 (generic Card/Section wrappers, Speculative): skip unless they hide behavior.
- Parked: Deploy Checker and Stress Tester restyle returns with the tools (`parked-tools.md`).
