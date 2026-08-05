-- ============================================================================
-- CISUR — instalador de los smoke tests de seguridad
--
-- Se corre UNA VEZ. Deja instalada la función public.cisur_smoke_tests(), y a
-- partir de ahí correr las pruebas es una sola línea:
--
--     select * from public.cisur_smoke_tests();
--
-- POR QUÉ ASÍ
-- Las versiones anteriores eran un script de muchas sentencias que guardaba
-- resultados en una tabla intermedia. Eso falló tres veces seguidas en el SQL
-- Editor de Supabase, siempre por lo mismo: no se puede dar por sentado que una
-- sentencia vea lo que creó la anterior, ni que un ROLLBACK al final deshaga
-- algo.
--
-- Metiendo toda la suite adentro de una función, correrla es UNA sentencia:
-- prepara sus datos, corre las pruebas, limpia y devuelve el informe, todo
-- dentro de la misma llamada. Deja de depender de cómo agrupe las sentencias el
-- cliente de turno.
--
-- Este instalador, en cambio, son sentencias independientes entre sí: cada una
-- es un CREATE que no necesita nada de las anteriores en tiempo de ejecución.
--
-- REGLA PARA AGREGAR PRUEBAS
-- Ninguna afirmación puede depender de cuántas filas hay en la base. La suite
-- se corre en PRODUCCIÓN, con clientes reales adentro. Toda cuenta se filtra
-- por los actores de prueba (`%@test.cisur`) o por los slugs de prueba, salvo
-- que lo que se mide pase por RLS y por lo tanto ya esté acotado al actor.
-- Se aprendió con "editor ve las ventas", que pasó con la base vacía y empezó
-- a fallar sola con la primera venta de verdad.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- El tipo que devuelve cada prueba
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.cisur_resultado as (
    ok      boolean,
    grupo   text,
    prueba  text,
    detalle text
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Corre una CONSULTA con un rol simulado y compara contra lo esperado.
--
-- p_espera:
--   'deniega'  → la sentencia TIENE que fallar (falta privilegio o la bloquea
--                un trigger). Es el caso más importante de todos.
--   'permite'  → tiene que correr sin error.
--   otra cosa  → es el valor que se espera de vuelta ('0', '1', 'true'...).
--
-- El bloque EXCEPTION crea un savepoint implícito: un error esperado no aborta
-- nada y la suite sigue.
-- ---------------------------------------------------------------------------
create or replace function public.cisur_probar(
  p_grupo text, p_prueba text, p_rol text, p_uid uuid,
  p_sql text, p_espera text
) returns public.cisur_resultado
language plpgsql
as $fn$
declare
  v_ok      boolean := false;
  v_detalle text;
  v_valor   text;
begin
  -- Simula la conexión: rol + claims del JWT, igual que hace el pooler.
  perform set_config('role', p_rol, true);
  perform set_config('request.jwt.claims',
    case when p_uid is null
      then json_build_object('role', p_rol)::text
      else json_build_object('sub', p_uid::text, 'role', p_rol)::text
    end, true);

  begin
    execute p_sql into v_valor;

    if p_espera = 'deniega' then
      v_ok := false;
      v_detalle := 'la sentencia corrió cuando debía ser rechazada';
    elsif p_espera = 'permite' then
      v_ok := true;
    else
      v_ok := (v_valor is not distinct from p_espera);
      v_detalle := format('devolvió %s, esperaba %s',
                          coalesce(v_valor, 'null'), p_espera);
    end if;
  exception when others then
    v_ok := (p_espera = 'deniega');
    v_detalle := left(sqlerrm, 90);
  end;

  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);

  return row(v_ok, p_grupo, p_prueba,
             case when v_ok then null else v_detalle end)::public.cisur_resultado;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Igual, pero para sentencias que no devuelven valor (insert/update/delete).
-- ---------------------------------------------------------------------------
create or replace function public.cisur_probar_escritura(
  p_grupo text, p_prueba text, p_rol text, p_uid uuid,
  p_sql text, p_espera text
) returns public.cisur_resultado
language plpgsql
as $fn$
declare
  v_ok      boolean := false;
  v_detalle text;
begin
  perform set_config('role', p_rol, true);
  perform set_config('request.jwt.claims',
    case when p_uid is null
      then json_build_object('role', p_rol)::text
      else json_build_object('sub', p_uid::text, 'role', p_rol)::text
    end, true);

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

  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);

  return row(v_ok, p_grupo, p_prueba,
             case when v_ok then null else v_detalle end)::public.cisur_resultado;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Afirmación directa, sin cambiar de rol.
-- ---------------------------------------------------------------------------
create or replace function public.cisur_afirmar(
  p_grupo text, p_prueba text, p_ok boolean, p_detalle text default null
) returns public.cisur_resultado
language sql
as $fn$
  select row(coalesce(p_ok, false), p_grupo, p_prueba,
             case when coalesce(p_ok, false) then null
                  else coalesce(p_detalle, 'no se cumplió') end
         )::public.cisur_resultado;
$fn$;

-- ===========================================================================
-- LA SUITE
--
-- Todo en una sola llamada: prepara, prueba, limpia y devuelve el informe.
-- ===========================================================================
create or replace function public.cisur_smoke_tests()
returns table (estado text, grupo text, prueba text, detalle text)
language plpgsql
as $fn$
declare
  r  public.cisur_resultado[] := '{}';
  x  public.cisur_resultado;

  -- Actores
  u_alumno  uuid := '11111111-1111-1111-1111-111111111111';
  u_ajeno   uuid := '22222222-2222-2222-2222-222222222222';
  u_editor  uuid := '33333333-3333-3333-3333-333333333333';
  -- Nunca compra nada: el "ajeno" sí termina comprando en la sección 5.
  u_curioso uuid := '99999999-9999-9999-9999-999999999999';

  p_ok  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';  -- producto publicado
  p_bor uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';  -- producto en borrador

  v_precio numeric;
  v_estado compra_estado;
  v_order  uuid;
  v_n1 integer;
  v_n2 integer;
  v_fallas integer;
begin
  -- =========================================================================
  -- PREPARACIÓN (limpia primero, por si una corrida anterior se cortó)
  -- =========================================================================
  delete from compras where producto_id in (p_ok, p_bor);
  delete from productos where slug in ('test-activo', 'test-borrador', 'hack', 'hackeado');
  delete from editor_invitations where token in ('token-valido', 'token-vencido', 'token-trucho');
  delete from site_settings where key in ('prueba_editor', 'hack', 'hack2', 'hackeado');
  delete from auth.users where email like '%@test.cisur';

  insert into auth.users (id, email, raw_user_meta_data)
  values (u_alumno,  'alumno@test.cisur',  '{"nombre":"Alumno"}'::jsonb),
         (u_ajeno,   'ajeno@test.cisur',   '{"nombre":"Ajeno"}'::jsonb),
         (u_editor,  'editor@test.cisur',  '{"nombre":"Editora"}'::jsonb),
         (u_curioso, 'curioso@test.cisur', '{"nombre":"Curioso"}'::jsonb);

  -- El trigger handle_new_user ya creó los profiles; promovemos a la editora
  -- desde acá (es_backend() = true, el trigger lo permite).
  update profiles set role = 'editor' where id = u_editor;

  insert into productos (id, slug, titulo, precio, activo)
  values (p_ok,  'test-activo',   'Test activo',   10000, true),
         (p_bor, 'test-borrador', 'Test borrador', 10000, false);

  insert into compras as c (user_id, producto_id, estado, precio_pagado, pagado_en)
  values (u_alumno, p_ok, 'pagada', 10000, now());

  -- =========================================================================
  -- 1. ANÓNIMO — cualquiera que abra el sitio sin cuenta
  -- =========================================================================
  r := r || public.cisur_probar('anon', 've el catálogo publicado', 'anon', null,
    $q$select count(*)::text from productos where slug = 'test-activo'$q$, '1');

  r := r || public.cisur_probar('anon', 'NO ve los borradores', 'anon', null,
    $q$select count(*)::text from productos where slug = 'test-borrador'$q$, '0');

  r := r || public.cisur_probar('anon', 'lee los textos del sitio', 'anon', null,
    $q$select count(*)::text from site_settings$q$, 'permite');

  r := r || public.cisur_probar('anon', 've los talleres visibles', 'anon', null,
    $q$select count(*)::text from talleres$q$, 'permite');

  -- Sin privilegio de tabla: ni siquiera puede intentar leerlas.
  r := r || public.cisur_probar('anon', 'NO alcanza la tabla de compras', 'anon', null,
    $q$select count(*)::text from compras$q$, 'deniega');

  r := r || public.cisur_probar('anon', 'NO alcanza la tabla de perfiles', 'anon', null,
    $q$select count(*)::text from profiles$q$, 'deniega');

  r := r || public.cisur_probar_escritura('anon', 'NO puede crear un producto', 'anon', null,
    $q$insert into productos (slug, titulo, precio) values ('hack', 'Hack', 0)$q$, 'deniega');

  r := r || public.cisur_probar_escritura('anon', 'NO puede editar los textos del sitio', 'anon', null,
    $q$insert into site_settings (key, value) values ('hack', 'x')$q$, 'deniega');

  -- =========================================================================
  -- 2. ALUMNO QUE COMPRÓ
  -- =========================================================================
  r := r || public.cisur_probar('alumno', 've su propia compra', 'authenticated', u_alumno,
    $q$select count(*)::text from compras$q$, '1');

  r := r || public.cisur_probar('alumno', 'tiene acceso a lo que compró', 'authenticated', u_alumno,
    $q$select public.tiene_acceso('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text$q$, 'true');

  r := r || public.cisur_probar('alumno', 'NO tiene acceso a lo que no compró', 'authenticated', u_alumno,
    $q$select public.tiene_acceso('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::text$q$, 'false');

  r := r || public.cisur_probar('alumno', 've únicamente su perfil', 'authenticated', u_alumno,
    $q$select count(*)::text from profiles$q$, '1');

  r := r || public.cisur_probar('alumno', 'no es editor', 'authenticated', u_alumno,
    $q$select public.is_editor()::text$q$, 'false');

  -- El ataque clásico: auto-promoverse. Lo bloquea el trigger de 0003.
  r := r || public.cisur_probar_escritura('alumno', 'NO se puede hacer admin', 'authenticated', u_alumno,
    $q$update profiles set role = 'admin' where id = auth.uid()$q$, 'deniega');

  -- Regalarse una compra. Lo bloquea el privilegio de tabla (0002).
  r := r || public.cisur_probar_escritura('alumno', 'NO puede insertar una compra', 'authenticated', u_alumno,
    $q$insert into compras (user_id, producto_id, estado, precio_pagado)
       values (auth.uid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pagada', 0)$q$, 'deniega');

  r := r || public.cisur_probar_escritura('alumno', 'NO puede tocar el estado de su compra', 'authenticated', u_alumno,
    $q$update compras set estado = 'pagada' where user_id = auth.uid()$q$, 'deniega');

  r := r || public.cisur_probar_escritura('alumno', 'NO puede borrar su compra', 'authenticated', u_alumno,
    $q$delete from compras where user_id = auth.uid()$q$, 'deniega');

  -- Cambiar el precio: tiene privilegio de UPDATE (mismo rol que los editores),
  -- así que acá el que frena es RLS. No da error: no matchea ninguna fila.
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', u_alumno::text, 'role', 'authenticated')::text, true);
    update productos set precio = 1 where slug = 'test-activo';
  exception when others then null;
  end;
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);

  r := r || public.cisur_afirmar('alumno', 'NO logra cambiar el precio de un producto',
    (select precio from productos where slug = 'test-activo') = 10000, 'el precio cambió');

  r := r || public.cisur_probar_escritura('alumno', 'NO puede editar los textos del sitio', 'authenticated', u_alumno,
    $q$insert into site_settings (key, value) values ('hack2', 'x')$q$, 'deniega');

  -- =========================================================================
  -- 3. USUARIO AJENO — con cuenta, sin haber comprado
  -- =========================================================================
  r := r || public.cisur_probar('ajeno', 'NO ve las compras de otro', 'authenticated', u_ajeno,
    $q$select count(*)::text from compras$q$, '0');

  r := r || public.cisur_probar('ajeno', 'NO tiene acceso al material', 'authenticated', u_ajeno,
    $q$select public.tiene_acceso('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::text$q$, 'false');

  r := r || public.cisur_probar('ajeno', 'NO ve el perfil de otro', 'authenticated', u_ajeno,
    $q$select count(*)::text from profiles
       where id <> '22222222-2222-2222-2222-222222222222'$q$, '0');

  r := r || public.cisur_probar('ajeno', 'NO ve los datos de venta', 'authenticated', u_ajeno,
    $q$select count(*)::text from public.ventas()$q$, '0');

  -- =========================================================================
  -- 4. EDITORA (Tati) — administra, pero no se regala nada
  -- =========================================================================
  r := r || public.cisur_probar('editor', 'es editora', 'authenticated', u_editor,
    $q$select public.is_editor()::text$q$, 'true');

  r := r || public.cisur_probar('editor', 'no es admin', 'authenticated', u_editor,
    $q$select public.is_admin()::text$q$, 'false');

  r := r || public.cisur_probar('editor', 've también los borradores', 'authenticated', u_editor,
    $q$select count(*)::text from productos
       where slug in ('test-activo', 'test-borrador')$q$, '2');

  -- Se filtra por los actores de prueba a propósito. `ventas()` le muestra a la
  -- editora TODAS las ventas —para eso existe—, así que contar sin filtro daba
  -- el total real de la base: la prueba pasaba con la base vacía y empezó a
  -- fallar sola con la primera venta de verdad. Una suite que falla por tener
  -- clientes es una suite que se deja de mirar.
  r := r || public.cisur_probar('editor', 've las ventas', 'authenticated', u_editor,
    $q$select count(*)::text from public.ventas()
       where email like '%@test.cisur'$q$, '1');

  r := r || public.cisur_probar_escritura('editor', 'SÍ puede administrar el catálogo', 'authenticated', u_editor,
    $q$update productos set precio = 12345 where slug = 'test-activo'$q$, 'permite');

  r := r || public.cisur_afirmar('editor', 'el cambio de precio se guardó',
    (select precio from productos where slug = 'test-activo') = 12345, 'el precio no cambió');

  r := r || public.cisur_probar_escritura('editor', 'SÍ puede editar los textos', 'authenticated', u_editor,
    $q$insert into site_settings (key, value) values ('prueba_editor', 'ok')
       on conflict (key) do update set value = 'ok'$q$, 'permite');

  -- Ni la editora se regala acceso: no tiene privilegio de INSERT en compras.
  r := r || public.cisur_probar_escritura('editor', 'NO puede regalarse una compra', 'authenticated', u_editor,
    $q$insert into compras (user_id, producto_id, estado, precio_pagado)
       values (auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pagada', 0)$q$, 'deniega');

  r := r || public.cisur_probar_escritura('editor', 'NO puede marcar una compra como pagada', 'authenticated', u_editor,
    $q$update compras set estado = 'pagada'$q$, 'deniega');

  r := r || public.cisur_probar_escritura('editor', 'NO se puede hacer admin', 'authenticated', u_editor,
    $q$update profiles set role = 'admin' where id = auth.uid()$q$, 'deniega');

  r := r || public.cisur_probar('editor', 'NO administra invitaciones (eso es de admin)', 'authenticated', u_editor,
    $q$select count(*)::text from editor_invitations$q$, '0');

  -- =========================================================================
  -- 5. El precio lo pone la base, no el cliente
  -- =========================================================================
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', u_ajeno::text, 'role', 'authenticated')::text, true);

    -- crear_compra es SECURITY DEFINER: bypassea RLS y los privilegios, pero
    -- NO los triggers. snapshot_compra pisa el precio con el real.
    select precio_pagado into v_precio
      from public.crear_compra(p_ok, 'mercadopago');

    perform set_config('role', 'none', true);
    perform set_config('request.jwt.claims', '', true);

    select c.estado into v_estado from compras c
     where c.user_id = u_ajeno order by c.created_at desc limit 1;

    r := r || public.cisur_afirmar('rpc', 'crear_compra toma el precio real del producto',
      v_precio = 12345, format('precio_pagado = %s, esperaba 12345', v_precio));
    r := r || public.cisur_afirmar('rpc', 'crear_compra deja la compra pendiente',
      v_estado = 'pendiente', format('estado = %s', v_estado));
  exception when others then
    perform set_config('role', 'none', true);
    perform set_config('request.jwt.claims', '', true);
    r := r || public.cisur_afirmar('rpc', 'crear_compra funciona', false, left(sqlerrm, 90));
  end;

  r := r || public.cisur_probar('rpc', 'confirmar_pago NO es invocable por un logueado',
    'authenticated', u_ajeno,
    $q$select public.confirmar_pago(
        (select order_id from compras
          where user_id = '22222222-2222-2222-2222-222222222222'
          order by created_at desc limit 1), 'pago-falso', 'approved')::text$q$, 'deniega');

  r := r || public.cisur_probar('rpc', 'confirmar_pago NO es invocable por anon', 'anon', null,
    $q$select public.confirmar_pago(gen_random_uuid(), 'x', 'approved')::text$q$, 'deniega');

  -- =========================================================================
  -- 6. El webhook: idempotencia
  -- =========================================================================
  select c.order_id into v_order from compras c
   where c.user_id = u_ajeno order by c.created_at desc limit 1;

  v_n1 := public.confirmar_pago(v_order, 'pago-1', 'approved');
  v_n2 := public.confirmar_pago(v_order, 'pago-1', 'approved');

  r := r || public.cisur_afirmar('webhook', 'la primera confirmación habilita el acceso',
    v_n1 = 1, format('actualizó %s filas, esperaba 1', v_n1));
  r := r || public.cisur_afirmar('webhook', 'la notificación repetida no vuelve a aplicar',
    v_n2 = 0, format('actualizó %s filas, esperaba 0', v_n2));

  select c.order_id into v_order from compras c where c.user_id = u_alumno limit 1;
  v_n1 := public.confirmar_pago(v_order, 'pago-x', 'pending');
  r := r || public.cisur_afirmar('webhook', 'un pago pendiente no cambia el estado',
    v_n1 = 0, format('actualizó %s filas, esperaba 0', v_n1));

  -- El índice único parcial: una sola compra pagada por (alumno, producto).
  r := r || public.cisur_afirmar('webhook', 'no se duplica el acceso al mismo material',
    (select count(*) from compras c
      where c.user_id = u_ajeno and c.producto_id = p_ok and c.estado = 'pagada') = 1);

  -- =========================================================================
  -- 7. Storage: el PDF sólo lo alcanza quien compró
  --
  -- NO se insertan filas en storage.objects: Supabase bloquea borrarlas por SQL
  -- (trigger protect_delete), así que quedarían como archivos fantasma en el
  -- bucket. Se verifica la misma lógica que evalúa la policy, pieza por pieza.
  -- La prueba de punta a punta es la compra manual (DEPLOY.md, paso 9).
  -- =========================================================================
  r := r || public.cisur_afirmar('storage', 'el bucket de los PDF es privado',
    (select not public from storage.buckets where id = 'guias'),
    'el bucket guias quedó público: cualquiera podría bajar los PDF');

  r := r || public.cisur_afirmar('storage', 'el bucket de imágenes es público',
    (select public from storage.buckets where id = 'publico'));

  r := r || public.cisur_afirmar('storage', 'las policies de Storage están instaladas',
    (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname in ('publico_select', 'publico_write', 'guias_select', 'guias_write')) = 4,
    'faltan policies: revisá que 0005_storage.sql se haya aplicado');

  -- La convención de path es de donde la policy deriva el permiso.
  r := r || public.cisur_afirmar('storage', 'el path del PDF lleva el id del producto',
    (storage.foldername('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/material.pdf'))[1]
      = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cambió la convención de path y la policy ya no encuentra el producto');

  r := r || public.cisur_probar('storage', 'el comprador alcanza el PDF que compró',
    'authenticated', u_alumno,
    $q$select public.tiene_acceso(
        ((storage.foldername('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/material.pdf'))[1])::uuid)::text$q$,
    'true');

  r := r || public.cisur_probar('storage', 'el comprador NO alcanza otro PDF',
    'authenticated', u_alumno,
    $q$select public.tiene_acceso(
        ((storage.foldername('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/material.pdf'))[1])::uuid)::text$q$,
    'false');

  r := r || public.cisur_probar('storage', 'quien no compró NO alcanza el PDF',
    'authenticated', u_curioso,
    $q$select public.tiene_acceso(
        ((storage.foldername('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/material.pdf'))[1])::uuid)::text$q$,
    'false');

  r := r || public.cisur_probar('storage', 'anon NO alcanza el PDF', 'anon', null,
    $q$select coalesce(public.tiene_acceso(
        ((storage.foldername('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/material.pdf'))[1])::uuid), false)::text$q$,
    'false');

  -- =========================================================================
  -- 8. Invitaciones de editora
  --
  -- El trigger handle_new_user consume un token del metadata del registro y
  -- promueve el rol. Es la ÚNICA vía de auto-promoción del sistema: un error
  -- acá convierte el registro público en "hacete editora".
  -- =========================================================================
  insert into editor_invitations (token, role, expires_at)
  values ('token-valido',  'editor', now() + interval '7 days'),
         ('token-vencido', 'editor', now() - interval '1 day');

  insert into auth.users (id, email, raw_user_meta_data)
  values ('44444444-4444-4444-4444-444444444444', 'invitada@test.cisur',
          '{"nombre":"Invitada","invite_token":"token-valido"}'::jsonb);
  r := r || public.cisur_afirmar('invitacion', 'un token válido promueve a editora',
    (select role from profiles where id = '44444444-4444-4444-4444-444444444444') = 'editor',
    format('quedó como %s', (select role from profiles where id = '44444444-4444-4444-4444-444444444444')));
  r := r || public.cisur_afirmar('invitacion', 'el token queda marcado como usado',
    (select used_at is not null and used_by = '44444444-4444-4444-4444-444444444444'
       from editor_invitations where token = 'token-valido'));

  insert into auth.users (id, email, raw_user_meta_data)
  values ('55555555-5555-5555-5555-555555555555', 'reusa@test.cisur',
          '{"invite_token":"token-valido"}'::jsonb);
  r := r || public.cisur_afirmar('invitacion', 'un token ya usado NO vuelve a promover',
    (select role from profiles where id = '55555555-5555-5555-5555-555555555555') = 'user',
    format('quedó como %s', (select role from profiles where id = '55555555-5555-5555-5555-555555555555')));

  insert into auth.users (id, email, raw_user_meta_data)
  values ('66666666-6666-6666-6666-666666666666', 'vencido@test.cisur',
          '{"invite_token":"token-vencido"}'::jsonb);
  r := r || public.cisur_afirmar('invitacion', 'un token vencido NO promueve',
    (select role from profiles where id = '66666666-6666-6666-6666-666666666666') = 'user',
    format('quedó como %s', (select role from profiles where id = '66666666-6666-6666-6666-666666666666')));

  insert into auth.users (id, email, raw_user_meta_data)
  values ('77777777-7777-7777-7777-777777777777', 'inventado@test.cisur',
          '{"invite_token":"cualquier-cosa"}'::jsonb);
  r := r || public.cisur_afirmar('invitacion', 'un token inventado NO promueve',
    (select role from profiles where id = '77777777-7777-7777-7777-777777777777') = 'user',
    format('quedó como %s', (select role from profiles where id = '77777777-7777-7777-7777-777777777777')));

  insert into auth.users (id, email, raw_user_meta_data)
  values ('88888888-8888-8888-8888-888888888888', 'normal@test.cisur',
          '{"nombre":"Normal"}'::jsonb);
  r := r || public.cisur_afirmar('invitacion', 'un registro sin token queda como alumno',
    (select role from profiles where id = '88888888-8888-8888-8888-888888888888') = 'user');
  r := r || public.cisur_afirmar('invitacion', 'el registro copia el mail y el nombre',
    (select email = 'normal@test.cisur' and nombre = 'Normal'
       from profiles where id = '88888888-8888-8888-8888-888888888888'));

  r := r || public.cisur_probar_escritura('invitacion', 'una editora NO puede crear invitaciones',
    'authenticated', u_editor,
    $q$insert into editor_invitations (token, role, expires_at)
       values ('token-trucho', 'admin', now() + interval '1 day')$q$, 'deniega');

  -- =========================================================================
  -- LIMPIEZA — pase lo que pase, la base queda como estaba
  -- =========================================================================
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);

  delete from compras where producto_id in (p_ok, p_bor);
  delete from productos where slug in ('test-activo', 'test-borrador', 'hack', 'hackeado');
  delete from editor_invitations where token in ('token-valido', 'token-vencido', 'token-trucho');
  delete from site_settings where key in ('prueba_editor', 'hack', 'hack2', 'hackeado');
  delete from auth.users where email like '%@test.cisur';

  -- =========================================================================
  -- INFORME
  -- =========================================================================
  select count(*) into v_fallas
    from unnest(r) as t where not t.ok;

  foreach x in array r loop
    estado  := case when x.ok then 'OK   ' else 'FALLA' end;
    grupo   := x.grupo;
    prueba  := x.prueba;
    detalle := x.detalle;
    return next;
  end loop;

  estado := case when v_fallas = 0 then '=====' else '!!!!!' end;
  grupo  := 'RESUMEN';
  prueba := case
    when v_fallas = 0 then format('TODO OK — %s pruebas pasaron', array_length(r, 1))
    else format('¡ATENCIÓN! %s de %s pruebas FALLARON', v_fallas, array_length(r, 1))
  end;
  detalle := 'la base quedó limpia: el script borró todo lo que creó';
  return next;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Sólo el dueño de la base corre esto: no es para anon ni para authenticated.
-- ---------------------------------------------------------------------------
revoke all on function public.cisur_smoke_tests() from public, anon, authenticated;
revoke all on function public.cisur_probar(text, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.cisur_probar_escritura(text, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.cisur_afirmar(text, text, boolean, text) from public, anon, authenticated;

select 'Instalado. Ahora corré:  select * from public.cisur_smoke_tests();' as listo;
