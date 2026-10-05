# API

Three Vercel serverless functions in `api/`. All are `POST` with a JSON body; `OPTIONS` is answered for CORS; any other method returns `405 {"error":"Method not allowed"}`. Errors are always `{ "error": "<message>" }`.

| Endpoint | Doc | Auth | Purpose |
|---|---|---|---|
| `POST /api/gemini` | [gemini.md](gemini.md) | Supabase Bearer token required | AI proxy for all tools (system prompt chosen server-side) |
| `POST /api/github` | [github.md](github.md) | None | Fetch scannable files from a public GitHub repo |
| `POST /api/embed` | [embed.md](embed.md) | None (see gotchas) | Embeddings and similar-scan lookup |

`/api/gemini` is called only by `scanService` (`callAI`, `callAIStream`) and `regulationsService` (`fetchRegulations`). `/api/github` is called only by `githubImport` (used by Audit and Debugger). `/api/embed` is called by `scanHistory.attachEmbedding` and `scanRun.findSimilarScans`. All live under `src/features/`; the allowlist is in `src/app/architecture.test.js`.

Security notes for `github` and `embed`: [../gotchas.md](../gotchas.md#known-endpoint-risks).
