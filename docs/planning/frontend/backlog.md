# Frontend backlog

Small UI items not part of the redesign.

## Design

- [ ] Re-introduce a "how it works" / flow section on Landing and Dashboard once the toolset is settled. The CODE → LEGAL → DEPLOY pipeline framing and per-tool stage tags (`CODE` / `LEGAL` / `DEPLOY` pills) were removed; redesign rather than restore.
- [ ] Update the sidebar brand tagline ("BUILD · VALIDATE · DEPLOY" in `Layout.jsx`) and hero copy to match the final toolset.
- [ ] Landing nav has no mobile menu.
- [ ] Dashboard: skeleton loaders instead of plain "Loading…".
- [ ] Decide Ship-Readiness score design for two stages (code + legal) vs. re-adding deploy; currently weights are debugger 25 / audit 20 / loopholes 25, normalized by what has been scanned.

## Carried over from the old diagnosis ([`../archive/CHANGES.md`](../archive/CHANGES.md), still open)

- [ ] ErrorBoundary around routes (a page crash blanks the app).
- [ ] Remove unused `@import "tailwindcss"` + dependency, or adopt it.
- [ ] Content-Security-Policy header in `vercel.json`.
- [ ] Save Regulations searches to scan history.
- [ ] Login: "Forgot password" flow.
- [ ] `LICENSE`, `CONTRIBUTING.md`, Postman request examples.
