-- ============================================================================
-- CISUR — 0004_compras_rpc.sql
-- Stored procedures del flujo de pago. Toda función PL/pgSQL corre en una
-- transacción implícita: si algo falla, rollback total. Sin estados a medias.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- tiene_acceso — ¿el usuario actual compró este producto?
-- La usan la policy de Storage (0005) y el lector.
-- ---------------------------------------------------------------------------
create or replace function public.tiene_acceso(p_producto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from compras c
     where c.user_id = auth.uid()
       and c.producto_id = p_producto_id
       and c.estado = 'pagada'
  );
$$;

-- ---------------------------------------------------------------------------
-- crear_compra — arranca un checkout.
--
-- Usa auth.uid() del JWT, nunca un user_id por parámetro: es imposible
-- comprar en nombre de otro. Devuelve el order_id que después viaja como
-- external_reference a Mercado Pago y vuelve en el webhook.
-- ---------------------------------------------------------------------------
create or replace function public.crear_compra(
  p_producto_id uuid,
  p_metodo_pago text default 'mercadopago'
)
returns table (
  compra_id     uuid,
  order_id      uuid,
  precio_pagado numeric(10, 2)
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_order uuid := gen_random_uuid();
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Tenés que iniciar sesión para comprar';
  end if;

  if exists (
    select 1 from compras c
     where c.user_id = v_uid
       and c.producto_id = p_producto_id
       and c.estado = 'pagada'
  ) then
    raise exception 'Ya tenés acceso a este material';
  end if;

  -- Un checkout abandonado no debe bloquear el siguiente intento.
  update compras
     set estado = 'cancelada'
   where user_id = v_uid
     and producto_id = p_producto_id
     and estado = 'pendiente';

  -- precio_pagado y estado los fija el trigger compras_snapshot (0003).
  insert into compras (user_id, producto_id, order_id, metodo_pago)
  values (v_uid, p_producto_id, v_order, p_metodo_pago)
  returning id into v_id;

  return query
    select c.id, c.order_id, c.precio_pagado
      from compras c
     where c.id = v_id;
end;
$$;

revoke all on function public.crear_compra(uuid, text) from public, anon;
grant execute on function public.crear_compra(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- confirmar_pago — la llama el webhook con el service_role, después de
-- consultar el pago real contra la API de Mercado Pago.
--
-- Idempotente: sólo toca compras que siguen en 'pendiente'. Mercado Pago
-- reenvía la misma notificación varias veces y eso tiene que ser inocuo.
-- Los estados intermedios (pending / in_process) no mueven nada.
-- ---------------------------------------------------------------------------
create or replace function public.confirmar_pago(
  p_order_id   uuid,
  p_payment_id text,
  p_status     text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado compra_estado;
  v_filas  integer;
begin
  v_estado := case p_status
    when 'approved'     then 'pagada'::compra_estado
    when 'rejected'     then 'rechazada'::compra_estado
    when 'cancelled'    then 'cancelada'::compra_estado
    when 'refunded'     then 'reembolsada'::compra_estado
    when 'charged_back' then 'reembolsada'::compra_estado
    else null
  end;

  -- pending / in_process / authorized: el pago sigue en curso, no tocamos nada.
  if v_estado is null then
    return 0;
  end if;

  update compras
     set estado          = v_estado,
         referencia_pago = p_payment_id,
         pagado_en       = case when v_estado = 'pagada' then now() else pagado_en end
   where order_id = p_order_id
     and estado = 'pendiente';

  get diagnostics v_filas = row_count;
  return v_filas;
end;
$$;

revoke all on function public.confirmar_pago(uuid, text, text) from public, anon, authenticated;
grant execute on function public.confirmar_pago(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- mis_compras — el detalle que necesita "Mis materiales", en una sola query.
-- ---------------------------------------------------------------------------
create or replace function public.mis_compras()
returns table (
  compra_id     uuid,
  producto_id   uuid,
  slug          text,
  titulo        text,
  subtitulo     text,
  portada_path  text,
  paginas       integer,
  precio_pagado numeric(10, 2),
  pagado_en     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, p.id, p.slug, p.titulo, p.subtitulo, p.portada_path,
         p.paginas, c.precio_pagado, c.pagado_en
    from compras c
    join productos p on p.id = c.producto_id
   where c.user_id = auth.uid()
     and c.estado = 'pagada'
   order by c.pagado_en desc nulls last;
$$;

revoke all on function public.mis_compras() from public, anon;
grant execute on function public.mis_compras() to authenticated;

-- ---------------------------------------------------------------------------
-- ventas — el panel de Tati. Sólo editores; devuelve vacío para el resto.
-- ---------------------------------------------------------------------------
create or replace function public.ventas()
returns table (
  compra_id       uuid,
  comprador       text,
  email           text,
  producto        text,
  precio_pagado   numeric(10, 2),
  estado          compra_estado,
  metodo_pago     text,
  referencia_pago text,
  pagado_en       timestamptz,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, pr.nombre, pr.email, p.titulo, c.precio_pagado, c.estado,
         c.metodo_pago, c.referencia_pago, c.pagado_en, c.created_at
    from compras c
    join productos p on p.id = c.producto_id
    join profiles pr on pr.id = c.user_id
   where public.is_editor()
   order by c.created_at desc;
$$;

revoke all on function public.ventas() from public, anon;
grant execute on function public.ventas() to authenticated;
