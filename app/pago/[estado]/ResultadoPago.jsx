"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/context/AuthProvider";

// Mercado Pago devuelve al usuario al toque, pero el webhook que confirma la
// compra puede tardar unos segundos. En vez de mostrar "pendiente" y asustar a
// alguien que acaba de pagar, reintentamos con espera creciente.
const ESPERAS_MS = [0, 1500, 2500, 4000, 5000, 7000, 10000];

export default function ResultadoPago({ estado }) {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { autenticado, cargando: cargandoAuth } = useAuth();

  const [confirmada, setConfirmada] = useState(false);
  const [agotado, setAgotado] = useState(false);
  const [reintento, setReintento] = useState(0);

  // Sólo tiene sentido sondear si estamos en la página de éxito, hay sesión y
  // sabemos qué orden mirar. `verificando` se DERIVA de eso: un estado menos
  // que sincronizar y un efecto menos que lo apague.
  const puedeVerificar =
    estado === "exito" && !cargandoAuth && autenticado && Boolean(orderId);
  const verificando = puedeVerificar && !confirmada && !agotado;

  // Un timer vivo después de desmontar el componente es el bug clásico acá.
  const desmontado = useRef(false);
  useEffect(() => {
    desmontado.current = false;
    return () => {
      desmontado.current = true;
    };
  }, []);

  const verificar = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !orderId) return false;

    const { data, error } = await supabase
      .from("compras")
      .select("estado")
      .eq("order_id", orderId)
      .limit(1);

    if (error || !data?.length) return false;
    return data[0].estado === "pagada";
  }, [orderId]);

  useEffect(() => {
    if (!puedeVerificar) return;

    let cancelado = false;
    const timers = [];

    async function correrSondeo() {
      for (let i = 0; i < ESPERAS_MS.length; i += 1) {
        if (cancelado || desmontado.current) return;

        if (ESPERAS_MS[i] > 0) {
          await new Promise((resolver) => {
            timers.push(setTimeout(resolver, ESPERAS_MS[i]));
          });
        }
        if (cancelado || desmontado.current) return;

        const ok = await verificar();
        if (cancelado || desmontado.current) return;

        if (ok) {
          setConfirmada(true);
          return;
        }
      }

      // Se agotaron los reintentos: el pago puede estar igual en camino.
      setAgotado(true);
    }

    correrSondeo();

    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
    };
  }, [puedeVerificar, verificar, reintento]);

  // ---------------------------------------------------------------- éxito
  if (estado === "exito") {
    if (verificando) {
      return (
        <Marco
          titulo="Estamos confirmando tu pago"
          icono="◌"
          texto="Esto suele tardar unos segundos. No cierres esta página."
        >
          <p className="mt-6 text-[1.05rem] text-tinta-tenue" role="status">
            Verificando con Mercado Pago…
          </p>
        </Marco>
      );
    }

    if (confirmada) {
      return (
        <Marco
          titulo="¡Listo! Ya es tuya"
          icono="❧"
          texto="El pago se confirmó y el material ya está disponible en tu cuenta."
        >
          <Link
            href="/mis-materiales"
            className="mt-8 inline-block rounded-[2px] bg-verde px-8 py-4 text-papel transition-colors hover:bg-verde-oscuro"
          >
            Ir a leerlo
          </Link>
        </Marco>
      );
    }

    if (agotado) {
      return (
        <Marco
          titulo="Tu pago está en camino"
          icono="◌"
          texto="Mercado Pago todavía no nos confirmó la operación. Suele resolverse en unos minutos y el material aparece solo en tu cuenta."
        >
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setAgotado(false);
                setReintento((n) => n + 1);
              }}
              className="rounded-[2px] bg-verde px-6 py-3 text-papel transition-colors hover:bg-verde-oscuro"
            >
              Volver a verificar
            </button>
            <Link
              href="/mis-materiales"
              className="rounded-[2px] border border-verde px-6 py-3 text-verde transition-colors hover:bg-verde hover:text-papel"
            >
              Ver mis materiales
            </Link>
          </div>
          <p className="mt-8 text-[1.05rem] text-tinta-tenue">
            Si en una hora sigue sin aparecer, escribinos por WhatsApp con este
            número de operación:{" "}
            <span className="break-all text-tinta">{orderId ?? "—"}</span>
          </p>
        </Marco>
      );
    }

    // Sin sesión o sin order: no podemos verificar, pero el pago pudo salir bien.
    return (
      <Marco
        titulo="Gracias por tu compra"
        icono="❧"
        texto="Entrá a tu cuenta para ver el material. Si acabás de pagar y todavía no aparece, esperá unos minutos."
      >
        <Link
          href="/ingresar?next=%2Fmis-materiales"
          className="mt-8 inline-block rounded-[2px] bg-verde px-8 py-4 text-papel transition-colors hover:bg-verde-oscuro"
        >
          Entrar a mi cuenta
        </Link>
      </Marco>
    );
  }

  // ------------------------------------------------------------- pendiente
  if (estado === "pendiente") {
    return (
      <Marco
        titulo="Tu pago quedó pendiente"
        icono="◌"
        texto="Algunos medios de pago (como el efectivo en Rapipago o Pago Fácil) tardan en acreditarse. Cuando Mercado Pago nos confirme, el material aparece solo en tu cuenta."
      >
        <Link
          href="/mis-materiales"
          className="mt-8 inline-block rounded-[2px] bg-verde px-8 py-4 text-papel transition-colors hover:bg-verde-oscuro"
        >
          Ver mis materiales
        </Link>
        {orderId ? (
          <p className="mt-8 text-[1.05rem] text-tinta-tenue">
            Número de operación:{" "}
            <span className="break-all text-tinta">{orderId}</span>
          </p>
        ) : null}
      </Marco>
    );
  }

  // ----------------------------------------------------------------- error
  return (
    <Marco
      titulo="El pago no se pudo completar"
      icono="✕"
      texto="No se te cobró nada. Puede haber sido un rechazo del banco, un dato mal ingresado o fondos insuficientes. Podés intentar de nuevo con otro medio de pago."
    >
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/guias"
          className="rounded-[2px] bg-verde px-6 py-3 text-papel transition-colors hover:bg-verde-oscuro"
        >
          Volver a intentar
        </Link>
        <Link
          href="/"
          className="rounded-[2px] border border-papel-3 px-6 py-3 text-tinta-suave transition-colors hover:border-salvia"
        >
          Ir al inicio
        </Link>
      </div>
    </Marco>
  );
}

function Marco({ titulo, texto, icono, children }) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <p aria-hidden="true" className="text-3xl text-salvia">
        {icono}
      </p>
      <h1 className="mt-5 text-[2.1rem] leading-tight text-tinta">{titulo}</h1>
      <p className="mt-4 leading-relaxed text-tinta-suave">{texto}</p>
      {children}
    </div>
  );
}
