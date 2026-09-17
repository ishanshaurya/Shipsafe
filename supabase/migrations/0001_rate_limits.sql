-- Persistent per-user rate limiting for the AI endpoints (/api/gemini).
--
-- Replaces the previous limiter, which was in-memory and keyed by IP:
--   - reset on every serverless cold start (effectively no limit most of the time)
--   - keyed by IP, so users behind the same NAT/VPN shared one quota
--
-- Users can read their own rows via RLS, but have no direct write access —
-- otherwise they could reset their own counter. All writes go through
-- increment_rate_limit, which only ever touches the caller's own row.

create table if not exists public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, window_start)
);

alter table public.rate_limits enable row level security;

create policy "rate_limits_select_own"
  on public.rate_limits for select
  using (auth.uid() = user_id);

-- Atomically increments (or creates) the counter for the calling user's
-- current rate-limit window and returns the resulting count in one round
-- trip. SECURITY DEFINER because users have no write policy on the table;
-- auth.uid() still resolves from the caller's JWT, so it can only increment
-- the caller's own counter.
create or replace function public.increment_rate_limit(p_window_start timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.rate_limits (user_id, window_start, request_count)
  values (auth.uid(), p_window_start, 1)
  on conflict (user_id, window_start)
  do update set request_count = rate_limits.request_count + 1
  returning request_count into new_count;

  return new_count;
end;
$$;

revoke execute on function public.increment_rate_limit(timestamptz) from public, anon;
grant execute on function public.increment_rate_limit(timestamptz) to authenticated;

-- Best-effort cleanup so the table doesn't grow unbounded. Not scheduled
-- automatically — run manually or wire to Supabase's pg_cron if desired.
create or replace function public.prune_rate_limits(p_older_than timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < p_older_than;
$$;

-- Admin-only: without this, any user could call it and wipe everyone's counters.
revoke execute on function public.prune_rate_limits(timestamptz) from public, anon, authenticated;
