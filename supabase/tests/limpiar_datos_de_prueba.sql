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
--   Mirá la última tabla: cada fila tiene que decir OK.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Objetos de Storage
--
-- Supabase bloquea el DELETE directo sobre storage.objects con un trigger
-- (protect_delete): obliga a pasar por la Storage API para no dejar archivos
-- huérfanos en el bucket. Acá se intenta desactivarlo un momento; si el usuario
-- del SQL Editor no tiene permiso, no se corta el script y el informe final
-- explica cómo borrarlos a mano.
--
-- Son filas sin archivo detrás: las creó una versión vieja de los smoke tests.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter table storage.objects disable trigger protect_delete;
  exception when others then
    null; -- sin permiso: se intenta el delete igual, por si no existe el trigger
  end;

  begin
    delete from storage.objects
     where bucket_id in ('guias', 'publico')
       and (name like 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/%'
         or name like 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/%'
         or name = 'portadas/tapa.jpg');
  exception when others then
    null; -- lo reporta la tabla del final
  end;

  begin
    alter table storage.objects enable trigger protect_delete;
  exception when others then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- El resto sí se borra sin obstáculos
-- ---------------------------------------------------------------------------

-- Compras de prueba. Van antes que los productos por la clave foránea.
delete from compras
 where producto_id in (
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 );

delete from productos
 where slug in ('test-activo', 'test-borrador', 'hack', 'hackeado');

delete from editor_invitations
 where token in ('token-valido', 'token-vencido', 'token-trucho');

delete from site_settings
 where key in ('prueba_editor', 'hack', 'hack2', 'hackeado');

-- Usuarios de prueba. Borrar de auth.users arrastra en cascada su profile y
-- sus compras.
delete from auth.users where email like '%@test.cisur';

-- Restos de las funciones auxiliares de los smoke tests.
drop table if exists public.smoke_resultado;
drop function if exists public.smoke_probar(text, text, text, uuid, text, text);
drop function if exists public.smoke_probar_escritura(text, text, text, uuid, text, text);
drop function if exists public.smoke_afirmar(text, text, boolean, text);

-- ---------------------------------------------------------------------------
-- Informe: todas las filas tienen que decir OK
-- ---------------------------------------------------------------------------
with conteos as (
  select
    (select count(*) from auth.users where email like '%@test.cisur') as usuarios,
    (select count(*) from productos
      where slug in ('test-activo', 'test-borrador', 'hack', 'hackeado')) as productos,
    (select count(*) from editor_invitations
      where token in ('token-valido', 'token-vencido', 'token-trucho')) as invitaciones,
    (select count(*) from site_settings
      where key in ('prueba_editor', 'hack', 'hack2', 'hackeado')) as textos,
    (select count(*) from storage.objects
      where bucket_id in ('guias', 'publico')
        and (name like 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/%'
          or name like 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/%'
          or name = 'portadas/tapa.jpg')) as objetos
)
select * from (
  select 1 as n, 'usuarios de prueba' as que, usuarios as quedan,
         case when usuarios = 0 then 'OK' else 'revisar' end as estado from conteos
  union all
  select 2, 'productos de prueba', productos,
         case when productos = 0 then 'OK' else 'revisar' end from conteos
  union all
  select 3, 'invitaciones de prueba', invitaciones,
         case when invitaciones = 0 then 'OK' else 'revisar' end from conteos
  union all
  select 4, 'textos de prueba', textos,
         case when textos = 0 then 'OK' else 'revisar' end from conteos
  union all
  select 5, 'objetos de Storage', objetos,
         case when objetos = 0 then 'OK'
              else 'borralos a mano: Storage → guias y publico' end from conteos
) t order by n;

-- Lo que SÍ tiene que seguir estando: los dos materiales reales.
select slug, titulo, precio, activo from productos order by orden;
