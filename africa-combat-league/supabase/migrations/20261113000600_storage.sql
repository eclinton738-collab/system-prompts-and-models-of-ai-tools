-- Object storage buckets.
--   media   : public. Posters, fighter photos, article covers, shop images.
--   private : signed URLs only. Application uploads, ID documents, contracts.

insert into storage.buckets (id, name, public)
values ('media', 'media', true), ('private', 'private', false)
on conflict (id) do nothing;

create policy "media: public read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media: staff write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin('promotions', 'talent', 'media', 'academies')));
create policy "media: staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin('promotions', 'talent', 'media', 'academies')));
create policy "media: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin('promotions', 'talent', 'media', 'academies')));

-- Private files live under "<user id>/..." so owners can read their own uploads.
create policy "private: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "private: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "private: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'private' and (select public.is_admin('talent', 'academies', 'promotions')));
