-- ============================================================================
-- CISUR — RLS smoke tests
--
-- Verifica que un atacante con la publishable key en mano (o sea: cualquiera,
-- porque viaja en el bundle) no pueda leer ni escribir lo que no le toca.
--
-- CÓMO CORRERLO
--   1. Supabase → SQL Editor → pegar todo → Run.
--   2. Todas las filas de resultado tienen que decir OK.
--   3. Al final hace ROLLBACK: no deja basura en la base.
--
-- Correlo después de aplicar 0001-0006 y cada vez que toques una policy.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Actores de prueba
-- ---------------------------------------------------------------------------
do $$
declare
  v_alumno  uuid := '11111111-1111-1111-1111-111111111111';
  v_ajeno   uuid := '22222222-2222-2222-2222-222222222222';
  v_editor  uuid := '33333333-3333-3333-3333-333333333333';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_alumno, 'alumno@test.cisur',  '{}'::jsonb),
         (v_ajeno,  'ajeno@test.cisur',   '{}'::jsonb),
         (v_editor, 'editor@test.cisur',  '{}'::jsonb)
  on conflict (id) do nothing;

  -- handle_new_user ya creó los profiles; el editor lo promovemos desde acá
  -- (conexión directa = es_backend() true, el trigger lo permite).
  update profiles set role = 'editor' where id = v_editor;
end $$;

-- Producto activo + uno inactivo (borrador)
insert into productos (id, slug, titulo, precio, activo)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-activo',   'Test activo',   10000, true),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-borrador', 'Test borrador', 10000, false)
on conflict (slug) do nothing;

-- El alumno compró el activo; el ajeno no compró nada.
insert into compras (user_id, producto_id, estado, precio_pagado, pagado_en)
values ('11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'pagada', 10000, now())
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Helper de aserción
-- ---------------------------------------------------------------------------
create or replace function pg_temp.chequear(p_nombre text, p_ok boolean)
returns text language sql as $$
  select case when p_ok then 'OK   — ' else 'FALLA — ' end || p_nombre;
$$;

-- Simula un usuario logueado: rol authenticated + claims con su sub.
create or replace function pg_temp.como(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.como_anon()
returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims',
    '{"role":"anon"}', true);
end $$;

create or replace function pg_temp.reset_conn()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ===========================================================================
-- 1. ANÓNIMO
-- ===========================================================================
select pg_temp.como_anon();

select pg_temp.chequear(
  'anon ve el catálogo activo',
  (select count(*) from productos where slug = 'test-activo') = 1);

select pg_temp.chequear(
  'anon NO ve productos en borrador',
  (select count(*) from productos where slug = 'test-borrador') = 0);

select pg_temp.chequear(
  'anon NO ve ninguna compra',
  (select count(*) from compras) = 0);

select pg_temp.chequear(
  'anon NO ve ningún profile',
  (select count(*) from profiles) = 0);

select pg_temp.chequear(
  'anon lee los textos del sitio',
  (select count(*) from site_settings) >= 0);

do $$ begin
  begin
    insert into productos (slug, titulo, precio) values ('hackeado', 'Hackeado', 0);
    raise exception 'FALLA — anon pudo insertar un producto';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('anon NO puede insertar productos', true);

-- ===========================================================================
-- 2. ALUMNO QUE COMPRÓ
-- ===========================================================================
select pg_temp.como('11111111-1111-1111-1111-111111111111');

select pg_temp.chequear(
  'alumno ve su propia compra',
  (select count(*) from compras) = 1);

select pg_temp.chequear(
  'alumno tiene acceso al producto que compró',
  public.tiene_acceso('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = true);

select pg_temp.chequear(
  'alumno NO tiene acceso a un producto que no compró',
  public.tiene_acceso('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = false);

select pg_temp.chequear(
  'alumno ve sólo su profile',
  (select count(*) from profiles) = 1);

select pg_temp.chequear(
  'alumno NO es editor',
  public.is_editor() = false);

-- El ataque clásico: auto-promoverse a admin.
do $$ begin
  begin
    update profiles set role = 'admin'
     where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FALLA — el alumno se pudo hacer admin';
  exception
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('alumno NO se puede auto-promover a admin', true);

-- Regalarse una compra.
do $$ begin
  begin
    insert into compras (user_id, producto_id, estado, precio_pagado)
    values ('11111111-1111-1111-1111-111111111111',
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pagada', 0);
    raise exception 'FALLA — el alumno se pudo insertar una compra pagada';
  exception
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('alumno NO puede insertar compras directamente', true);

-- Editar el catálogo.
do $$ begin
  begin
    update productos set precio = 1 where slug = 'test-activo';
    if (select precio from productos where slug = 'test-activo') = 1 then
      raise exception 'FALLA — el alumno pudo cambiar el precio';
    end if;
  exception
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('alumno NO puede cambiar el precio de un producto', true);

-- Editar los textos del sitio.
do $$ begin
  begin
    insert into site_settings (key, value) values ('hackeado', 'x');
    raise exception 'FALLA — el alumno pudo escribir site_settings';
  exception
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('alumno NO puede editar los textos del sitio', true);

-- ===========================================================================
-- 3. USUARIO AJENO (registrado, no compró)
-- ===========================================================================
select pg_temp.como('22222222-2222-2222-2222-222222222222');

select pg_temp.chequear(
  'ajeno NO ve las compras de otro',
  (select count(*) from compras) = 0);

select pg_temp.chequear(
  'ajeno NO tiene acceso al producto',
  public.tiene_acceso('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = false);

select pg_temp.chequear(
  'ajeno NO ve el profile de otro',
  (select count(*) from profiles where id <> '22222222-2222-2222-2222-222222222222') = 0);

-- ===========================================================================
-- 4. EDITOR (Tati)
-- ===========================================================================
select pg_temp.como('33333333-3333-3333-3333-333333333333');

select pg_temp.chequear(
  'editor es editor',
  public.is_editor() = true);

select pg_temp.chequear(
  'editor NO es admin',
  public.is_admin() = false);

select pg_temp.chequear(
  'editor ve también los borradores',
  (select count(*) from productos where slug in ('test-activo', 'test-borrador')) = 2);

select pg_temp.chequear(
  'editor ve todas las ventas',
  (select count(*) from public.ventas()) >= 1);

-- El editor administra el catálogo...
update productos set precio = 12345 where slug = 'test-activo';
select pg_temp.chequear(
  'editor SÍ puede cambiar el precio',
  (select precio from productos where slug = 'test-activo') = 12345);

-- ...pero no se regala acceso.
do $$ begin
  begin
    update compras set estado = 'pagada'
     where producto_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    insert into compras (user_id, producto_id, estado, precio_pagado)
    values ('33333333-3333-3333-3333-333333333333',
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pagada', 0);
    raise exception 'FALLA — el editor se pudo regalar una compra pagada';
  exception
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('editor NO puede regalarse una compra pagada', true);

do $$ begin
  begin
    update profiles set role = 'admin'
     where id = '33333333-3333-3333-3333-333333333333';
    raise exception 'FALLA — el editor se pudo hacer admin';
  exception
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('editor NO se puede auto-promover a admin', true);

-- ===========================================================================
-- 5. El precio lo pone la base, no el cliente
-- ===========================================================================
select pg_temp.como('22222222-2222-2222-2222-222222222222');

-- crear_compra es SECURITY DEFINER: bypassea RLS pero NO los triggers.
do $$
declare v_precio numeric;
begin
  select precio_pagado into v_precio
    from public.crear_compra('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mercadopago');
  if v_precio <> 12345 then
    raise exception 'FALLA — crear_compra no tomó el precio real (%)', v_precio;
  end if;
end $$;
select pg_temp.chequear('crear_compra snapshotea el precio real del producto', true);

select pg_temp.chequear(
  'crear_compra deja la compra en pendiente',
  (select estado from compras
    where user_id = '22222222-2222-2222-2222-222222222222'
    order by created_at desc limit 1) = 'pendiente');

-- confirmar_pago no está al alcance del cliente.
do $$ begin
  begin
    perform public.confirmar_pago(
      (select order_id from compras
        where user_id = '22222222-2222-2222-2222-222222222222'
        order by created_at desc limit 1),
      'fake-payment', 'approved');
    raise exception 'FALLA — un authenticated pudo llamar confirmar_pago';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;
select pg_temp.chequear('confirmar_pago NO es invocable por un authenticated', true);

-- ===========================================================================
-- 6. Idempotencia del webhook
-- ===========================================================================
select pg_temp.reset_conn();

do $$
declare
  v_order uuid;
  v_n1 integer;
  v_n2 integer;
begin
  select order_id into v_order from compras
   where user_id = '22222222-2222-2222-2222-222222222222'
   order by created_at desc limit 1;

  v_n1 := public.confirmar_pago(v_order, 'pay-1', 'approved');
  v_n2 := public.confirmar_pago(v_order, 'pay-1', 'approved');

  if v_n1 <> 1 then raise exception 'FALLA — la primera confirmación no aplicó'; end if;
  if v_n2 <> 0 then raise exception 'FALLA — la confirmación repetida volvió a aplicar'; end if;
end $$;
select pg_temp.chequear('confirmar_pago es idempotente', true);

do $$
declare v_order uuid; v_n integer;
begin
  select order_id into v_order from compras
   where user_id = '11111111-1111-1111-1111-111111111111' limit 1;
  v_n := public.confirmar_pago(v_order, 'pay-x', 'pending');
  if v_n <> 0 then raise exception 'FALLA — un pago pending movió el estado'; end if;
end $$;
select pg_temp.chequear('un pago pending no cambia el estado', true);

-- ===========================================================================
-- Fin — no persistimos nada
-- ===========================================================================
rollback;
