-- ============================================================================
-- CISUR — 0007_pagos_reintentos.sql
--
-- Arregla la línea que más plata podía costar del proyecto.
--
-- `confirmar_pago` sólo sabía actualizar compras en estado 'pendiente', y
-- `crear_compra` saca compras de ese estado por su cuenta. De ahí salían cuatro
-- fallas distintas, todas con el mismo final —dinero cobrado sin entregar el
-- material— y ninguna con rescate posible, porque /api/admin/reconfirm termina
-- llamando a esta misma función:
--
--   1. Rapipago. La compradora paga el cupón dos días después. Mientras tanto
--      volvió al sitio, no vio el material y apretó Comprar de nuevo, así que
--      `crear_compra` dejó su orden en 'cancelada'. Llega el approved y no
--      matchea ninguna fila.
--   2. Tarjeta rechazada y "pagar con otro medio" en la misma pantalla de MP.
--      El primer webhook deja la fila en 'rechazada'; el segundo pago, aprobado,
--      no matchea.
--   3. Doble click en Comprar mientras el webhook del primer pago está en vuelo.
--      Es una ventana de segundos, que es exactamente por lo que /pago/exito
--      sondea 30 segundos.
--   4. Reembolso o contracargo. MP notifica 'refunded', la función calcula
--      'reembolsada', pero la fila está en 'pagada' y no matchea: Tati devolvió
--      la plata y la persona conserva el material. La transición
--      pagada → reembolsada era inalcanzable.
--
-- Se corrige con un predicado asimétrico: cada estado nuevo declara desde qué
-- estados puede llegar. Sigue siendo idempotente —una fila ya 'pagada' no
-- matchea la rama 'pagada'— y un rechazo tardío nunca pisa una compra cobrada.
--
-- Idempotente y aplicable en caliente: son dos `create or replace`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- confirmar_pago — la llama el webhook con el service_role, después de
-- consultar el pago real contra la API de Mercado Pago.
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

  update compras c
     set estado          = v_estado,
         referencia_pago = p_payment_id,
         pagado_en       = case when v_estado = 'pagada' then now() else c.pagado_en end
   where c.order_id = p_order_id
     and case v_estado
           -- Mercado Pago deja reintentar sobre la misma orden, y crear_compra
           -- cancela las pendientes cuando se vuelve a apretar Comprar. Un pago
           -- aprobado tiene que ganarle a los dos casos.
           when 'pagada'      then c.estado in ('pendiente', 'rechazada', 'cancelada')
           -- Una devolución llega, por definición, sobre una compra ya cobrada.
           when 'reembolsada' then c.estado in ('pendiente', 'pagada')
           -- Un rechazo o una cancelación tardía NO pisan una compra cobrada:
           -- si el dinero entró, el acceso se queda.
           else c.estado = 'pendiente'
         end
     -- Si la persona ya tiene otro acceso pagado a este material, este cobro es
     -- un duplicado: no se toca la fila y lo levanta `npm run conciliar`.
     -- Además, tocarla violaría el índice único compras_pagada_unica.
     and (v_estado <> 'pagada' or not exists (
           select 1 from compras o
            where o.user_id = c.user_id
              and o.producto_id = c.producto_id
              and o.estado = 'pagada'
              and o.id <> c.id));

  get diagnostics v_filas = row_count;
  return v_filas;
end;
$$;

revoke all on function public.confirmar_pago(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- crear_compra — igual que en 0004, salvo el update que cancelaba pendientes.
--
-- Cancelaba TODA compra pendiente del mismo material sin mirar la antigüedad,
-- así que mataba un cupón de Rapipago emitido hace cinco minutos. Ahora sólo
-- limpia checkouts realmente abandonados: MP da 3 días para pagar un cupón en
-- efectivo, así que 24 horas es el piso seguro para dar una compra por muerta.
-- ---------------------------------------------------------------------------
create or replace function public.crear_compra(
  p_producto_id uuid,
  p_metodo_pago text default 'mercadopago'
)
returns table (compra_id uuid, order_id uuid, precio_pagado numeric(10, 2))
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
    raise exception 'Necesitás iniciar sesión';
  end if;

  if not exists (
    select 1 from productos p where p.id = p_producto_id and p.activo
  ) then
    raise exception 'Ese material no está disponible';
  end if;

  if exists (
    select 1 from compras c
     where c.user_id = v_uid
       and c.producto_id = p_producto_id
       and c.estado = 'pagada'
  ) then
    raise exception 'Ya tenés acceso a este material';
  end if;

  -- Un checkout abandonado no debe bloquear el siguiente intento. Pero una
  -- compra pendiente reciente puede ser un pago en efectivo o en revisión que
  -- todavía va a llegar: cancelarla dejaba a la compradora sin acceso después
  -- de haber pagado.
  update compras
     set estado = 'cancelada'
   where user_id = v_uid
     and producto_id = p_producto_id
     and estado = 'pendiente'
     and created_at < now() - interval '24 hours';

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
-- Borrar una cuenta desde Authentication → Users se llevaba sus compras en
-- cascada, en silencio. `prevent_compra_delete` no lo frena porque la conexión
-- de GoTrue no trae claims de JWT y `es_backend()` da true.
--
-- Contradecía la política de privacidad publicada, que promete conservar los
-- registros de compra "incluso si eliminás tu cuenta", y DEPLOY.md manda crear
-- una cuenta de prueba descartable: borrarla se llevaba una venta real.
-- ---------------------------------------------------------------------------
do $$ begin
  alter table compras drop constraint if exists compras_user_id_fkey;
  alter table compras
    add constraint compras_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete restrict;
exception when others then
  raise notice 'No se pudo ajustar compras_user_id_fkey: %', sqlerrm;
end $$;
