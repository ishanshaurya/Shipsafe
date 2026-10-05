-- Baseline of prod. RLS is enabled with NO policies, so anon and authenticated
-- clients read zero rows; only the service role can read or write.
create table if not exists public.regulations (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  country varchar not null,
  year integer,
  regulation_type varchar,
  status varchar,
  sector varchar,
  dev_impact public.impact_level,
  summary text,
  penalties text,
  source_url varchar,
  flag varchar,
  requirements jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_regs_country on public.regulations (country);
create index if not exists idx_regs_impact on public.regulations (dev_impact);
create index if not exists idx_regs_status on public.regulations (status);
create index if not exists idx_regs_year on public.regulations (year);

alter table public.regulations enable row level security;
