-- ============================================================================
-- CISUR — 0002_rls.sql
-- Row Level Security. La seguridad vive en la base, no sólo en el código:
-- la publishable key viaja en el bundle del navegador, así que asumimos que
-- un atacante la tiene y dejamos que Postgres lo detenga.
-- ============================================================================

alter table profiles           enable row level security;
alter table productos          enable row level security;
alter table compras            enable row level security;
alter table talleres           enable row level security;
alter table site_settings      enable row level security;
alter table editor_invitations enable row level security;

-- ===========================================================================
-- PRIVILEGIOS DE TABLA (la capa de abajo de RLS)
--
-- Supabase configura default privileges que otorgan permisos amplios sobre
-- todo lo que se crea en `public` a anon y authenticated: sin esto, el único
-- freno serían las policies.
--
-- Acá los recortamos a lo que cada rol realmente necesita. Son dos candados
-- distintos: los privilegios dicen si la operación está permitida siquiera, y
-- RLS dice sobre qué filas. Si algún día una policy se escribe mal, el
-- privilegio faltante sigue tapando el agujero.
-- ===========================================================================

-- Punto de partida limpio.
revoke all on profiles, productos, compras, talleres, site_settings,
              editor_invitations
  from anon, authenticated;

-- El backend hace de todo: bypassea RLS y necesita los privilegios.
grant all on profiles, productos, compras, talleres, site_settings,
             editor_invitations
  to service_role;

-- --- anon (visitante sin cuenta): sólo lee lo público. -------------------
grant select on productos     to anon;
grant select on talleres      to anon;
grant select on site_settings to anon;

-- --- authenticated ------------------------------------------------------
-- profiles: lee (RLS: el propio + editores) y edita el propio nombre.
-- Sin INSERT ni DELETE: el profile lo crea el trigger handle_new_user.
grant select, update on profiles to authenticated;

-- productos y talleres: los administran los editores (RLS: is_editor()).
grant select, insert, update, delete on productos to authenticated;
grant select, insert, update, delete on talleres  to authenticated;

-- site_settings: los textos editables. Sin DELETE: una clave borrada dejaría
-- la página sin ese texto y no hay forma de recuperarla desde la interfaz.
grant select, insert, update on site_settings to authenticated;

-- compras: SÓLO LECTURA desde el cliente.
-- Toda escritura pasa por crear_compra() / confirmar_pago() (SECURITY DEFINER)
-- o por el service_role del webhook. Sin privilegio de INSERT, ni siquiera una
-- policy mal escrita permitiría fabricar una compra.
grant select on compras to authenticated;

-- editor_invitations: administración de invitaciones (RLS: is_admin()).
grant select, insert, update, delete on editor_invitations to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: cada uno ve y edita el suyo. Los editores ven todos (para el
-- panel de ventas). El rol NO se puede tocar: lo bloquea un trigger (0003).
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_editor());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sin policy de INSERT ni DELETE: el profile lo crea el trigger
-- handle_new_user (security definer) y se borra en cascada con auth.users.

-- ---------------------------------------------------------------------------
-- productos: el catálogo activo es público (la landing lo lee sin login).
-- Escritura sólo para editores.
-- ---------------------------------------------------------------------------
drop policy if exists productos_select on productos;
create policy productos_select on productos
  for select to anon, authenticated
  using (activo = true or public.is_editor());

drop policy if exists productos_write on productos;
create policy productos_write on productos
  for all to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- ---------------------------------------------------------------------------
-- compras: el alumno ve sólo las suyas; los editores ven todas.
--
-- NO hay policy de INSERT ni UPDATE a propósito. Toda escritura pasa por
-- las funciones crear_compra() / confirmar_pago() (SECURITY DEFINER, 0004)
-- o por el service_role del webhook. Así el cliente no puede fabricar una
-- compra ni siquiera con la publishable key en mano.
-- ---------------------------------------------------------------------------
drop policy if exists compras_select on compras;
create policy compras_select on compras
  for select to authenticated
  using (user_id = auth.uid() or public.is_editor());

-- ---------------------------------------------------------------------------
-- talleres: vitrina pública. Escritura para editores.
-- ---------------------------------------------------------------------------
drop policy if exists talleres_select on talleres;
create policy talleres_select on talleres
  for select to anon, authenticated
  using (visible = true or public.is_editor());

drop policy if exists talleres_write on talleres;
create policy talleres_write on talleres
  for all to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- ---------------------------------------------------------------------------
-- site_settings: lectura pública (son los textos del sitio),
-- escritura sólo de editores.
-- ---------------------------------------------------------------------------
drop policy if exists site_settings_select on site_settings;
create policy site_settings_select on site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists site_settings_write on site_settings;
create policy site_settings_write on site_settings
  for all to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- ---------------------------------------------------------------------------
-- editor_invitations: sólo admin. El trigger handle_new_user las lee como
-- SECURITY DEFINER, así que no necesita policy para el flujo de registro.
-- ---------------------------------------------------------------------------
drop policy if exists editor_invitations_admin on editor_invitations;
create policy editor_invitations_admin on editor_invitations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
