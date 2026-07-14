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

revoke all on function public.create_list_invite(text, public.list_access_role) from public, anon;
grant execute on function public.create_list_invite(text, public.list_access_role) to authenticated;
