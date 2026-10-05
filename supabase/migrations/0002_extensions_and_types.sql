-- Baseline captured read-only from prod (project shipsafe). Already applied there;
-- these files exist so a fresh database can be rebuilt. Do not `db push` 0002-0006 to prod.
create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

do $$ begin
  create type public.impact_level as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;
