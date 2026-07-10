begin;
insert into auth.users(id, email, is_sso_user, is_anonymous) values
  ('10000000-0000-0000-0000-000000000001', 'rls-a@example.invalid', false, false),
  ('20000000-0000-0000-0000-000000000002', 'rls-b@example.invalid', false, false);
insert into public.households(id, name, created_by) values
  ('10000000-0000-0000-0000-000000000010', 'A', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000020', 'B', '20000000-0000-0000-0000-000000000002');
insert into public.household_members(household_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000002', 'owner');
insert into public.shopping_lists(id, household_id, name) values
  ('rls-list-a', '10000000-0000-0000-0000-000000000010', 'A list'),
  ('rls-list-b', '20000000-0000-0000-0000-000000000020', 'B list');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
do $$ begin
  if (select count(*) from public.shopping_lists) <> 1 then raise exception 'RLS isolation failed'; end if;
  if exists(select 1 from public.shopping_lists where id = 'rls-list-b') then raise exception 'Cross-household read succeeded'; end if;
end $$;
reset role;
rollback;
