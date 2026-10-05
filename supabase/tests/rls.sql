-- RLS assertions. Run against a LOCAL database only, after `supabase db reset`:
--   psql "$(supabase status -o env | grep ^DB_URL | cut -d= -f2- | tr -d '"')" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- Everything runs in one transaction and rolls back. Raises on the first failed assertion.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@test.local');

insert into public.scan_history (id, user_id, scan_type, result)
values ('b0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'debugger', '{}');
update public.scan_history set embedding = array_fill(0.1::real, array[768])::vector
where id = 'b0000000-0000-0000-0000-00000000000b';

insert into public.reports (user_id, slug, title, scan_type, result_data, is_public)
values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'rls-private', 't', 'debugger', '{}', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'rls-public', 't', 'debugger', '{}', true);

create or replace function pg_temp.assert_eq(label text, got bigint, want bigint) returns void
language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got %, want %', label, got, want;
  end if;
  raise notice 'ok   %', label;
end $$;
grant execute on function pg_temp.assert_eq(text, bigint, bigint) to anon, authenticated;

-- Local auth.uid() may read only the legacy request.jwt.claim.sub setting, so set both.
create or replace function pg_temp.as_user(uid text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
grant execute on function pg_temp.as_user(text) to anon, authenticated;

-- user A vs user B's scan_history
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.assert_eq('A identity resolves', (select (auth.uid() = 'aaaaaaaa-0000-0000-0000-000000000001')::int), 1);

select pg_temp.assert_eq('A cannot read B scan', (select count(*) from public.scan_history where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 0);

with u as (update public.scan_history set score = 1 where id = 'b0000000-0000-0000-0000-00000000000b' returning 1)
select pg_temp.assert_eq('A cannot update B scan', (select count(*) from u), 0);

with d as (delete from public.scan_history where id = 'b0000000-0000-0000-0000-00000000000b' returning 1)
select pg_temp.assert_eq('A cannot delete B scan', (select count(*) from d), 0);

select pg_temp.assert_eq('A can read public report', (select count(*) from public.reports where slug = 'rls-public'), 1);
select pg_temp.assert_eq('A cannot read B private report', (select count(*) from public.reports where slug = 'rls-private'), 0);

-- anonymous
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select pg_temp.assert_eq('anon cannot read private report', (select count(*) from public.reports where slug = 'rls-private'), 0);
select pg_temp.assert_eq('anon can read public report', (select count(*) from public.reports where slug = 'rls-public'), 1);
select pg_temp.assert_eq('anon cannot read scans', (select count(*) from public.scan_history), 0);

-- match_scans: scoped to caller, not executable by anon
reset role;
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.assert_eq('A match_scans does not return B scan',
  (select count(*) from public.match_scans(array_fill(0.1::real, array[768])::vector, null, 1.0, 10)), 0);

reset role;
set local role anon;
do $$
begin
  perform * from public.match_scans(array_fill(0.1::real, array[768])::vector);
  raise exception 'FAIL anon can execute match_scans';
exception when insufficient_privilege then
  raise notice 'ok   anon cannot execute match_scans';
end $$;

-- B still sees own row (guards against policies that deny everyone)
reset role;
set local role authenticated;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.assert_eq('B can read own scan', (select count(*) from public.scan_history), 1);
select pg_temp.assert_eq('B match_scans returns own scan',
  (select count(*) from public.match_scans(array_fill(0.1::real, array[768])::vector, null, 1.0, 10)), 1);

rollback;
