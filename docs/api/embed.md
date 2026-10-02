# POST /api/embed

Embeddings via Gemini `text-embedding-004` (768 dimensions) and pgvector similarity over `scan_history`. Used by Debugger only today.
**Auth:** none (see [gotchas](../gotchas.md#known-endpoint-risks)). **CORS:** `https://shipsafe-app.vercel.app`. Requires `GEMINI_API_KEY` (`500` if missing).

## Actions (`action` field)
| Action | Body | Returns |
|---|---|---|
| `generate` | `{ text }` | `{ embedding: number[] }` (text truncated to ~2000 chars) |
| `similar` | `{ embedding, userId, currentScanId?, limit? = 5 }` | `{ similar: [...] }` from RPC `match_scans` (cosine distance threshold 0.4) |
| `save` | `{ scanId, embedding }` | `{ success: true }` — updates `scan_history.embedding` |

Errors: `400` missing fields or invalid action · `502` Gemini/Supabase failure.

## Notes
- `match_scans` and the `embedding` column are not in `supabase/migrations/`; TODO(confirm) where they are defined.
- Supabase client uses `SUPABASE_SERVICE_ROLE_KEY` if set, else the anon key.
