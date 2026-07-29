-- ============================================================================
-- CISUR — 0005_storage.sql
-- Dos buckets y las policies que gatean los PDF.
--
--   publico : portadas, fotos de talleres, logo. Lectura abierta.
--   guias   : los PDF que se venden. Privado. Se sirven con URL firmada de
--             vida corta desde /api/leer, nunca por link directo.
--
-- Convención de path en 'guias':  <producto_id>/<archivo>.pdf
-- El primer folder es el id del producto, así la policy puede derivar el
-- permiso de la tabla compras sin necesidad de metadata extra.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('publico', 'publico', true,  10485760,
     array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml']),
  ('guias',   'guias',   false, 104857600,
     array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Bucket 'publico'
-- ---------------------------------------------------------------------------
drop policy if exists publico_select on storage.objects;
create policy publico_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'publico');

drop policy if exists publico_write on storage.objects;
create policy publico_write on storage.objects
  for all to authenticated
  using (bucket_id = 'publico' and public.is_editor())
  with check (bucket_id = 'publico' and public.is_editor());

-- ---------------------------------------------------------------------------
-- Bucket 'guias' — la policy clave del proyecto.
-- Un authenticated sólo alcanza el PDF si tiene una compra 'pagada' del
-- producto cuyo id es el primer folder del path.
-- ---------------------------------------------------------------------------
drop policy if exists guias_select on storage.objects;
create policy guias_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'guias'
    and (
      public.is_editor()
      or exists (
        select 1 from compras c
         where c.user_id = auth.uid()
           and c.estado = 'pagada'
           and c.producto_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists guias_write on storage.objects;
create policy guias_write on storage.objects
  for all to authenticated
  using (bucket_id = 'guias' and public.is_editor())
  with check (bucket_id = 'guias' and public.is_editor());
