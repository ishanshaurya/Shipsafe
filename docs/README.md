# ShipSafe docs

Everything about the project that is not code. Start with `overview.md`.

| File / folder | What's in it |
|---|---|
| [`overview.md`](overview.md) | What ShipSafe is, scope, non-goals, status |
| [`architecture.md`](architecture.md) | Stack, module map, request flow, external services |
| [`gotchas.md`](gotchas.md) | Things to know before changing or deploying anything |
| [`api/`](api/) | The three serverless endpoints: `/api/gemini`, `/api/github`, `/api/embed` |
| [`design/`](design/) | Current UI state and the planned redesign |
| [`decisions/`](decisions/) | ADRs: why scope and docs are the way they are |
| [`planning/`](planning/) | Roadmap, refactor sequence, per-area TODOs (plans, business-logic, api, frontend, archive) |

Keep this folder in step with the code: when an endpoint, env var or scope changes, update the matching file in the same change.
