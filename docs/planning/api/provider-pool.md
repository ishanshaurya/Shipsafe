# AI proxy: provider pool

Refactor item 4 (API half).

- [ ] Move the provider pool (gemini / groq / cerebras / sambanova) out of `api/gemini.js` into `api/_lib/`.
- [ ] Keep `ALLOWED_TOOLS` and the per-tool system prompts server-side; allowed tools are now `debugger`, `audit`, `loopholes`, `regulations`.
- [ ] README roadmap: "Groq fallback API" is still open.
- [ ] Postman: `postman/` has only globals; add request examples for `/api/gemini`, `/api/github`, `/api/embed`.
- [ ] Rate limiting is Postgres-backed per user (`supabase/migrations/0001_rate_limits.sql`); no action, noted for context.
