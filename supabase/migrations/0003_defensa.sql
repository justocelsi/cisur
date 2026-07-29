-- ============================================================================
-- CISUR — 0003_defensa.sql
-- Triggers de defensa en profundidad. Las policies de RLS dicen QUIÉN puede
-- escribir; estos triggers dicen QUÉ puede escribir. Corren siempre, incluso
-- dentro de funciones SECURITY DEFINER que bypassean RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Nadie se auto-promueve.
-- Un alumno tiene UPDATE sobre su propio profile (para cambiar el nombre).
-- Sin esto, podría hacer  update profiles set role='admin'  y quedarse con
-- todo, incluidos los PDF de todos los productos.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.es_backend() then
    raise exception 'El rol no se puede modificar desde el cliente';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_no_role_escalation on profiles;
create trigger profiles_no_role_escalation
  before update on profiles
  for each row execute function public.prevent_role_change();

-- ---------------------------------------------------------------------------
-- 2. El precio lo pone la base, no el cliente.
-- Al insertar una compra pisamos precio_pagado con el precio real leído de
-- productos, y forzamos estado 'pendiente'. Un cliente no puede insertar
-- {precio_pagado: 0, estado: 'pagada'} y regalarse el material.
-- ---------------------------------------------------------------------------
create or replace function public.snapshot_compra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precio numeric(10, 2);
  v_activo boolean;
begin
  select p.precio, p.activo
    into v_precio, v_activo
    from productos p
   where p.id = new.producto_id;

  if v_precio is null then
    raise exception 'El producto no existe';
  end if;

  if public.es_backend() then
    -- El backend puede sembrar datos (ej. una compra de regalo). Igual
    -- normalizamos el precio si vino nulo.
    new.precio_pagado := coalesce(new.precio_pagado, v_precio);
  else
    if not v_activo then
      raise exception 'Este material no está disponible';
    end if;
    new.precio_pagado := v_precio;
    new.estado        := 'pendiente';
    new.pagado_en     := null;
    new.referencia_pago := null;
  end if;

  return new;
end;
$$;

drop trigger if exists compras_snapshot on compras;
create trigger compras_snapshot
  before insert on compras
  for each row execute function public.snapshot_compra();

-- ---------------------------------------------------------------------------
-- 3. Sólo el webhook marca una compra como pagada.
-- Ni un editor puede regalarse acceso: 'pagada' viene únicamente del
-- service_role después de que confirmamos el pago contra la API de MP.
-- Desde el cliente lo único permitido es cancelar una compra pendiente propia.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_compra_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.es_backend() then
    return new;
  end if;

  if new.estado is distinct from old.estado
     and not (old.estado = 'pendiente' and new.estado = 'cancelada') then
    raise exception 'El estado de la compra sólo lo cambia el sistema de pagos';
  end if;

  if new.precio_pagado   is distinct from old.precio_pagado
  or new.pagado_en       is distinct from old.pagado_en
  or new.referencia_pago is distinct from old.referencia_pago
  or new.user_id         is distinct from old.user_id
  or new.producto_id     is distinct from old.producto_id then
    raise exception 'Esos campos de la compra no se pueden modificar';
  end if;

  return new;
end;
$$;

drop trigger if exists compras_no_escalation on compras;
create trigger compras_no_escalation
  before update on compras
  for each row execute function public.prevent_compra_escalation();

-- ---------------------------------------------------------------------------
-- 4. Las compras no se borran (son el comprobante de la venta).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_compra_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_backend() then
    raise exception 'Las compras no se pueden eliminar';
  end if;
  return old;
end;
$$;

drop trigger if exists compras_no_delete on compras;
create trigger compras_no_delete
  before delete on compras
  for each row execute function public.prevent_compra_delete();
