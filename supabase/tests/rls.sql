begin;
insert into auth.users(id, email, is_sso_user, is_anonymous) values
  ('10000000-0000-0000-0000-000000000001', 'rls-a@example.invalid', false, false),
  ('20000000-0000-0000-0000-000000000002', 'rls-b@example.invalid', false, false),
  ('30000000-0000-0000-0000-000000000003', 'rls-c@example.invalid', false, false);
insert into public.households(id, name, created_by) values
  ('10000000-0000-0000-0000-000000000010', 'A', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000020', 'B', '20000000-0000-0000-0000-000000000002');
insert into public.household_members(household_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000002', 'owner');
insert into public.shopping_lists(id, household_id, name) values
  ('rls-list-a', '10000000-0000-0000-0000-000000000010', 'A list'),
  ('rls-list-b', '20000000-0000-0000-0000-000000000020', 'B list');
insert into public.shopping_items(id, household_id, list_id, name) values
  ('rls-item-a', '10000000-0000-0000-0000-000000000010', 'rls-list-a', 'A item');
insert into public.list_collaborators(list_id, user_id, role, added_by) values
  ('rls-list-a', '20000000-0000-0000-0000-000000000002', 'viewer', '10000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
do $$ begin
  if (select count(*) from public.shopping_lists) <> 1 then raise exception 'RLS isolation failed'; end if;
  if exists(select 1 from public.shopping_lists where id = 'rls-list-b') then raise exception 'Cross-household read succeeded'; end if;
end $$;
do $$ declare raw_token text; preview_valid boolean; begin
  select token into raw_token from public.create_list_invite('rls-list-a', 'viewer');
  select valid into preview_valid from public.preview_list_invite(raw_token);
  if preview_valid is not true then raise exception 'Invite preview failed'; end if;
  perform set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
  perform public.accept_list_invite(raw_token);
  if not exists(select 1 from public.list_collaborators where list_id = 'rls-list-a' and user_id = '30000000-0000-0000-0000-000000000003' and role = 'viewer') then raise exception 'Invite acceptance failed'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
do $$ begin
  if (select count(*) from public.shopping_lists) <> 2 then raise exception 'Shared list read failed'; end if;
  if not exists(select 1 from public.shopping_lists where id = 'rls-list-a') then raise exception 'Collaborator cannot read shared list'; end if;
end $$;
update public.shopping_items set name = 'Viewer changed item' where id = 'rls-item-a';
do $$ begin
  if (select name from public.shopping_items where id = 'rls-item-a') <> 'A item' then raise exception 'Viewer changed shared item'; end if;
end $$;
reset role;

update public.list_collaborators set role = 'editor' where list_id = 'rls-list-a' and user_id = '20000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
update public.shopping_items set name = 'Editor changed item' where id = 'rls-item-a';
do $$ begin
  if (select name from public.shopping_items where id = 'rls-item-a') <> 'Editor changed item' then raise exception 'Editor update failed'; end if;
end $$;
reset role;
rollback;
