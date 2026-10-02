# API

Three Vercel serverless functions in `api/`. All are `POST` with a JSON body; `OPTIONS` is answered for CORS; any other method returns `405 {"error":"Method not allowed"}`. Errors are always `{ "error": "<message>" }`.

| Endpoint | Doc | Auth | Purpose |
|---|---|---|---|
| `POST /api/gemini` | [gemini.md](gemini.md) | Supabase Bearer token required | AI proxy for all tools (system prompt chosen server-side) |
| `POST /api/github` | [github.md](github.md) | None | Fetch scannable files from a public GitHub repo |
| `POST /api/embed` | [embed.md](embed.md) | None (see gotchas) | Embeddings and similar-scan lookup |

Only `/api/gemini` is called through `src/services/scanService.js`. `/api/github` is called by Audit and Debugger (and `src/services/githubImport.js`); `/api/embed` by `supabaseService.attachEmbedding` and `scanRun.findSimilarScans`.

Security notes for `github` and `embed`: [../gotchas.md](../gotchas.md#known-endpoint-risks).
