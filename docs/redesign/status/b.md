# Lane B status

- Phase: B3
- State: DONE
- Last update: 2026-10-05
- Branch: redesign/b-backend

## Done
- Read-only prod dump (SELECT only via `supabase db query --linked`). Wrote `supabase/migrations/0002`-`0006` (extensions/enum, scan_history, reports, regulations, match_scans) and `supabase/tests/rls.sql`.
- Local CLI linked to prod project `shipsafe` (writes only `supabase/.temp/`, untracked).

## Prod vs code drift (not fixed, B1 mirrors prod)
- `users` table does not exist in prod. `getUserProfile`/`updateUserProfile` in `src/services/supabaseService.js` query it and always error.
- `regulations`: RLS on, zero policies. Anon/authenticated reads return no rows. Also code selects/filters `type` but the column is `regulation_type`.
- `scan_history`: no UPDATE or DELETE policy. `deleteScan` (client, anon key) deletes 0 rows with no error. Embedding save works only because `/api/embed` uses the service role.
- `reports`: no UPDATE policy (insert, delete, public select only).
- `match_scans`: SECURITY INVOKER, trusts `match_user_id`, executable by anon. Safe today only because `/api/embed` passes the verified user id.
- Table grants to anon/authenticated are full (Supabase default); RLS is the only gate.
- Code expects `increment_rate_limit` and `match_scans`: both exist in prod and match files in git.

- Verified locally: migrations 0001-0006 replay in order on a fresh Postgres 17 (DB-only stack, applied with psql because `supabase db reset` stalls pulling other service images). `supabase/tests/rls.sql`: 10/10 assertions pass. `scripts/gate.sh`: GATE GREEN.
- Note: local `auth.uid()` reads only `request.jwt.claim.sub`; `rls.sql` sets both that and `request.jwt.claims`.
- Added `supabase/config.toml` and `supabase/.gitignore` via `supabase init`.

### B2 (2026-10-05)
Commits on `redesign/b-backend`: match_scans fix `614d286` + `1f61ec4`, then the three B2 steps below. Each step ran the gate and was cross-checked before the next.
1. **`api/_lib` split** (`98e4091`). `auth.js` (unchanged), `rateLimit.js` (`checkRateLimit`), `providers.js` (pool, cooldowns, callers, SSE streaming, `generateEmbedding`), `validate.js` (gemini body, embedding shape, `parseGitHubUrl`). Function bodies moved verbatim (diffed against the old files); `SYSTEM_PROMPTS` stays in `gemini.js`. No contract change.
2. **Rate limits** (`6e482bb`). `0008_rate_limit_buckets.sql`: `rate_limits` gains `bucket` (PK `user_id, bucket, window_start`); `increment_rate_limit(p_window_start, p_bucket default 'gemini')` replaces the 1-arg function. Buckets: `gemini` 20/min (unchanged), `embed` 60/min (about 3 calls per scan), `github` 15/min (list + import). Limits are constants at the top of `embed.js` / `github.js`. Checked locally: legacy row lands in `gemini`, 0001-0008 replay on a fresh DB, `supabase/tests/rate_limits.sql` 9/9, `rls.sql` 13/13.
3. **API tests** in `tests/api/` (96 tests, mocked `fetch` and supabase-js, no network, no env files read). `gemini`, `embed`, `github` suites cover 401, 400, 429, provider failover, SSE framing, embed ownership filter (service-role save still filters `id` + verified `user_id`; similar uses the caller's client), GitHub name validation. `contract.test.js` parses `CONTRACTS.md` and replays every documented success shape, error code, the 401 body, the 20/min limit, SSE framing and the DB objects; editing the contract without a matching replay fails. Mutation check: 10 deliberate code breaks (drop rate limit, drop ownership filter, accept `..`, no failover, no `[DONE]`, wrong bucket, renamed key) each turned the suite red.

### Deploy order (apply by you, never `db push` from here)
1. Apply `0007` and `0008` first.
2. Then deploy the api code. Both migrations are safe with the old api code: 0008 keeps old callers in the `gemini` bucket, and 0007 only breaks old `/api/embed` `similar` (it sends `match_user_id`). So apply them together and deploy right after.
3. Reverse order breaks: new `embed`/`github` call `increment_rate_limit` with `p_bucket` (missing before 0008, they answer 502) and new `embed` calls `match_scans` without `match_user_id` (missing before 0007).

### Packages
No new packages. `package.json` change: `test` now runs `vitest run && npm run test:api`; `test:api` uses `tests/api/vitest.config.js` (lane A owns `vite.config.js`, so the API tests have their own config).

### B3 (2026-10-05)
Commits: `4074734` (contract test follows the documented 429), `f77ca3b` (logging). Gate green after each. No migration, no new package, no contract change.

**Log format.** `api/_lib/log.js`: `withLog(route, handler)` wraps each handler and emits one JSON line per request (stdout; stderr when status >= 500):
`{ts, level, msg:"request", requestId, route, action, userHash, status, latencyMs, stages:[{stage, ms, provider?, ok?, status?, attempt?, ttfbMs?}], errors?:[{where, name?, code?, status?}]}`.
- `requestId`: `x-vercel-id` if it is a safe token, else a UUID. `userHash`: first 16 hex of HMAC-SHA256(user id); set env `LOG_HASH_SALT` to salt it (optional). Never the raw id.
- `action`: validated against a fixed set (tool, embed action, list/import); anything else logs as `other`.
- Built from an allow-list. Errors keep only class name, a short code (e.g. `42501`) and a numeric status, never messages (provider errors echo response bodies). Replaced every `console.*` in `api/` (this removed the GitHub list-mode sample log, which printed a file path).
- Stages: `auth`, `rateLimit`, `provider` (one per attempt, with `attempt`, `ok`, `status`; streams also `ttfbMs`), `embed`, `db`.
- `tests/api/log.test.js`: shape, stages, hashing, hostile action/request-id, thrown handler, and a no-leak test over 17 scenarios (prompt, code, user token, provider keys, service role, GitHub token, email, raw user id, provider response and error bodies, DB error text, repo file names). Seven deliberate leaks (raw id, error message, prompt in a stage, `console.log(req.body)`, provider message, key in a field, unvalidated action) each turned it red.

**Regulations search: where the time goes.** Nothing below about the network or providers is measured: there are no provider keys in this lane and prod has no timings yet. What is measured is marked.
Path: `Regulations.jsx` -> `fetchRegulations` -> one non-streaming `POST /api/gemini` (`tool: "regulations"`) -> auth -> rate limit RPC -> provider call(s) -> client `JSON.parse`. The page shows a spinner until the whole JSON is back. No embed or DB stage is involved in this search.
| Stage | Evidence | Expected cost |
|---|---|---|
| Our handler code | Measured: 0.1 ms p50/p95 over 150 runs with instant upstreams | none |
| `auth` (`supabase.auth.getUser`, one HTTPS call to Supabase Auth per request) | Measured: Supabase project is `ap-southeast-2` (Sydney). Vercel function region is not set in `vercel.json`, so it is the project default (usually `iad1`, US East); the API does not expose it, so confirm under Settings > Functions | about 1 RTT US-AU, roughly 200-250 ms warm (estimate); more on a cold start (new TLS) |
| `rateLimit` (`increment_rate_limit` RPC, a write) | Same region hop | about 1 RTT plus the upsert, roughly 220-260 ms (estimate) |
| `provider` | Code: non-streaming, `max_tokens` 8192, Gemini 2.5 Flash with default thinking (no budget set), failover is sequential with no per-attempt timeout, in-memory rotor starts at Gemini on every cold start. The reply is up to 4 regulations plus coverage, about 1-1.5k output tokens (estimate from the 576-token two-regulation mock) | the dominant stage by a wide margin (seconds), varying with which provider is first |
So auth + rate limit is plausibly 0.5 s (up to about 1.3 s cold) of a request that is mostly provider time. A hung provider is the tail risk: no abort signal, so failover waits until the platform timeout.
To confirm after the next deploy: filter logs for `route=gemini action=regulations`, compare p50/p95 of each stage against `latencyMs`, and count requests where the first `provider` stage has `ok:false` (that is failover cost, sequential).
Rule of thumb for choosing a fix: if `provider` is above about 80% of `latencyMs`, do options 1 and 2. If `auth` + `rateLimit` is above about 25%, do option 4.

**Fix options** (none applied; each changes provider behavior or files outside this lane):
1. **Make the provider stage cheaper and bounded.** For `regulations` only: Gemini `thinkingBudget: 0`, order fast providers (Cerebras, Groq) first, add a per-attempt timeout (about 8 s via `AbortSignal.timeout`) so a slow or hung provider fails over instead of blocking. Tradeoff: a little less reasoning depth on a task that asks for facts, more load on the fast free tiers (more 429 cooldowns), and the timeout can cut off a legitimately slow answer. Lane B, changes provider behavior and cooldown tuning.
2. **Reuse answers by topic.** Cache normalized topic -> result server-side (the `regulations` table exists but has RLS with no policy; Wave 4 plans to use it) or at least keep the client cache in `sessionStorage`. Repeated or popular topics return near-instantly and spend no provider quota. Tradeoff: stale answers need a TTL (weeks is fine for regulations), and cached model output is unreviewed unless Wave 4 grounding lands first. Needs a migration (policy) plus lane A.
3. **Stream it.** `/api/gemini` already supports `stream: true` with the same contract; have `regulationsService` stream and render each regulation as its object completes (or show a skeleton plus a progress line). Total time is unchanged, perceived time drops sharply. Tradeoff: partial-JSON parsing on the client, and failover can no longer retry after the first byte. Lane A only, no contract change.
4. **Cut the Supabase round trips.** Verify the JWT locally (JWKS) instead of calling Auth, and/or set function `regions` near Sydney. Saves about 0.2-0.5 s per request on every route. Tradeoff: local verification no longer sees server-side sign-out or revocation until expiry, and a Sydney function adds a longer hop to the US-hosted LLM APIs. Small win for Regulations specifically; worth it only if the numbers show auth + rate limit is a large share.

### Deploy note for B3
API-only change, no migration. Order does not matter. Optional env `LOG_HASH_SALT` (any random string) salts the user hash.

## Blocked
(nothing)

## Requests
- Integrator: add `LOG_HASH_SALT` (optional, any random string) to `.env.example` and the Vercel env list; B does not own `.env.example`.
- Integrator: confirm the Vercel function region (Settings > Functions). It decides whether option 4 in the B3 findings matters.
- Integrator: `CONTRACTS.md` lists only 400/401/502 for `/api/embed` and `/api/github`. Both now also return `429 {"error"}` when over the limit (`ADDITIONS` in `tests/api/contract.test.js`). Please document it. Lane A: the client services already return `{error}` for non-OK, so no code change needed unless you want a friendlier message.
- Integrator: a rate-limit check failure on embed/github returns `502 {"error":"Rate limit check failed"}` (kept inside the documented codes); gemini keeps its documented `500`.
- Integrator: if you want one `npm test` config, merge `tests/api/vitest.config.js` into `vite.config.js` (`include: ['src/**/*.test.js', 'tests/api/**/*.test.js']`) and drop `test:api`.
