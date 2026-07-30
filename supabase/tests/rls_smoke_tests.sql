-- ============================================================================
-- CISUR — smoke tests de seguridad
--
-- Verifica que alguien con la publishable key en mano (o sea: cualquiera,
-- porque viaja en el bundle del navegador) no pueda leer ni escribir lo que no
-- le toca.
--
-- Hay DOS candados y se prueban por separado:
--   · privilegios de tabla → si la operación está permitida siquiera
--   · RLS                  → sobre qué filas
--
-- CÓMO CORRERLO
--   Supabase → SQL Editor → pegar todo → Run.
--   La última tabla del resultado tiene que decir "TODO OK".
--   Hace ROLLBACK: no deja nada en la base.
--
-- Correlo después de aplicar 0001-0006 y cada vez que toques una policy, un
-- grant o un trigger.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Registro de resultados
-- ---------------------------------------------------------------------------
create temp table resultado (
  n       serial primary key,
  grupo   text,
  prueba  text,
  ok      boolean,
  detalle text
) on commit drop;

-- Corre una consulta con un rol simulado y compara contra lo esperado.
--
-- p_espera:
--   'deniega'  → la sentencia TIENE que fallar (falta privilegio o la bloquea
--                un trigger). Es el caso más importante de todos.
--   'permite'  → la sentencia tiene que correr sin error.
--   un número  → la consulta devuelve ese escalar.
--
-- El bloque EXCEPTION crea un savepoint implícito, así que un error esperado no
-- aborta la transacción y el resto de las pruebas sigue corriendo.
create or replace function pg_temp.probar(
  p_grupo  text,
  p_prueba text,
  p_rol    text,
  p_uid    uuid,
  p_sql    text,
  p_espera text
) returns void
language plpgsql
as $$
declare
  v_ok      boolean := false;
  v_detalle text    := null;
  v_valor   text;
begin
  -- Simula la conexión: rol + claims del JWT, igual que hace el pooler.
  perform set_config('role', p_rol, true);
  if p_uid is null then
    perform set_config('request.jwt.claims',
      json_build_object('role', p_rol)::text, true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid::text, 'role', p_rol)::text, true);
  end if;

  begin
    execute p_sql into v_valor;

    if p_espera = 'deniega' then
      v_ok := false;
      v_detalle := 'la sentencia corrió cuando debía ser rechazada';
    elsif p_espera = 'permite' then
      v_ok := true;
    else
      -- Cualquier otra cosa es el valor que se espera de vuelta: un conteo
      -- ('0', '1') o un booleano ('true', 'false').
      v_ok := (v_valor is not distinct from p_espera);
      v_detalle := format('devolvió %s, esperaba %s',
                          coalesce(v_valor, 'null'), p_espera);
    end if;
  exception when others then
    v_ok := (p_espera = 'deniega');
    v_detalle := left(sqlerrm, 90);
  end;

  -- Volver a postgres para poder escribir en la tabla de resultados.
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);

  insert into resultado (grupo, prueba, ok, detalle)
  values (p_grupo, p_prueba, v_ok, case when v_ok then null else v_detalle end);
end;
$$;

-- Igual que probar(), pero para sentencias que no devuelven valor
-- (insert / update / delete).
create or replace function pg_temp.probar_escritura(
  p_grupo  text,
  p_prueba text,
  p_rol    text,
  p_uid    uuid,
  p_sql    text,
  p_espera text
) returns void
language plpgsql
as $$
declare
  v_ok      boolean := false;
  v_detalle text    := null;
begin
  perform set_config('role', p_rol, true);
  if p_uid is null then
    perform set_config('request.jwt.claims',
      json_build_object('role', p_rol)::text, true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid::text, 'role', p_rol)::text, true);
  end if;

  begin
    execute p_sql;
    v_ok := (p_espera = 'permite');
    if not v_ok then
      v_detalle := 'la escritura pasó cuando debía ser rechazada';
    end if;
  exception when others then
    v_ok := (p_espera = 'deniega');
    v_detalle := left(sqlerrm, 90);
  end;

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);

  insert into resultado (grupo, prueba, ok, detalle)
  values (p_grupo, p_prueba, v_ok, case when v_ok then null else v_detalle end);
end;
$$;

create or replace function pg_temp.afirmar(
  p_grupo text, p_prueba text, p_ok boolean, p_detalle text default null
) returns void language plpgsql as $$
begin
  insert into resultado (grupo, prueba, ok, detalle)
  values (p_grupo, p_prueba, p_ok, case when p_ok then null else coalesce(p_detalle, 'no se cumplió') end);
end;
$$;

-- ===========================================================================
-- Actores y datos de prueba
-- ===========================================================================
do $$
declare
  v_alumno uuid := '11111111-1111-1111-1111-111111111111';
  v_ajeno  uuid := '22222222-2222-2222-2222-222222222222';
  v_editor uuid := '33333333-3333-3333-3333-333333333333';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_alumno, 'alumno@test.cisur', '{"nombre":"Alumno"}'::jsonb),
         (v_ajeno,  'ajeno@test.cisur',  '{"nombre":"Ajeno"}'::jsonb),
         (v_editor, 'editor@test.cisur', '{"nombre":"Editora"}'::jsonb)
  on conflict (id) do nothing;

  -- El trigger handle_new_user ya creó los profiles. Promovemos al editor desde
  -- una conexión directa (es_backend() = true, el trigger lo permite).
  update profiles set role = 'editor' where id = v_editor;
end $$;

insert into productos (id, slug, titulo, precio, activo)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-activo',   'Test activo',   10000, true),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-borrador', 'Test borrador', 10000, false)
on conflict (slug) do nothing;

insert into compras (user_id, producto_id, estado, precio_pagado, pagado_en)
values ('11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pagada', 10000, now());

-- ===========================================================================
-- 1. ANÓNIMO — cualquiera que abra el sitio sin cuenta
-- ===========================================================================
select pg_temp.probar('anon', 've el catálogo publicado',
  'anon', null,
  $$select count(*)::text from productos where slug = 'test-activo'$$, '1');

select pg_temp.probar('anon', 'NO ve los borradores',
  'anon', null,
  $$select count(*)::text from productos where slug = 'test-borrador'$$, '0');

select pg_temp.probar('anon', 'lee los textos del sitio',
  'anon', null,
  $$select count(*)::text from site_settings$$, 'permite');

select pg_temp.probar('anon', 've los talleres visibles',
  'anon', null,
  $$select count(*)::text from talleres$$, 'permite');

-- Sin privilegio de tabla: ni siquiera puede intentar leerlas.
select pg_temp.probar('anon', 'NO alcanza la tabla de compras',
  'anon', null, $$select count(*)::text from compras$$, 'deniega');

select pg_temp.probar('anon', 'NO alcanza la tabla de perfiles',
  'anon', null, $$select count(*)::text from profiles$$, 'deniega');

select pg_temp.probar_escritura('anon', 'NO puede crear un producto',
  'anon', null,
  $$insert into productos (slug, titulo, precio) values ('hack', 'Hack', 0)$$,
  'deniega');

select pg_temp.probar_escritura('anon', 'NO puede editar los textos del sitio',
  'anon', null,
  $$insert into site_settings (key, value) values ('hack', 'x')$$, 'deniega');

-- ===========================================================================
-- 2. ALUMNO QUE COMPRÓ
-- ===========================================================================
select pg_temp.probar('alumno', 've su propia compra',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select count(*)::text from compras$$, '1');

select pg_temp.probar('alumno', 'tiene acceso a lo que compró',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select public.tiene_acceso('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text$$, 'true');

select pg_temp.probar('alumno', 'NO tiene acceso a lo que no compró',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select public.tiene_acceso('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::text$$, 'false');

select pg_temp.probar('alumno', 've únicamente su perfil',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select count(*)::text from profiles$$, '1');

select pg_temp.probar('alumno', 'no es editor',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select public.is_editor()::text$$, 'false');

-- El ataque clásico: auto-promoverse. Lo bloquea el trigger de 0003.
select pg_temp.probar_escritura('alumno', 'NO se puede hacer admin',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$update profiles set role = 'admin' where id = auth.uid()$$, 'deniega');

-- Regalarse una compra. Lo bloquea el privilegio de tabla (0002).
select pg_temp.probar_escritura('alumno', 'NO puede insertar una compra',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$insert into compras (user_id, producto_id, estado, precio_pagado)
    values (auth.uid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pagada', 0)$$,
  'deniega');

-- Marcar como pagada la propia compra pendiente.
select pg_temp.probar_escritura('alumno', 'NO puede tocar el estado de su compra',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$update compras set estado = 'pagada' where user_id = auth.uid()$$, 'deniega');

select pg_temp.probar_escritura('alumno', 'NO puede borrar su compra',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$delete from compras where user_id = auth.uid()$$, 'deniega');

-- Cambiar el precio: tiene privilegio de UPDATE (es el mismo rol que usan los
-- editores), así que acá el que frena es RLS. No da error: no matchea ninguna
-- fila. Se verifica que el precio quedó intacto.
do $$ begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin
    update productos set precio = 1 where slug = 'test-activo';
  exception when others then null;
  end;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
select pg_temp.afirmar('alumno', 'NO logra cambiar el precio de un producto',
  (select precio from productos where slug = 'test-activo') = 10000,
  'el precio cambió');

select pg_temp.probar_escritura('alumno', 'NO puede editar los textos del sitio',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$insert into site_settings (key, value) values ('hack2', 'x')$$, 'deniega');

-- ===========================================================================
-- 3. USUARIO AJENO — con cuenta, sin haber comprado
-- ===========================================================================
select pg_temp.probar('ajeno', 'NO ve las compras de otro',
  'authenticated', '22222222-2222-2222-2222-222222222222',
  $$select count(*)::text from compras$$, '0');

select pg_temp.probar('ajeno', 'NO tiene acceso al material',
  'authenticated', '22222222-2222-2222-2222-222222222222',
  $$select public.tiene_acceso('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text$$, 'false');

select pg_temp.probar('ajeno', 'NO ve el perfil de otro',
  'authenticated', '22222222-2222-2222-2222-222222222222',
  $$select count(*)::text from profiles
     where id <> '22222222-2222-2222-2222-222222222222'$$, '0');

select pg_temp.probar('ajeno', 'NO ve los datos de venta',
  'authenticated', '22222222-2222-2222-2222-222222222222',
  $$select count(*)::text from public.ventas()$$, '0');

-- ===========================================================================
-- 4. EDITOR (Tati) — administra, pero no se regala nada
-- ===========================================================================
select pg_temp.probar('editor', 'es editor',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$select public.is_editor()::text$$, 'true');

select pg_temp.probar('editor', 'no es admin',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$select public.is_admin()::text$$, 'false');

select pg_temp.probar('editor', 've también los borradores',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$select count(*)::text from productos
     where slug in ('test-activo', 'test-borrador')$$, '2');

select pg_temp.probar('editor', 've las ventas',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$select count(*)::text from public.ventas()$$, '1');

select pg_temp.probar_escritura('editor', 'SÍ puede administrar el catálogo',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$update productos set precio = 12345 where slug = 'test-activo'$$, 'permite');

select pg_temp.afirmar('editor', 'el cambio de precio se guardó',
  (select precio from productos where slug = 'test-activo') = 12345,
  'el precio no cambió');

select pg_temp.probar_escritura('editor', 'SÍ puede editar los textos',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$insert into site_settings (key, value) values ('prueba_editor', 'ok')
    on conflict (key) do update set value = 'ok'$$, 'permite');

-- Ni el editor se regala acceso: no tiene privilegio de INSERT en compras.
select pg_temp.probar_escritura('editor', 'NO puede regalarse una compra',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$insert into compras (user_id, producto_id, estado, precio_pagado)
    values (auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pagada', 0)$$,
  'deniega');

select pg_temp.probar_escritura('editor', 'NO puede marcar una compra como pagada',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$update compras set estado = 'pagada'$$, 'deniega');

select pg_temp.probar_escritura('editor', 'NO se puede hacer admin',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$update profiles set role = 'admin' where id = auth.uid()$$, 'deniega');

select pg_temp.probar('editor', 'NO puede administrar invitaciones (es de admin)',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$select count(*)::text from editor_invitations$$, '0');

-- ===========================================================================
-- 5. El precio lo pone la base, no el cliente
-- ===========================================================================
do $$
declare
  v_precio numeric;
  v_estado compra_estado;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

  -- crear_compra es SECURITY DEFINER: bypassea RLS y los privilegios, pero NO
  -- los triggers. El trigger snapshot_compra pisa el precio con el real.
  select precio_pagado into v_precio
    from public.crear_compra('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mercadopago');

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);

  select estado into v_estado from compras
   where user_id = '22222222-2222-2222-2222-222222222222'
   order by created_at desc limit 1;

  perform pg_temp.afirmar('rpc', 'crear_compra toma el precio real del producto',
    v_precio = 12345, format('precio_pagado = %s, esperaba 12345', v_precio));
  perform pg_temp.afirmar('rpc', 'crear_compra deja la compra pendiente',
    v_estado = 'pendiente', format('estado = %s', v_estado));
exception when others then
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.afirmar('rpc', 'crear_compra funciona', false, left(sqlerrm, 90));
end $$;

-- confirmar_pago está fuera del alcance del cliente.
select pg_temp.probar('rpc', 'confirmar_pago NO es invocable por un logueado',
  'authenticated', '22222222-2222-2222-2222-222222222222',
  $$select public.confirmar_pago(
      (select order_id from compras
        where user_id = '22222222-2222-2222-2222-222222222222'
        order by created_at desc limit 1),
      'pago-falso', 'approved')::text$$,
  'deniega');

select pg_temp.probar('rpc', 'confirmar_pago NO es invocable por anon',
  'anon', null,
  $$select public.confirmar_pago(gen_random_uuid(), 'x', 'approved')::text$$,
  'deniega');

-- ===========================================================================
-- 6. El webhook: idempotencia
-- ===========================================================================
do $$
declare
  v_order uuid;
  v_n1 integer;
  v_n2 integer;
begin
  select order_id into v_order from compras
   where user_id = '22222222-2222-2222-2222-222222222222'
   order by created_at desc limit 1;

  v_n1 := public.confirmar_pago(v_order, 'pago-1', 'approved');
  v_n2 := public.confirmar_pago(v_order, 'pago-1', 'approved');

  perform pg_temp.afirmar('webhook', 'la primera confirmación habilita el acceso',
    v_n1 = 1, format('actualizó %s filas, esperaba 1', v_n1));
  perform pg_temp.afirmar('webhook', 'la notificación repetida no vuelve a aplicar',
    v_n2 = 0, format('actualizó %s filas, esperaba 0', v_n2));
end $$;

do $$
declare v_order uuid; v_n integer;
begin
  select order_id into v_order from compras
   where user_id = '11111111-1111-1111-1111-111111111111' limit 1;
  v_n := public.confirmar_pago(v_order, 'pago-x', 'pending');
  perform pg_temp.afirmar('webhook', 'un pago pendiente no cambia el estado',
    v_n = 0, format('actualizó %s filas, esperaba 0', v_n));
end $$;

-- El unique parcial: una sola compra pagada por (alumno, producto).
select pg_temp.afirmar('webhook', 'no se duplica el acceso al mismo material',
  (select count(*) from compras
    where user_id = '22222222-2222-2222-2222-222222222222'
      and producto_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and estado = 'pagada') = 1);

-- ===========================================================================
-- 7. Storage: el PDF sólo lo alcanza quien compró
-- ===========================================================================
insert into storage.objects (bucket_id, name)
values ('guias', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/material.pdf'),
       ('guias', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/material.pdf'),
       ('publico', 'portadas/tapa.jpg');

-- El alumno compró el producto 'aaaa...': alcanza ese PDF y sólo ese.
select pg_temp.probar('storage', 'el comprador alcanza el PDF que compró',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select count(*)::text from storage.objects
     where bucket_id = 'guias'
       and name like 'aaaaaaaa%'$$, '1');

select pg_temp.probar('storage', 'el comprador NO alcanza otros PDF',
  'authenticated', '11111111-1111-1111-1111-111111111111',
  $$select count(*)::text from storage.objects
     where bucket_id = 'guias'
       and name like 'bbbbbbbb%'$$, '0');

select pg_temp.probar('storage', 'quien no compró NO alcanza ningún PDF',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$select count(*)::text from storage.objects where bucket_id = 'guias'$$, '2');

select pg_temp.probar('storage', 'las imágenes públicas se ven sin cuenta',
  'anon', null,
  $$select count(*)::text from storage.objects where bucket_id = 'publico'$$, '1');

select pg_temp.probar('storage', 'anon NO alcanza los PDF',
  'anon', null,
  $$select count(*)::text from storage.objects where bucket_id = 'guias'$$, '0');

-- ===========================================================================
-- 8. Invitaciones de editor
--
-- El trigger handle_new_user consume un token del metadata del registro y
-- promueve el rol. Es la única vía de auto-promoción del sistema, así que un
-- error acá convierte el registro público en "hacete editor".
-- ===========================================================================
insert into editor_invitations (token, role, expires_at)
values ('token-valido',   'editor', now() + interval '7 days'),
       ('token-vencido',  'editor', now() - interval '1 day');

-- Registro con un token válido → queda editora.
do $$
declare v_id uuid := '44444444-4444-4444-4444-444444444444';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, 'invitada@test.cisur',
          '{"nombre":"Invitada","invite_token":"token-valido"}'::jsonb);
  perform pg_temp.afirmar('invitacion', 'un token válido promueve a editora',
    (select role from profiles where id = v_id) = 'editor',
    format('quedó como %s', (select role from profiles where id = v_id)));
  perform pg_temp.afirmar('invitacion', 'el token queda marcado como usado',
    (select used_at is not null and used_by = v_id
       from editor_invitations where token = 'token-valido'));
end $$;

-- El mismo token, otra persona → NO promueve (un solo uso).
do $$
declare v_id uuid := '55555555-5555-5555-5555-555555555555';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, 'reusa@test.cisur',
          '{"invite_token":"token-valido"}'::jsonb);
  perform pg_temp.afirmar('invitacion', 'un token ya usado NO vuelve a promover',
    (select role from profiles where id = v_id) = 'user',
    format('quedó como %s', (select role from profiles where id = v_id)));
end $$;

-- Token vencido → no promueve.
do $$
declare v_id uuid := '66666666-6666-6666-6666-666666666666';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, 'vencido@test.cisur',
          '{"invite_token":"token-vencido"}'::jsonb);
  perform pg_temp.afirmar('invitacion', 'un token vencido NO promueve',
    (select role from profiles where id = v_id) = 'user',
    format('quedó como %s', (select role from profiles where id = v_id)));
end $$;

-- Token inventado → no promueve.
do $$
declare v_id uuid := '77777777-7777-7777-7777-777777777777';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, 'inventado@test.cisur',
          '{"invite_token":"cualquier-cosa"}'::jsonb);
  perform pg_temp.afirmar('invitacion', 'un token inventado NO promueve',
    (select role from profiles where id = v_id) = 'user',
    format('quedó como %s', (select role from profiles where id = v_id)));
end $$;

-- Registro normal, sin token → alumno.
do $$
declare v_id uuid := '88888888-8888-8888-8888-888888888888';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, 'normal@test.cisur', '{"nombre":"Normal"}'::jsonb);
  perform pg_temp.afirmar('invitacion', 'un registro sin token queda como alumno',
    (select role from profiles where id = v_id) = 'user');
  perform pg_temp.afirmar('invitacion', 'el registro copia el mail y el nombre',
    (select email = 'normal@test.cisur' and nombre = 'Normal'
       from profiles where id = v_id));
end $$;

-- Un editor NO puede fabricarse una invitación (eso es de admin).
select pg_temp.probar_escritura('invitacion', 'un editor NO puede crear invitaciones',
  'authenticated', '33333333-3333-3333-3333-333333333333',
  $$insert into editor_invitations (token, role, expires_at)
    values ('token-trucho', 'admin', now() + interval '1 day')$$, 'deniega');

-- ===========================================================================
-- REPORTE
-- ===========================================================================
select
  case when ok then 'OK   ' else 'FALLA' end as estado,
  grupo,
  prueba,
  detalle
from resultado
order by n;

select
  case
    when count(*) filter (where not ok) = 0
      then format('TODO OK — %s pruebas pasaron', count(*))
    else format('¡ATENCIÓN! %s de %s pruebas FALLARON', count(*) filter (where not ok), count(*))
  end as resumen
from resultado;

rollback;
