-- Separate rate-limit buckets per endpoint (gemini, embed, github) so one
-- endpoint's traffic doesn't consume another's quota.
-- Backward compatible: existing rows and callers that omit p_bucket stay in
-- the 'gemini' bucket, so this is safe to apply before the api deploy.
alter table public.rate_limits add column bucket text not null default 'gemini';

alter table public.rate_limits drop constraint rate_limits_pkey;
alter table public.rate_limits add primary key (user_id, bucket, window_start);

drop function public.increment_rate_limit(timestamptz);

create function public.increment_rate_limit(p_window_start timestamptz, p_bucket text default 'gemini')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.rate_limits (user_id, bucket, window_start, request_count)
  values (auth.uid(), p_bucket, p_window_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set request_count = rate_limits.request_count + 1
  returning request_count into new_count;

  return new_count;
end;
$$;

revoke execute on function public.increment_rate_limit(timestamptz, text) from public, anon;
grant execute on function public.increment_rate_limit(timestamptz, text) to authenticated;
