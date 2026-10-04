# POST /api/embed

Embeddings via Gemini `text-embedding-004` (768 dimensions) and pgvector similarity over `scan_history`. Used by Debugger only today.
**Auth:** Supabase session required (`Authorization: Bearer <access_token>`, `401` otherwise). The user is taken from the token, never the body. **CORS:** `https://shipsafe-app.vercel.app`. Requires `GEMINI_API_KEY` (`500` if missing).

## Actions (`action` field)
| Action | Body | Returns |
|---|---|---|
| `generate` | `{ text }` | `{ embedding: number[] }` (text truncated to ~2000 chars) |
| `similar` | `{ embedding, currentScanId?, limit? = 5 }` (limit capped at 10) | `{ similar: [...] }` from RPC `match_scans` (cosine distance threshold 0.4) |
| `save` | `{ scanId, embedding }` | `{ success: true }` — updates `scan_history.embedding` only where `user_id` is the caller |

Errors: `401` no/invalid session · `400` missing fields, invalid action, `embedding` not 768 numbers, or `text` over 10k chars · `502` Gemini/Supabase failure.

## Notes
- `match_scans` and the `embedding` column are not in `supabase/migrations/`; TODO(confirm) where they are defined.
- DB access uses `SUPABASE_SERVICE_ROLE_KEY` if set (every query is filtered by the verified `user.id`), else the caller-scoped client. No rate limit yet.
