# ShipSafe

**What:** a developer toolkit that checks AI projects before they ship. **For:** developers building AI products. **Why:** answer two questions — *Is my code safe?* and *Is my project legal?*

## Tools (in scope)
| Tool | Route | Purpose |
|---|---|---|
| AI Debugger | `/debugger` | Bugs, security holes, vibe-code smells; streaming; optional GitHub repo import |
| Vibe-Code Audit | `/audit` | Scored project report across 5 categories; GitHub import |
| Regulations | `/regulations` | AI-surfaced regulations by topic, with developer checklist |
| Loophole Finder | `/loopholes` | Legal grey areas per system and target countries |

Supporting features: Supabase auth (email + GitHub), scan history and Ship-Readiness Score on the Dashboard, cross-tool "next step" suggestions, public shareable reports (`/report/:slug`), similar past scans (Debugger only).

## Out of scope (parked, not deleted from the plan)
- **Deploy Checker** and **Stress Tester** — removed 2026-10-02 (see [ADR-0001](decisions/0001-scope-code-review-and-regulations.md), [parked-tools](planning/frontend/parked-tools.md)).
- The CODE → LEGAL → DEPLOY "pipeline" framing, removed from Landing/Dashboard/README with them.

## Status
Live at shipsafe-app.vercel.app (per README). Mid-refactor: scan-run module, GitHub import module and a frontend redesign are in progress — see [`planning/plans/refactor-sequence.md`](planning/plans/refactor-sequence.md).
