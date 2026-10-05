# Lane B status

- Phase: B1
- State: DONE (B1). Waiting for sync point 1
- Last update: 2026-10-04
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

- B2 (partial): `0007_match_scans_caller_identity.sql` drops `match_user_id`, scopes to `auth.uid()`, revokes execute from public/anon, grants to authenticated. `api/embed.js` `similar` now calls via the caller-scoped client. `rls.sql` +3 assertions. Apply 0007 before deploying the `api/embed.js` change (signature changed).

## Blocked
(nothing)

## Requests
- Decide fixes for drift above (scan_history delete policy, regulations read policy, `type` vs `regulation_type`, users table). New migration for you to apply. Affects lane A for the column name.
