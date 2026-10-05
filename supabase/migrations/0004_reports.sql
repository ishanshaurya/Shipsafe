-- Baseline of prod. Public reports are readable by anyone; owners insert and
-- delete their own. No update policy in prod.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  scan_type text not null,
  result_data jsonb not null,
  is_public boolean default true,
  created_at timestamptz default now(),
  constraint reports_slug_key unique (slug)
);

alter table public.reports enable row level security;

create policy "Public reports viewable by anyone"
  on public.reports for select
  using (is_public = true);

create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own reports"
  on public.reports for delete
  using (auth.uid() = user_id);
