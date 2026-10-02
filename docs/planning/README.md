# Planning

Plans, TODOs and design notes. Lives in `docs/planning/`; the rest of `docs/` (overview, architecture, API, gotchas) is the stable project explanation — see [`../README.md`](../README.md).

| Folder | What's in it |
|---|---|
| [`plans/`](plans/) | Cross-cutting: [refactor sequence](plans/refactor-sequence.md) (order + status), [product roadmap](plans/roadmap.md) |
| [`business-logic/`](business-logic/) | [Scan run module](business-logic/scan-run.md), per-tool modules, scoring, data layer |
| [`api/`](api/) | [GitHub import](api/github-import.md), [AI provider pool](api/provider-pool.md), [endpoint hardening](api/endpoint-hardening.md), Postman |
| [`frontend/`](frontend/) | [Redesign](frontend/redesign.md), [parked Deploy/Stress tools](frontend/parked-tools.md), [backlog](frontend/backlog.md) |
| [`archive/`](archive/) | Stale history: `CHANGES.md` (2026-05-19 diagnosis) |

## Current priority
1. Scan run — migrate Loopholes, Audit, then Debugger; cleanup.
2. GitHub import module.
3. One module per tool; split grab-bags.
4. Frontend redesign F1 foundation can run on a branch in parallel; tool-page restyle waits for step 1.

## Queued for when you're back
- [ ] **Dev-only preview mode** (so the signed-in pages render on localhost without real Supabase keys). Brief:
  - Only when `import.meta.env.DEV` is true and an explicit opt-in is set (e.g. `VITE_PREVIEW=1`); no effect otherwise.
  - Fake session in `AuthProvider` (so `ProtectedRoute` lets Dashboard and tool pages through) and demo scan data; no network auth calls, no real tokens.
  - Must not ship: after `npm run build`, grep `dist/` to confirm the preview code is absent.
  - Document in `docs/gotchas.md` and `README` troubleshooting.
  - Not started: it is an auth-adjacent change, so it waits for your go-ahead.
- [ ] Fill real Supabase values in `.env.local` (user does this; AI keys + `npx vercel dev` for AI features).
- [ ] Next phase, pick one: scan-run Phase 3 (Debugger) or frontend F2 (Verdict module, tool registry, primitives). Frontend work is on branch `frontend-redesign`.

## Conventions
- Open work is a `- [ ]` checkbox in the file for its area; ordering and dependencies live only in `plans/refactor-sequence.md`.
- Update the status table there when an item changes state.
- A TODO comment in code should be one line pointing to the plan file here.
