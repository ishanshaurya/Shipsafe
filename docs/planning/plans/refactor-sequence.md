# Refactor sequence

Architecture refactor — do in order (later items build on earlier ones). Detail lives in the area folders.

| # | Item | Status | Detail |
|---|------|--------|--------|
| 1 | Deepen scan run — one module owns call AI → normalize → score → suggestions → save | In progress (phases 0–2 done; next: Debugger) | [`../business-logic/scan-run.md`](../business-logic/scan-run.md) |
| 2 | Deepen GitHub import — one module hides `/api/github` modes + state; Audit and Debugger consume it | Not started (`githubImport.js` exists, uncommitted) | [`../api/github-import.md`](../api/github-import.md) |
| 3 | One module per tool — each owns prompt, normalize, score, suggestions, label | Not started | [`../business-logic/scan-run.md`](../business-logic/scan-run.md) |
| 4 | Split grab-bags — provider pool to `api/_lib/`; split `supabaseService.js` by domain | Not started | [`../api/provider-pool.md`](../api/provider-pool.md) |
| 5 | UI primitives — Card/Badge/Section after pages shrink; reassess then | Not started | [`../frontend/redesign.md`](../frontend/redesign.md) (F2) |
| 6 | Reshape folders — `app/`, `features/{scan,tools,github-import,regulations,reports,auth,dashboard,landing}/`, `shared/`, `api/_lib/` (alongside/after 1–4, not before) | Not started | this file |

Scope note (2026-10-02): Deploy Check and Stress Test removed; focus is AI regulations + code review. Their return is parked in [`../frontend/parked-tools.md`](../frontend/parked-tools.md).
