-- Baseline of prod. SECURITY INVOKER with a caller-supplied match_user_id:
-- isolation relies on RLS when called with a user JWT. /api/embed calls it with
-- the service role (bypasses RLS) and passes the verified user.id.
create or replace function public.match_scans(
  query_embedding vector,
  match_user_id uuid,
  exclude_scan_id uuid default null,
  match_threshold double precision default 0.4,
  match_count integer default 5
)
returns table (
  id uuid,
  scan_type text,
  input_snippet text,
  score integer,
  created_at timestamptz,
  similarity double precision
)
language plpgsql
as $$
begin
  return query
  select
    sh.id,
    sh.scan_type,
    sh.input_snippet,
    sh.score,
    sh.created_at,
    1 - (sh.embedding <=> query_embedding) as similarity
  from scan_history sh
  where sh.user_id = match_user_id
    and sh.embedding is not null
    and (exclude_scan_id is null or sh.id != exclude_scan_id)
    and (sh.embedding <=> query_embedding) < match_threshold
  order by sh.embedding <=> query_embedding
  limit match_count;
end;
$$;
