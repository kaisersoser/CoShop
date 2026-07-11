create type public.list_access_role as enum ('viewer', 'editor');

create table public.list_collaborators (
  list_id text not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.list_access_role not null default 'editor',
  added_by uuid not null references auth.users(id),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table public.list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id text not null references public.shopping_lists(id) on delete cascade,
  token_hash text not null unique,
  role public.list_access_role not null default 'editor',
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index list_collaborators_user_idx on public.list_collaborators(user_id);
create index list_invites_list_idx on public.list_invites(list_id);
create index list_invites_creator_idx on public.list_invites(created_by);
create index list_invites_acceptor_idx on public.list_invites(accepted_by) where accepted_by is not null;

create or replace function public.can_read_list(target text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from shopping_lists list
    where list.id = target
      and (is_household_member(list.household_id)
        or exists(select 1 from list_collaborators collaborator where collaborator.list_id = list.id and collaborator.user_id = auth.uid()))
  )
$$;

create or replace function public.can_edit_list(target text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from shopping_lists list
    where list.id = target
      and (is_household_member(list.household_id)
        or exists(select 1 from list_collaborators collaborator where collaborator.list_id = list.id and collaborator.user_id = auth.uid() and collaborator.role = 'editor'))
  )
$$;

create or replace function public.create_list_invite(target_list text, access_role public.list_access_role default 'editor')
returns table(token text, expires_at timestamptz, list_name text, role public.list_access_role)
language plpgsql security definer set search_path = public
as $$
declare raw_token text; target_name text; expiry timestamptz;
begin
  if auth.uid() is null or not can_edit_list(target_list) then raise exception 'Editor access required'; end if;
  select name into target_name from shopping_lists where id = target_list and deleted_at is null;
  if target_name is null then raise exception 'List not found'; end if;
  raw_token := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  expiry := now() + interval '7 days';
  insert into list_invites(list_id, token_hash, role, created_by, expires_at)
  values(target_list, encode(extensions.digest(raw_token, 'sha256'), 'hex'), access_role, auth.uid(), expiry);
  return query select raw_token, expiry, target_name, access_role;
end $$;

create or replace function public.preview_list_invite(invite_token text)
returns table(list_name text, role public.list_access_role, expires_at timestamptz, valid boolean)
language sql stable security definer set search_path = public
as $$
  select list.name, invite.role, invite.expires_at,
    (invite.revoked_at is null and invite.accepted_at is null and invite.expires_at > now() and list.deleted_at is null)
  from list_invites invite join shopping_lists list on list.id = invite.list_id
  where invite.token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
  limit 1
$$;

create or replace function public.accept_list_invite(invite_token text)
returns text language plpgsql security definer set search_path = public
as $$
declare invite list_invites;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into invite from list_invites
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    and revoked_at is null and accepted_at is null and expires_at > now()
  for update;
  if invite.id is null then raise exception 'Invite is invalid, expired, or already used'; end if;
  insert into profiles(id) values(auth.uid()) on conflict do nothing;
  insert into list_collaborators(list_id, user_id, role, added_by)
  values(invite.list_id, auth.uid(), invite.role, invite.created_by)
  on conflict(list_id, user_id) do update set role = excluded.role;
  update list_invites set accepted_by = auth.uid(), accepted_at = now() where id = invite.id;
  return invite.list_id;
end $$;

create or replace function public.revoke_list_invite(target_invite uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare target_list text;
begin
  select list_id into target_list from list_invites where id = target_invite;
  if target_list is null or not can_edit_list(target_list) then raise exception 'Editor access required'; end if;
  update list_invites set revoked_at = now() where id = target_invite and accepted_at is null;
end $$;

alter table public.list_collaborators enable row level security;
alter table public.list_invites enable row level security;

create policy "collaborators see relevant membership" on public.list_collaborators for select
using (user_id = (select auth.uid()) or can_edit_list(list_id));
create policy "editors remove collaborators" on public.list_collaborators for delete
using (user_id = (select auth.uid()) or can_edit_list(list_id));
create policy "editors read list invites" on public.list_invites for select using (can_edit_list(list_id));

drop policy "members read lists" on public.shopping_lists;
create policy "authorized users read lists" on public.shopping_lists for select using (can_read_list(id));
drop policy "members update lists" on public.shopping_lists;
create policy "editors update lists" on public.shopping_lists for update using (can_edit_list(id)) with check (can_edit_list(id));

drop policy "members read items" on public.shopping_items;
create policy "authorized users read items" on public.shopping_items for select using (can_read_list(list_id));
drop policy "members insert items" on public.shopping_items;
create policy "editors insert items" on public.shopping_items for insert with check (can_edit_list(list_id));
drop policy "members update items" on public.shopping_items;
create policy "editors update items" on public.shopping_items for update using (can_edit_list(list_id)) with check (can_edit_list(list_id));

drop policy "members read stores" on public.stores;
create policy "authorized users read stores" on public.stores for select using (
  is_household_member(household_id)
  or exists(select 1 from shopping_lists list where list.store_id = stores.id and can_read_list(list.id))
);

drop policy "members read household photos" on storage.objects;
create policy "authorized users read list photos" on storage.objects for select to authenticated using (
  bucket_id = 'item-photos'
  and (public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_read_list((storage.foldername(name))[2])))
);
drop policy "members add household photos" on storage.objects;
create policy "editors add list photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'item-photos'
  and (public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_edit_list((storage.foldername(name))[2])))
);
drop policy "members update household photos" on storage.objects;
create policy "editors update list photos" on storage.objects for update to authenticated using (
  bucket_id = 'item-photos'
  and (public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_edit_list((storage.foldername(name))[2])))
);
drop policy "members remove household photos" on storage.objects;
create policy "editors remove list photos" on storage.objects for delete to authenticated using (
  bucket_id = 'item-photos'
  and (public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_edit_list((storage.foldername(name))[2])))
);

revoke all on function public.can_read_list(text) from public, anon;
revoke all on function public.can_edit_list(text) from public, anon;
revoke all on function public.create_list_invite(text, public.list_access_role) from public, anon;
revoke all on function public.accept_list_invite(text) from public, anon;
revoke all on function public.revoke_list_invite(uuid) from public, anon;
revoke all on function public.preview_list_invite(text) from public;
grant execute on function public.can_read_list(text) to authenticated;
grant execute on function public.can_edit_list(text) to authenticated;
grant execute on function public.create_list_invite(text, public.list_access_role) to authenticated;
grant execute on function public.accept_list_invite(text) to authenticated;
grant execute on function public.revoke_list_invite(uuid) to authenticated;
grant execute on function public.preview_list_invite(text) to anon, authenticated;
