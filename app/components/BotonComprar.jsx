"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchAutenticado } from "@/lib/supabaseClient";
import { useAuth } from "@/app/context/AuthProvider";
import { mensajeDeError } from "@/lib/errores";
import { formatearPrecio } from "@/lib/utils";

/**
 * Botón de compra.
 *
 * Sin sesión, manda a /ingresar guardando a dónde volver (y que venía a
 * comprar), así el usuario no pierde la intención en el camino.
 * Con sesión, pide la preferencia a /api/checkout y redirige a Mercado Pago.
 */
export default function BotonComprar({
  producto,
  className = "",
  etiqueta = "Comprar ahora",
  mostrarPrecio = true,
}) {
  const router = useRouter();
  const { autenticado, cargando: cargandoAuth } = useAuth();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState(null);
  const [yaComprado, setYaComprado] = useState(false);

  async function comprar() {
    setError(null);

    if (!autenticado) {
      // Volvemos al bloque de compra del producto, pero NO disparamos el pago
      // solo: que después de registrarse aparezca de golpe Mercado Pago es
      // desconcertante. El usuario vuelve a apretar, ahora con sesión.
      const destino = `/#${producto.slug}`;
      router.push(`/ingresar?next=${encodeURIComponent(destino)}`);
      return;
    }

    setEnCurso(true);
    try {
      const respuesta = await fetchAutenticado("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ productoId: producto.id }),
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        // Ya lo tiene: en vez de un error, lo mandamos a leerlo.
        if (respuesta.status === 409) {
          setYaComprado(true);
          setEnCurso(false);
          return;
        }
        setError(mensajeDeError(datos?.error ?? "Error al iniciar el pago"));
        setEnCurso(false);
        return;
      }

      if (!datos?.initPoint) {
        setError("No pudimos abrir el checkout. Probá de nuevo en un momento.");
        setEnCurso(false);
        return;
      }

      // Salimos del sitio hacia Mercado Pago.
      window.location.href = datos.initPoint;
    } catch (e) {
      setError(mensajeDeError(e));
      setEnCurso(false);
    }
  }

  if (yaComprado) {
    return (
      <div className={className}>
        <a
          href="/mis-materiales"
          className="inline-flex w-full items-center justify-center rounded-[2px] border border-verde bg-papel px-8 py-4 text-verde transition-colors hover:bg-verde hover:text-papel sm:w-auto"
        >
          Ya lo tenés — ir a leerlo
        </a>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={comprar}
        disabled={enCurso || cargandoAuth}
        className="inline-flex w-full items-center justify-center gap-3 rounded-[2px] bg-verde px-8 py-4 text-[1.21rem] text-papel shadow-[0_10px_24px_-14px_rgba(65,102,74,0.85)] transition-colors hover:bg-verde-oscuro disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {enCurso ? (
          "Abriendo Mercado Pago…"
        ) : (
          <>
            <span>{etiqueta}</span>
            {mostrarPrecio ? (
              <span aria-hidden="true" className="text-papel/60">
                ·
              </span>
            ) : null}
            {mostrarPrecio ? <span>{formatearPrecio(producto.precio)}</span> : null}
          </>
        )}
      </button>

      {error ? (
        <p role="alert" className="mt-3 text-[1.05rem] text-alerta">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-[0.95rem] text-tinta-tenue">
        Pagás en Mercado Pago con tarjeta, débito o dinero en cuenta. Nosotros
        nunca vemos los datos de tu tarjeta.
      </p>
    </div>
  );
}
