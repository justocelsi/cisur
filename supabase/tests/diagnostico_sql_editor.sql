-- ============================================================================
-- CISUR — diagnóstico del SQL Editor de Supabase
--
-- No prueba nada del proyecto: sirve para averiguar CÓMO ejecuta el SQL Editor
-- un script de varias sentencias. De eso depende cómo hay que escribir los
-- scripts de mantenimiento, y ya me equivoqué dos veces adivinándolo.
--
-- Es inofensivo: crea una tabla temporal de nombre propio y la borra.
--
-- CÓMO CORRERLO
--   Supabase → SQL Editor → pegar todo → Run.
--   Copiame TODO lo que salga, incluido el error si aparece alguno.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Quién soy y qué puedo
-- ---------------------------------------------------------------------------
select
  current_user                                   as usuario_actual,
  session_user                                   as usuario_de_sesion,
  current_setting('is_superuser')                as es_superusuario,
  current_setting('search_path')                 as search_path,
  has_schema_privilege('public', 'CREATE')       as puedo_crear_en_public,
  has_table_privilege('auth.users', 'INSERT')    as puedo_insertar_usuarios,
  has_table_privilege('auth.users', 'DELETE')    as puedo_borrar_usuarios,
  has_table_privilege('storage.objects', 'INSERT') as puedo_insertar_objetos;

-- ---------------------------------------------------------------------------
-- 2. ¿Las sentencias comparten transacción?
--    Si las dos filas traen el MISMO número de transacción, el editor manda
--    todo junto. Si traen números distintos, cada sentencia va por separado.
-- ---------------------------------------------------------------------------
select 'primera sentencia' as momento, txid_current() as transaccion;

select 'segunda sentencia' as momento, txid_current() as transaccion;

-- ---------------------------------------------------------------------------
-- 3. ¿Una tabla creada a mitad del script existe para las sentencias que
--    vienen después? Este es el punto que rompió los smoke tests.
-- ---------------------------------------------------------------------------
drop table if exists public.diag_cisur;

create table public.diag_cisur (nota text);

insert into public.diag_cisur (nota) values ('la tabla sobrevivió entre sentencias');

select nota as resultado_tabla_comun from public.diag_cisur;

-- ---------------------------------------------------------------------------
-- 4. ¿Y una función creada a mitad del script?
-- ---------------------------------------------------------------------------
create or replace function public.diag_cisur_fn() returns text
language sql as $$ select 'la función sobrevivió entre sentencias'::text $$;

select public.diag_cisur_fn() as resultado_funcion;

-- ---------------------------------------------------------------------------
-- 5. ¿Se puede escribir en auth.users? (los smoke tests lo necesitan)
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'diag@test.cisur', '{}'::jsonb);
    insert into public.diag_cisur (nota) values ('auth.users: INSERT anduvo');
  exception when others then
    insert into public.diag_cisur (nota) values ('auth.users: INSERT falló → ' || left(sqlerrm, 80));
  end;

  begin
    delete from auth.users where email = 'diag@test.cisur';
    insert into public.diag_cisur (nota) values ('auth.users: DELETE anduvo');
  exception when others then
    insert into public.diag_cisur (nota) values ('auth.users: DELETE falló → ' || left(sqlerrm, 80));
  end;
end $$;

select nota as resultado_auth from public.diag_cisur where nota like 'auth.users%';

-- ---------------------------------------------------------------------------
-- 6. Limpieza
-- ---------------------------------------------------------------------------
drop table if exists public.diag_cisur;
drop function if exists public.diag_cisur_fn();
delete from auth.users where email = 'diag@test.cisur';

select 'diagnóstico terminado' as fin;
