-- Baseline of prod. Policies mirror prod exactly: users can insert and read their
-- own scans. There is NO update or delete policy, so client-side updates and
-- deletes affect zero rows (see docs/redesign/status/b.md, drift).
create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  scan_type text not null,
  input_snippet text,
  result jsonb not null,
  score integer,
  created_at timestamptz default now(),
  embedding vector(768)
);

create index if not exists scan_history_embedding_idx
  on public.scan_history using ivfflat (embedding vector_cosine_ops) with (lists = 10);

alter table public.scan_history enable row level security;

create policy "Users can insert scans"
  on public.scan_history for insert
  with check (auth.uid() = user_id);

create policy "Users can read own scans"
  on public.scan_history for select
  using (auth.uid() = user_id);
