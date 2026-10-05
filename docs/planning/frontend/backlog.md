# Frontend backlog

Small UI items not part of the redesign.

## Design

- [ ] Re-introduce a "how it works" / flow section on Landing and Dashboard once the toolset is settled. The CODE → LEGAL → DEPLOY pipeline framing and per-tool stage tags (`CODE` / `LEGAL` / `DEPLOY` pills) were removed; redesign rather than restore.
- [ ] Update the sidebar brand tagline ("BUILD · VALIDATE · DEPLOY" in `Layout.jsx`) and hero copy to match the final toolset.
- [ ] Landing nav has no mobile menu.
- [ ] Dashboard: skeleton loaders instead of plain "Loading…".
- [ ] Decide Ship-Readiness score design for two stages (code + legal) vs. re-adding deploy; currently weights are debugger 25 / audit 20 / loopholes 25, normalized by what has been scanned.
- [ ] Debugger: loading state shows mostly blank screen while a review runs ("Reviewing N lines" card has only grey skeleton bars, rest of the right pane empty). Add a spinner or code-themed widget (e.g. scanning line over code lines, step progress: connecting → analysing → building report) so it never looks idle. Keep it accessible (`role="status"`, respects `prefers-reduced-motion`). Check Audit and Loopholes for the same gap.
- [ ] Regulations: search takes too long. Investigate the latency (time the `/api/gemini` call vs. embed/retrieval vs. render, check provider-pool fallbacks and prompt size), then fix or add streaming/progress feedback.
- [ ] Audit (and Debugger): redesign the code box and the loading panel. While an audit runs the code box just sits there static and the right card is grey skeleton bars. Replace with a purpose-built running state: code box shows scan progress (line highlight sweeping, per-category checklist: security / quality / maintainability / AI patterns / deploy readiness ticking off), and the result card shows steps instead of bars. Share one component across Audit, Debugger and Loopholes.

## Carried over from the old diagnosis ([`../archive/CHANGES.md`](../archive/CHANGES.md), still open)

- [ ] ErrorBoundary around routes (a page crash blanks the app).
- [ ] Remove unused `@import "tailwindcss"` + dependency, or adopt it.
- [ ] Content-Security-Policy header in `vercel.json`.
- [ ] Save Regulations searches to scan history.
- [ ] Login: "Forgot password" flow.
- [ ] `LICENSE`, `CONTRIBUTING.md`, Postman request examples.
