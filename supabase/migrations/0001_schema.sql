-- ============================================================================
-- CISUR — 0001_schema.sql
-- Tablas, tipos, funciones helper y creación automática de perfiles.
-- Idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'editor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type compra_estado as enum ('pendiente', 'pagada', 'rechazada', 'cancelada', 'reembolsada');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — extiende auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  nombre     text,
  role       user_role   not null default 'user',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- productos — cada guía / cuadernillo que se vende
-- El PDF vive en el bucket privado 'guias' con la convención
-- de path  <producto_id>/<nombre>.pdf   (el primer folder es el id).
-- ---------------------------------------------------------------------------
create table if not exists productos (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  titulo        text not null,
  subtitulo     text,
  -- Etiqueta corta para el nav del one-pager: "El rol de la familia en el
  -- proceso de alfabetización" no entra en una barra de secciones.
  nombre_corto  text,
  descripcion   text,
  autor         text,
  portada_path  text,
  archivo_path  text,
  precio        numeric(10, 2) not null default 0 check (precio >= 0),
  precio_lista  numeric(10, 2) check (precio_lista is null or precio_lista >= 0),
  paginas       integer check (paginas is null or paginas > 0),
  indice        jsonb not null default '[]'::jsonb,
  -- Encabezado de la lista de arriba. En la guía es "Índice"; en el frasco,
  -- "Algunas invitaciones". Nullable: si no está, no se muestra el encabezado.
  indice_titulo text,
  destacado     boolean not null default false,
  activo        boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- compras — una fila por (alumno, producto). El acceso al PDF se deriva de acá.
-- ---------------------------------------------------------------------------
create table if not exists compras (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  producto_id     uuid not null references productos (id) on delete restrict,
  order_id        uuid not null default gen_random_uuid(),
  precio_pagado   numeric(10, 2) not null default 0,
  estado          compra_estado not null default 'pendiente',
  metodo_pago     text,
  referencia_pago text,
  pagado_en       timestamptz,
  created_at      timestamptz not null default now()
);

-- Una sola compra PAGADA por (alumno, producto). Permite varios intentos
-- 'pendiente' sin bloquear al usuario que abandonó un checkout.
create unique index if not exists compras_pagada_unica
  on compras (user_id, producto_id)
  where estado = 'pagada';

create index if not exists compras_order_id_idx on compras (order_id);
create index if not exists compras_user_id_idx  on compras (user_id);
create index if not exists compras_estado_idx   on compras (estado);

-- ---------------------------------------------------------------------------
-- talleres — vitrina, no se venden online (CTA a WhatsApp)
-- ---------------------------------------------------------------------------
create table if not exists talleres (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descripcion text,
  lugar       text,
  fecha       date,
  imagen_path text,
  visible     boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- site_settings — textos editables inline por Tati
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- editor_invitations — tokens de un solo uso para dar rol de editor.
-- Evita exponer cualquier endpoint del tipo "hacerme admin".
-- ---------------------------------------------------------------------------
create table if not exists editor_invitations (
  token      text primary key,
  role       user_role not null default 'editor',
  email      text,
  expires_at timestamptz not null,
  used_at    timestamptz,
  used_by    uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers de rol.
-- SECURITY DEFINER + search_path fijo: evita search_path hijacking y la
-- recursión infinita de consultar profiles desde una policy de profiles.
-- ---------------------------------------------------------------------------
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Rol efectivo de la conexión actual.
--   sin claims          -> 'postgres'    (conexión directa: SQL Editor, psql)
--   claims con role     -> ese role      ('anon' | 'authenticated' | 'service_role')
--   claims sin role     -> 'unknown'     (se deniega por defecto)
create or replace function public.conn_role()
returns text
language sql
stable
set search_path = public
as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null then 'postgres'
    else coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
      'unknown'
    )
  end;
$$;

-- Sólo el backend (service_role) o una conexión directa pueden hacer
-- operaciones privilegiadas.
create or replace function public.es_backend()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.conn_role() in ('service_role', 'postgres');
$$;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists productos_touch on productos;
create trigger productos_touch before update on productos
  for each row execute function public.touch_updated_at();

drop trigger if exists talleres_touch on talleres;
create trigger talleres_touch before update on talleres
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- handle_new_user — crea el profile al registrarse y consume el token de
-- invitación si viene uno válido en el metadata del signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_role  user_role := 'user';
begin
  v_token := nullif(new.raw_user_meta_data ->> 'invite_token', '');

  if v_token is not null then
    select i.role into v_role
      from editor_invitations i
     where i.token = v_token
       and i.used_at is null
       and i.expires_at > now()
     for update;

    if not found then
      v_role := 'user';
      v_token := null;
    end if;
  end if;

  -- El profile primero: editor_invitations.used_by tiene FK contra profiles.
  insert into profiles (id, email, nombre, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'nombre', ''),
    v_role
  )
  on conflict (id) do nothing;

  if v_token is not null then
    update editor_invitations
       set used_at = now(), used_by = new.id
     where token = v_token;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
