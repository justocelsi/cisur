"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PortadaGuia from "@/app/components/PortadaGuia";
import { getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/context/AuthProvider";
import { formatearFecha } from "@/lib/utils";

export default function MisMateriales() {
  const router = useRouter();
  const { autenticado, cargando: cargandoAuth, profile } = useAuth();

  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!autenticado) {
      router.replace("/ingresar?next=%2Fmis-materiales");
      return;
    }

    let vivo = true;

    async function correr() {
      const supabase = getSupabase();

      const { data, error: err } = supabase
        ? await supabase.rpc("mis_compras")
        : { data: null, error: new Error("sin configurar") };

      if (!vivo) return;

      if (err) {
        setError("No pudimos cargar tus materiales. Recargá la página.");
      } else {
        setCompras(data ?? []);
      }
      setCargando(false);
    }

    correr();
    return () => {
      vivo = false;
    };
  }, [cargandoAuth, autenticado, router]);

  if (cargandoAuth || cargando) {
    return <p className="text-center text-tinta-tenue">Cargando…</p>;
  }

  return (
    <>
      <header className="border-b border-papel-3 pb-8">
        <p className="versalitas text-verde-claro">Tu cuenta</p>
        <h1 className="mt-4 text-[2.3rem] leading-tight text-tinta sm:text-[2.7rem]">
          Mis materiales
        </h1>
        {profile?.nombre || profile?.email ? (
          <p className="mt-3 text-tinta-tenue">
            {profile.nombre ? `Hola, ${profile.nombre}. ` : ""}
            {profile.email}
          </p>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-10 rounded-[2px] border border-alerta/30 bg-alerta/5 px-5 py-4 text-alerta"
        >
          {error}
        </p>
      ) : null}

      {!error && compras.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md rounded-[3px] border border-tostado-tenue bg-papel-2 px-8 py-10 text-center">
          <p aria-hidden="true" className="text-2xl text-salvia">
            ❧
          </p>
          <p className="mt-5 text-tinta-suave">
            Todavía no tenés materiales. Cuando compres alguno, va a aparecer
            acá para leer cuando quieras.
          </p>
          <Link
            href="/guias"
            className="mt-7 inline-block rounded-[2px] bg-verde px-6 py-3 text-papel transition-colors hover:bg-verde-oscuro"
          >
            Ver los materiales
          </Link>
        </div>
      ) : null}

      {compras.length > 0 ? (
        <ul className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {compras.map((compra) => (
            <li key={compra.compra_id}>
              <Link href={`/leer/${compra.producto_id}`} className="group block">
                <div className="transition-transform duration-300 group-hover:-translate-y-1">
                  <PortadaGuia
                    producto={{
                      titulo: compra.titulo,
                      portada_path: compra.portada_path,
                    }}
                  />
                </div>
                <h2 className="mt-6 text-[1.38rem] leading-snug text-tinta group-hover:text-verde">
                  {compra.titulo}
                </h2>
                {compra.pagado_en ? (
                  <p className="mt-2 text-[1.05rem] text-tinta-tenue">
                    Comprado el {formatearFecha(compra.pagado_en)}
                  </p>
                ) : null}
                <p className="mt-3 text-verde underline decoration-salvia decoration-1 underline-offset-4">
                  Leer ahora
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
