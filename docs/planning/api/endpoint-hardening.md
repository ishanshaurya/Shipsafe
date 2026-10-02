# Endpoint hardening

Found while writing `docs/` (see [gotchas](../../gotchas.md#known-endpoint-risks)).

- [ ] `/api/embed`: verify the Supabase session like `/api/gemini` does; derive `userId` from the token, never the body.
- [ ] `/api/embed`: don't use the service-role key for user-scoped reads; rely on RLS or check ownership of `scanId`.
- [ ] `/api/embed`: add rate limiting.
- [ ] `/api/github`: require a session or rate limit per IP/user; restrict CORS.
- [ ] Add `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`.
- [ ] Commit the missing Supabase migrations (`scan_history`, `reports`, `regulations`, `users`, `match_scans`).
