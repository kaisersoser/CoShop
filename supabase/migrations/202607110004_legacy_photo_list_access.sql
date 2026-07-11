drop policy "authorized users read list photos" on storage.objects;
create policy "authorized users read list photos" on storage.objects for select to authenticated using (
  bucket_id = 'item-photos'
  and (
    public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_read_list((storage.foldername(name))[2]))
    or exists(select 1 from public.shopping_items item where item.photo_path = storage.objects.name and public.can_read_list(item.list_id))
  )
);

drop policy "editors update list photos" on storage.objects;
create policy "editors update list photos" on storage.objects for update to authenticated using (
  bucket_id = 'item-photos'
  and (
    public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_edit_list((storage.foldername(name))[2]))
    or exists(select 1 from public.shopping_items item where item.photo_path = storage.objects.name and public.can_edit_list(item.list_id))
  )
);

drop policy "editors remove list photos" on storage.objects;
create policy "editors remove list photos" on storage.objects for delete to authenticated using (
  bucket_id = 'item-photos'
  and (
    public.is_household_member((storage.foldername(name))[1]::uuid)
    or (array_length(storage.foldername(name), 1) >= 3 and public.can_edit_list((storage.foldername(name))[2]))
    or exists(select 1 from public.shopping_items item where item.photo_path = storage.objects.name and public.can_edit_list(item.list_id))
  )
);
