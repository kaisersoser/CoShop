revoke all on function public.bootstrap_household(text) from public, anon;
revoke all on function public.create_household_invite(uuid) from public, anon;
revoke all on function public.accept_household_invite(text) from public, anon;
revoke all on function public.is_household_member(uuid) from public, anon;
revoke all on function public.is_household_owner(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

drop policy "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select using (id = (select auth.uid()));
drop policy "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy "owners manage membership" on public.household_members;
create policy "owners manage membership" on public.household_members for delete using (is_household_owner(household_id) or user_id = (select auth.uid()));
drop policy "owners read invites" on public.household_invites;
create policy "owners read invites" on public.household_invites for select using (is_household_owner(household_id) or accepted_by = (select auth.uid()));

create index household_members_user_idx on public.household_members(user_id);
create index households_creator_idx on public.households(created_by);
create index household_invites_household_idx on public.household_invites(household_id);
create index household_invites_creator_idx on public.household_invites(created_by);
create index household_invites_acceptor_idx on public.household_invites(accepted_by) where accepted_by is not null;
create index shopping_items_list_idx on public.shopping_items(list_id);
create index shopping_lists_store_idx on public.shopping_lists(store_id) where store_id is not null;
