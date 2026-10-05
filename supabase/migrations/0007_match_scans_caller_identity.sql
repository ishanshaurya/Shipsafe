-- match_scans trusted a caller-supplied match_user_id and was executable by anon.
-- Scope to auth.uid() instead and restrict execute to signed-in users.
-- Signature change: apply before (or together with) the api/embed.js deploy.
drop function if exists public.match_scans(vector, uuid, uuid, double precision, integer);

create function public.match_scans(
  query_embedding vector,
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
security invoker
set search_path = public, extensions
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
  where sh.user_id = auth.uid()
    and sh.embedding is not null
    and (exclude_scan_id is null or sh.id != exclude_scan_id)
    and (sh.embedding <=> query_embedding) < match_threshold
  order by sh.embedding <=> query_embedding
  limit match_count;
end;
$$;

revoke execute on function public.match_scans(vector, uuid, double precision, integer) from public, anon;
grant execute on function public.match_scans(vector, uuid, double precision, integer) to authenticated;
