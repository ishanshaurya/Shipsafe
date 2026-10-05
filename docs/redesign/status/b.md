# Lane B status

- Phase: B2
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

## Blocked
(nothing)

## Requests
- Integrator: `CONTRACTS.md` lists only 400/401/502 for `/api/embed` and `/api/github`. Both now also return `429 {"error"}` when over the limit (`ADDITIONS` in `tests/api/contract.test.js`). Please document it. Lane A: the client services already return `{error}` for non-OK, so no code change needed unless you want a friendlier message.
- Integrator: a rate-limit check failure on embed/github returns `502 {"error":"Rate limit check failed"}` (kept inside the documented codes); gemini keeps its documented `500`.
- Integrator: if you want one `npm test` config, merge `tests/api/vitest.config.js` into `vite.config.js` (`include: ['src/**/*.test.js', 'tests/api/**/*.test.js']`) and drop `test:api`.
