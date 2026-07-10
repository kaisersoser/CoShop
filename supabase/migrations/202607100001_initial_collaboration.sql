create extension if not exists pgcrypto;

create type public.household_role as enum ('owner', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.stores (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  address text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shopping_lists (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  budget numeric(12,2) check (budget is null or budget >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  store_id text references public.stores(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shopping_items (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  list_id text not null references public.shopping_lists(id) on delete cascade,
  name text not null,
  catalog_id text,
  category text not null default 'other',
  price numeric(12,2) check (price is null or price >= 0),
  quantity numeric(10,3) not null default 1 check (quantity > 0),
  is_purchased boolean not null default false,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index shopping_lists_household_updated_idx on public.shopping_lists(household_id, updated_at);
create index shopping_items_household_list_updated_idx on public.shopping_items(household_id, list_id, updated_at);
create index stores_household_updated_idx on public.stores(household_id, updated_at);

create or replace function public.is_household_member(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from household_members where household_id = target and user_id = auth.uid()) $$;

create or replace function public.is_household_owner(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from household_members where household_id = target and user_id = auth.uid() and role = 'owner') $$;

create or replace function public.bootstrap_household(household_name text default 'My household')
returns uuid language plpgsql security definer set search_path = public
as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select household_id into result from household_members where user_id = auth.uid() order by joined_at limit 1;
  if result is not null then return result; end if;
  insert into profiles(id) values (auth.uid()) on conflict do nothing;
  insert into households(name, created_by) values (coalesce(nullif(trim(household_name), ''), 'My household'), auth.uid()) returning id into result;
  insert into household_members(household_id, user_id, role) values (result, auth.uid(), 'owner');
  return result;
end $$;

create or replace function public.create_household_invite(target uuid)
returns table(token text, expires_at timestamptz) language plpgsql security definer set search_path = public
as $$
begin
  if not is_household_owner(target) then raise exception 'Owner access required'; end if;
  return query insert into household_invites(household_id, created_by) values(target, auth.uid()) returning household_invites.token, household_invites.expires_at;
end $$;

create or replace function public.accept_household_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare invite household_invites; result uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into invite from household_invites where token = invite_token and revoked_at is null and accepted_at is null and expires_at > now() for update;
  if invite.id is null then raise exception 'Invite is invalid or expired'; end if;
  insert into profiles(id) values (auth.uid()) on conflict do nothing;
  insert into household_members(household_id, user_id, role) values(invite.household_id, auth.uid(), 'member') on conflict do nothing;
  update household_invites set accepted_by = auth.uid(), accepted_at = now() where id = invite.id;
  result := invite.household_id; return result;
end $$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.stores enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.household_invites enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid());
create policy "profile self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "members read household" on public.households for select using (is_household_member(id));
create policy "owners update household" on public.households for update using (is_household_owner(id));
create policy "members read membership" on public.household_members for select using (is_household_member(household_id));
create policy "owners manage membership" on public.household_members for delete using (is_household_owner(household_id) or user_id = auth.uid());

create policy "members read stores" on public.stores for select using (is_household_member(household_id));
create policy "members insert stores" on public.stores for insert with check (is_household_member(household_id));
create policy "members update stores" on public.stores for update using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "members read lists" on public.shopping_lists for select using (is_household_member(household_id));
create policy "members insert lists" on public.shopping_lists for insert with check (is_household_member(household_id));
create policy "members update lists" on public.shopping_lists for update using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "members read items" on public.shopping_items for select using (is_household_member(household_id));
create policy "members insert items" on public.shopping_items for insert with check (is_household_member(household_id));
create policy "members update items" on public.shopping_items for update using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "owners read invites" on public.household_invites for select using (is_household_owner(household_id) or accepted_by = auth.uid());
create policy "owners revoke invites" on public.household_invites for update using (is_household_owner(household_id));

grant execute on function public.bootstrap_household(text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "members read household photos" on storage.objects for select to authenticated
using (bucket_id = 'item-photos' and is_household_member((storage.foldername(name))[1]::uuid));
create policy "members add household photos" on storage.objects for insert to authenticated
with check (bucket_id = 'item-photos' and is_household_member((storage.foldername(name))[1]::uuid));
create policy "members update household photos" on storage.objects for update to authenticated
using (bucket_id = 'item-photos' and is_household_member((storage.foldername(name))[1]::uuid));
create policy "members remove household photos" on storage.objects for delete to authenticated
using (bucket_id = 'item-photos' and is_household_member((storage.foldername(name))[1]::uuid));

alter publication supabase_realtime add table public.shopping_lists, public.shopping_items, public.stores;
