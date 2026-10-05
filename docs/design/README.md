# Design

The full frontend design, top to bottom. Design only; no code is implemented yet.

| File | What's in it |
|---|---|
| [`system.md`](system.md) | Concept, critique pass, color/type/space/motion tokens, verdict rules, voice, accessibility floor |
| [`components.md`](components.md) | Deep modules (Verdict, tool registry), primitives, state matrix |
| [`pages.md`](pages.md) | App shell and every page: Landing, Login, Dashboard, Debugger, Audit, Loopholes, Regulations, Report, 404 |
| [`../planning/frontend/redesign.md`](../planning/frontend/redesign.md) | Phases F1–F9 and open decisions |

## Current state (verified in code)
- Dark UI. Tokens in `src/index.css` (`--bg-primary #070b12`, accent `#0ea5e9`, Syne + IBM Plex Mono) are used only by the Dashboard.
- Pages style themselves with ~700 inline `style={{}}`; recurring accent is emerald `#34d399` on near-black. Tailwind v4 is imported but effectively unused.
- Per the frontend handoff (TODO(confirm)): competing fonts (Inter, Outfit, JetBrains Mono), per-page font `@import`s, six duplicated `@keyframes spin`.
- Verdict logic lives in `src/shared/verdict.js`; `ScoreRing` was removed when the verdict banner replaced it.
- All app pages are behind `ProtectedRoute`; only Landing, Login, `/report/:slug` and 404 are public.

## Rules while the redesign is pending
- Design work does not touch tool-page logic (the scan-run migration owns it).
- New UI files go in the owning `src/features/<feature>/` folder, or `src/shared/components/` if several features use them.
