"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchAutenticado } from "@/lib/supabaseClient";
import { useAuth } from "@/app/context/AuthProvider";

// pdfjs no corre en el servidor: el visor se carga sólo en el navegador.
const VisorPDF = dynamic(() => import("./VisorPDF"), {
  ssr: false,
  loading: () => (
    <p className="py-24 text-center text-tinta-tenue">Abriendo el material…</p>
  ),
});

/**
 * La URL firmada se guarda para reusarla mientras siga viva.
 *
 * Cada llamada a createSignedUrl devuelve un token distinto, o sea una URL
 * distinta. Sin esto, el caché del navegador no acierta nunca y cada vez que
 * alguien abre su material vuelve a bajar el PDF entero — 13 MB en el caso del
 * frasco. Eso son datos móviles de quien compró, y egress del plan gratuito de
 * Supabase, que tiene techo.
 *
 * Va en sessionStorage y no en localStorage: muere al cerrar la pestaña, que
 * es más o menos la vida útil de una firma de una hora.
 */
const MARGEN_MS = 5 * 60 * 1000; // No reusar una firma a punto de vencer.

/**
 * La clave lleva el id de quien la pidió.
 *
 * Sin eso, este camino —que es el flujo por defecto, no un caso rebuscado—
 * regalaba material pago: Ana lee, toca «Salir» (el botón está en el encabezado
 * de todas las páginas, incluida ésta), el efecto la manda a
 * /ingresar?next=/leer/<id>, y quien se loguee en esa misma pantalla aterriza
 * en el lector. Con el caché puesto, el Lector mostraba el PDF sin llamar a
 * /api/leer: ni la verificación de compra ni la policy de Storage llegaban a
 * correr. Hasta 55 minutos de material que esa persona no compró.
 */
function claveCache(usuarioId, productoId) {
  return `cisur:firma:${usuarioId ?? "anon"}:${productoId}`;
}

function leerCache(usuarioId, productoId) {
  try {
    const crudo = window.sessionStorage.getItem(claveCache(usuarioId, productoId));
    if (!crudo) return null;
    const guardado = JSON.parse(crudo);
    if (!guardado?.url || !guardado?.vence) return null;
    if (guardado.vence - Date.now() < MARGEN_MS) return null;
    return guardado;
  } catch {
    return null;
  }
}

function guardarCache(usuarioId, productoId, datos) {
  try {
    const segundos = Number(datos?.expiraEn);
    if (!Number.isFinite(segundos) || segundos <= 0) return;
    window.sessionStorage.setItem(
      claveCache(usuarioId, productoId),
      JSON.stringify({ ...datos, vence: Date.now() + segundos * 1000 }),
    );
  } catch {
    // Almacenamiento bloqueado: se pierde el caché, no la lectura.
  }
}

export default function Lector({ productoId }) {
  const router = useRouter();
  const { autenticado, cargando: cargandoAuth, usuario } = useAuth();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  /**
   * `intento` es el disparador de la carga.
   *
   * Subirlo pide una URL firmada nueva. Lo usan dos cosas: el botón de
   * reintentar, y el visor cuando la firma vence (dura una hora, y alguien
   * puede dejar la pestaña abierta toda la tarde). Así el lector se recupera
   * solo en vez de quedar en un error.
   */
  const [intento, setIntento] = useState(0);
  const reintentar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  // El visor no necesita el resultado: si la renovación sale bien recibe la
  // URL nueva por props, y si falla esta pantalla lo reemplaza por el error.
  const renovarUrl = useCallback(() => {
    setIntento((n) => n + 1);
  }, []);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!autenticado) {
      router.replace(`/ingresar?next=${encodeURIComponent(`/leer/${productoId}`)}`);
      return;
    }

    let vivo = true;

    async function correr() {
      // `intento > 0` es siempre una renovación: ahí el caché es justamente lo
      // que hay que saltear.
      if (intento === 0) {
        const guardado = leerCache(usuario?.id, productoId);
        if (guardado) {
          setError(null);
          setDatos(guardado);
          setCargando(false);
          return;
        }
      }

      try {
        const respuesta = await fetchAutenticado(`/api/leer/${productoId}`);
        const cuerpo = await respuesta.json().catch(() => ({}));

        if (!vivo) return;

        if (!respuesta.ok) {
          setError({
            codigo: respuesta.status,
            mensaje: cuerpo?.error ?? "No pudimos abrir el material.",
          });
          setCargando(false);
          return;
        }

        setError(null);
        setDatos(cuerpo);
        setCargando(false);
        guardarCache(usuario?.id, productoId, cuerpo);
      } catch {
        if (!vivo) return;
        setError({
          codigo: 0,
          mensaje: "No pudimos conectarnos. Revisá tu conexión a internet.",
        });
        setCargando(false);
      }
    }

    correr();
    return () => {
      vivo = false;
    };
  }, [cargandoAuth, autenticado, usuario?.id, productoId, router, intento]);

  if (cargandoAuth || cargando) {
    return (
      <div className="contenedor py-24">
        <p className="text-center text-tinta-tenue">Cargando…</p>
      </div>
    );
  }

  if (error) {
    const sinAcceso = error.codigo === 403;
    return (
      <div className="contenedor-angosto py-20 text-center md:py-28">
        <p aria-hidden="true" className="text-3xl text-salvia">
          {sinAcceso ? "🔒" : "◌"}
        </p>
        <h1 className="mt-5 text-[2.1rem] leading-tight text-tinta">
          {sinAcceso ? "Todavía no tenés acceso" : "No pudimos abrir el material"}
        </h1>
        <p className="mt-4 leading-relaxed text-tinta-suave">{error.mensaje}</p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {sinAcceso ? (
            <Link
              href="/"
              className="rounded-[2px] bg-verde px-6 py-3 text-papel transition-colors hover:bg-verde-oscuro"
            >
              Ver los materiales
            </Link>
          ) : (
            <button
              type="button"
              onClick={reintentar}
              className="rounded-[2px] bg-verde px-6 py-3 text-papel transition-colors hover:bg-verde-oscuro"
            >
              Probar de nuevo
            </button>
          )}
          <Link
            href="/mis-materiales"
            className="rounded-[2px] border border-papel-3 px-6 py-3 text-tinta-suave transition-colors hover:border-salvia"
          >
            Mis materiales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <VisorPDF
      url={datos.url}
      titulo={datos.titulo}
      productoId={productoId}
      soloVistaPrevia={datos.soloVistaPrevia}
      renovarUrl={renovarUrl}
    />
  );
}
