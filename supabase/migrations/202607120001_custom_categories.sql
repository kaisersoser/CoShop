create table public.custom_categories (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  list_id text not null references public.shopping_lists(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index custom_categories_list_order_idx on public.custom_categories(list_id, sort_order);
create unique index custom_categories_list_name_idx on public.custom_categories(list_id, lower(trim(name))) where deleted_at is null;

alter table public.custom_categories enable row level security;

create policy "authorized users read custom categories" on public.custom_categories for select
using (can_read_list(list_id));
create policy "editors insert custom categories" on public.custom_categories for insert
with check (
  can_edit_list(list_id)
  and exists(select 1 from public.shopping_lists list where list.id = custom_categories.list_id and list.household_id = custom_categories.household_id)
);
create policy "editors update custom categories" on public.custom_categories for update
using (can_edit_list(list_id)) with check (
  can_edit_list(list_id)
  and exists(select 1 from public.shopping_lists list where list.id = custom_categories.list_id and list.household_id = custom_categories.household_id)
);

alter publication supabase_realtime add table public.custom_categories;
