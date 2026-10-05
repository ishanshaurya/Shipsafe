-- Rate-limit bucket assertions. Run against a LOCAL database only (same as rls.sql).
-- Everything runs in one transaction and rolls back.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rl-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rl-b@test.local');

create or replace function pg_temp.assert_eq(label text, got bigint, want bigint) returns void
language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got %, want %', label, got, want;
  end if;
  raise notice 'ok   %', label;
end $$;
grant execute on function pg_temp.assert_eq(text, bigint, bigint) to anon, authenticated;

create or replace function pg_temp.as_user(uid text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
grant execute on function pg_temp.as_user(text) to anon, authenticated;

set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

select pg_temp.assert_eq('first embed call counts 1', public.increment_rate_limit('2030-01-01T00:00:00Z', 'embed'), 1);
select pg_temp.assert_eq('second embed call counts 2', public.increment_rate_limit('2030-01-01T00:00:00Z', 'embed'), 2);
select pg_temp.assert_eq('github bucket is independent', public.increment_rate_limit('2030-01-01T00:00:00Z', 'github'), 1);
select pg_temp.assert_eq('omitted bucket is gemini (legacy callers)', public.increment_rate_limit('2030-01-01T00:00:00Z'), 1);
select pg_temp.assert_eq('gemini bucket counts on', public.increment_rate_limit('2030-01-01T00:00:00Z', 'gemini'), 2);
select pg_temp.assert_eq('new window resets embed', public.increment_rate_limit('2030-01-01T00:01:00Z', 'embed'), 1);

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.assert_eq('other user starts at 1', public.increment_rate_limit('2030-01-01T00:00:00Z', 'embed'), 1);
select pg_temp.assert_eq('user sees only own rows', (select count(*) from public.rate_limits), 1);

reset role;
set local role anon;
do $$
begin
  perform public.increment_rate_limit('2030-01-01T00:00:00Z', 'embed');
  raise exception 'FAIL anon can execute increment_rate_limit';
exception when insufficient_privilege then
  raise notice 'ok   anon cannot execute increment_rate_limit';
end $$;

rollback;
