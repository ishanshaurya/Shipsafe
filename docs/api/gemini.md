# POST /api/gemini

AI proxy. The client never sends a system prompt; it names a `tool` and the server picks the prompt.

**Auth:** `Authorization: Bearer <supabase access_token>`. Missing/invalid → `401 Sign in required`.
**Rate limit:** 20 requests per 60 s window per user, counted in Postgres via `increment_rate_limit` (`supabase/migrations/0001_rate_limits.sql`). Over limit → `429`. Counter failure → `500`.
**CORS:** `Access-Control-Allow-Origin: https://shipsafe-app.vercel.app`, headers `Content-Type` only (production is same-origin).

## Request
| Field | Type | Notes |
|---|---|---|
| `tool` | string | One of `debugger`, `audit`, `loopholes`, `regulations`; else `400 Invalid tool` |
| `userPrompt` | string | Required; max 300,000 chars (`400 Input too large`) |
| `stream` | boolean | `true` → server-sent events |

## Response
- **Non-streaming:** `200 { content: string, provider: string }`. `content` is the model's JSON as text; the client strips fences, parses and validates.
- **Streaming:** `text/event-stream`, lines `data: {"chunk": "<text>"}`, then `data: [DONE]` (parsed by `callAIStream`).

## Errors
`400` bad tool/prompt · `401` no session · `429` rate limit · `500` no providers configured / rate-limit check failed · `502` all providers failed · `503` (stream) all providers unavailable or unconfigured.

## Providers
Tried in rotation, skipping ones in cooldown: Gemini (`gemini-2.5-flash`), Groq, Cerebras, SambaNova. A provider is only used if its env var is set. A stream cannot switch provider after bytes are sent.

## Notes
- System prompts live in `api/gemini.js` (`SYSTEM_PROMPTS`) and define each tool's JSON shape; `scanService.validate` must stay in step with them.
- Planned: move the provider pool to `api/_lib/` ([planning](../planning/api/provider-pool.md)).
