-- ============================================================================
-- CISUR — limpiar los datos de prueba
--
-- La primera versión de los smoke tests terminaba con ROLLBACK, dando por
-- sentado que todo corría en una sola transacción. El SQL Editor de Supabase
-- confirma cada sentencia por separado, así que ese ROLLBACK no deshizo nada y
-- los datos de prueba quedaron en la base.
--
-- Este script los borra. Es seguro y se puede correr las veces que haga falta:
-- toca únicamente filas con identificadores de prueba y no roza nada real.
--
-- CÓMO CORRERLO
--   Supabase → SQL Editor → pegar todo → Run.
--   La última tabla tiene que decir "LIMPIO".
-- ============================================================================

-- Objetos de Storage de prueba (no son archivos reales, sólo filas).
delete from storage.objects
 where bucket_id in ('guias', 'publico')
   and (name like 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/%'
     or name like 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/%'
     or name = 'portadas/tapa.jpg');

-- Compras de prueba. Van antes que los productos por la clave foránea.
delete from compras
 where producto_id in (
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 );

delete from productos
 where slug in ('test-activo', 'test-borrador', 'hack', 'hackeado');

-- Invitaciones de prueba.
delete from editor_invitations
 where token in ('token-valido', 'token-vencido', 'token-trucho');

-- Textos de prueba.
delete from site_settings
 where key in ('prueba_editor', 'hack', 'hack2', 'hackeado');

-- Usuarios de prueba. Borrar de auth.users arrastra en cascada su profile y
-- sus compras.
delete from auth.users where email like '%@test.cisur';

-- Restos de la versión vieja del script, por las dudas.
drop table if exists public.smoke_resultado;
drop function if exists public.smoke_probar(text, text, text, uuid, text, text);
drop function if exists public.smoke_probar_escritura(text, text, text, uuid, text, text);
drop function if exists public.smoke_afirmar(text, text, boolean, text);

-- ---------------------------------------------------------------------------
-- Verificación: tiene que decir LIMPIO
-- ---------------------------------------------------------------------------
select
  case when (
      (select count(*) from auth.users where email like '%@test.cisur')
    + (select count(*) from productos where slug in ('test-activo', 'test-borrador', 'hack', 'hackeado'))
    + (select count(*) from editor_invitations where token in ('token-valido', 'token-vencido', 'token-trucho'))
    + (select count(*) from site_settings where key in ('prueba_editor', 'hack', 'hack2', 'hackeado'))
  ) = 0
    then 'LIMPIO — no quedó ningún dato de prueba'
    else '¡ATENCIÓN! todavía quedan datos de prueba'
  end as resultado;

-- Lo que SÍ tiene que seguir estando: los dos materiales reales.
select slug, titulo, precio, activo from productos order by orden;
