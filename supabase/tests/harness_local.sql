-- ============================================================================
-- CISUR — harness local
--
-- Emula lo que Supabase agrega sobre un Postgres pelado: los roles, el esquema
-- `auth` con su tabla de usuarios y `auth.uid()`, y el esquema `storage`.
--
-- Sirve para correr las migraciones y los smoke tests en una base local ANTES
-- de tocar producción, y encontrar errores de SQL sin gastar un intento en el
-- SQL Editor.
--
-- NO se corre en Supabase: allá todo esto ya existe.
--
-- CÓMO USARLO
--   initdb -D /tmp/pg/data -U postgres --auth=trust
--   pg_ctl -D /tmp/pg/data -o "-p 55432" start
--   createdb -p 55432 -U postgres cisur_test
--   psql -p 55432 -U postgres -d cisur_test -f supabase/tests/harness_local.sql
--   ...luego las migraciones 0001..0006 y rls_smoke_tests.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles que Supabase trae de fábrica
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase configura estos default privileges en cada proyecto nuevo: toda
-- tabla creada en `public` queda con permisos amplios para anon y
-- authenticated, y lo único que limita el acceso es RLS.
--
-- Se replica acá a propósito, aunque sea permisivo: así el harness reproduce el
-- punto de partida real y podemos verificar que los REVOKE de 0002 realmente
-- recortan sobre esa base.
alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Esquema auth
-- ---------------------------------------------------------------------------
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- auth.uid() y auth.role() leen del JWT que el pooler inyecta como GUC.
-- Esta es la misma definición que usa Supabase.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
$$;

-- ---------------------------------------------------------------------------
-- Esquema storage
-- ---------------------------------------------------------------------------
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- Supabase otorga estos permisos sobre storage: el acceso real lo deciden las
-- policies de 0005, no los privilegios de tabla.
grant select on storage.buckets to anon, authenticated;
grant all    on storage.objects to anon, authenticated, service_role;

-- Parte el path en carpetas: 'abc/def/x.pdf' -> {abc,def}
-- (Supabase descarta el último segmento, que es el nombre del archivo.)
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  partes text[];
begin
  partes := string_to_array(name, '/');
  return partes[1:array_length(partes, 1) - 1];
end;
$$;

create or replace function storage.filename(name text)
returns text
language plpgsql
immutable
as $$
declare
  partes text[];
begin
  partes := string_to_array(name, '/');
  return partes[array_length(partes, 1)];
end;
$$;
