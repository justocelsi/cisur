"use client";

import { useEffect, useMemo, useState } from "react";
import { Aviso, Boton } from "@/app/components/Campos";
import { getSupabase } from "@/lib/supabaseClient";
import { mensajeDeError } from "@/lib/errores";
import { formatearFechaHora, formatearPrecio } from "@/lib/utils";

const ETIQUETAS = {
  pagada: { texto: "Pagada", clase: "text-verde" },
  pendiente: { texto: "Pendiente", clase: "text-alerta" },
  rechazada: { texto: "Rechazada", clase: "text-tinta-tenue" },
  cancelada: { texto: "Cancelada", clase: "text-tinta-tenue" },
  reembolsada: { texto: "Reembolsada", clase: "text-tinta-tenue" },
};

export default function PanelVentas() {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [soloPagadas, setSoloPagadas] = useState(false);

  const [recarga, setRecarga] = useState(0);

  // El spinner se prende acá, en el handler del botón, y la lectura la hace
  // el efecto al ver que cambió `recarga`.
  function refrescar() {
    setCargando(true);
    setRecarga((n) => n + 1);
  }

  useEffect(() => {
    let vivo = true;

    async function correr() {
      const supabase = getSupabase();

      const { data, error: err } = supabase
        ? await supabase.rpc("ventas")
        : { data: null, error: new Error("sin configurar") };

      if (!vivo) return;
      if (err) setError(mensajeDeError(err));
      setVentas(data ?? []);
      setCargando(false);
    }

    correr();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  const resumen = useMemo(() => {
    const pagadas = ventas.filter((v) => v.estado === "pagada");
    const total = pagadas.reduce((acc, v) => acc + Number(v.precio_pagado), 0);

    const ahora = new Date();
    const desdeMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const delMes = pagadas.filter(
      (v) => v.pagado_en && new Date(v.pagado_en) >= desdeMes,
    );
    const totalMes = delMes.reduce((acc, v) => acc + Number(v.precio_pagado), 0);

    return {
      cantidad: pagadas.length,
      total,
      cantidadMes: delMes.length,
      totalMes,
      pendientes: ventas.filter((v) => v.estado === "pendiente").length,
    };
  }, [ventas]);

  const visibles = soloPagadas
    ? ventas.filter((v) => v.estado === "pagada")
    : ventas;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[1.4rem] text-tinta">Ventas</h2>
        <div className="flex flex-wrap gap-3">
          <Boton
            variante="secundario"
            onClick={() => setSoloPagadas((v) => !v)}
          >
            {soloPagadas ? "Ver todas" : "Ver sólo las pagadas"}
          </Boton>
          <Boton variante="secundario" onClick={refrescar} disabled={cargando}>
            {cargando ? "Actualizando…" : "Actualizar"}
          </Boton>
        </div>
      </div>

      <Aviso tipo="error">{error}</Aviso>

      {/* Resumen */}
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          titulo="Vendido en total"
          valor={formatearPrecio(resumen.total)}
          nota={`${resumen.cantidad} ${resumen.cantidad === 1 ? "venta" : "ventas"}`}
        />
        <Tarjeta
          titulo="Este mes"
          valor={formatearPrecio(resumen.totalMes)}
          nota={`${resumen.cantidadMes} ${resumen.cantidadMes === 1 ? "venta" : "ventas"}`}
        />
        <Tarjeta
          titulo="Pendientes"
          valor={String(resumen.pendientes)}
          nota="checkouts sin confirmar"
        />
        <Tarjeta
          titulo="Compradores"
          valor={String(
            new Set(
              ventas.filter((v) => v.estado === "pagada").map((v) => v.email),
            ).size,
          )}
          nota="personas distintas"
        />
      </dl>

      <p className="mt-6 text-[0.85rem] leading-relaxed text-tinta-tenue">
        Los importes son los que se cobraron en el sitio, antes de la comisión de
        Mercado Pago. Lo que efectivamente entra a tu cuenta lo ves en Mercado
        Pago. Las «pendientes» son personas que empezaron a pagar y no
        terminaron: es normal que haya algunas y no hay que hacer nada con ellas.
      </p>

      {/* Listado */}
      {cargando ? (
        <p className="mt-10 text-tinta-tenue">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-10 rounded-[2px] border border-tostado-tenue bg-papel-2 px-5 py-4 text-tinta-suave">
          Todavía no hay ventas registradas.
        </p>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="mt-10 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-[0.95rem]">
              <thead>
                <tr className="border-b border-papel-3">
                  <th scope="col" className="py-3 pr-4 versalitas text-tinta-tenue">
                    Cuándo
                  </th>
                  <th scope="col" className="py-3 pr-4 versalitas text-tinta-tenue">
                    Quién
                  </th>
                  <th scope="col" className="py-3 pr-4 versalitas text-tinta-tenue">
                    Material
                  </th>
                  <th scope="col" className="py-3 pr-4 versalitas text-tinta-tenue">
                    Importe
                  </th>
                  <th scope="col" className="py-3 versalitas text-tinta-tenue">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((v) => {
                  const etiqueta = ETIQUETAS[v.estado] ?? {
                    texto: v.estado,
                    clase: "text-tinta-tenue",
                  };
                  return (
                    <tr key={v.compra_id} className="border-b border-papel-2">
                      <td className="py-3 pr-4 text-tinta-tenue">
                        {formatearFechaHora(v.pagado_en ?? v.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="block text-tinta">
                          {v.comprador || "—"}
                        </span>
                        <span className="block text-[0.85rem] text-tinta-tenue">
                          {v.email}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-tinta-suave">{v.producto}</td>
                      <td className="py-3 pr-4 text-tinta">
                        {formatearPrecio(v.precio_pagado)}
                      </td>
                      <td className={`py-3 ${etiqueta.clase}`}>
                        {etiqueta.texto}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: tarjetas, porque una tabla de 5 columnas no entra */}
          <ul className="mt-10 space-y-3 md:hidden">
            {visibles.map((v) => {
              const etiqueta = ETIQUETAS[v.estado] ?? {
                texto: v.estado,
                clase: "text-tinta-tenue",
              };
              return (
                <li
                  key={v.compra_id}
                  className="rounded-[3px] border border-papel-3 bg-papel-2 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-tinta">{v.comprador || v.email}</span>
                    <span className={`shrink-0 text-[0.95rem] ${etiqueta.clase}`}>
                      {etiqueta.texto}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.85rem] text-tinta-tenue">{v.email}</p>
                  <p className="mt-2 text-[0.95rem] text-tinta-suave">{v.producto}</p>
                  <p className="mt-2 flex items-baseline justify-between gap-3">
                    <span className="text-tinta">
                      {formatearPrecio(v.precio_pagado)}
                    </span>
                    <span className="text-[0.85rem] text-tinta-tenue">
                      {formatearFechaHora(v.pagado_en ?? v.created_at)}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Tarjeta({ titulo, valor, nota }) {
  return (
    <div className="rounded-[3px] border border-papel-3 bg-papel-2 p-5">
      <dt className="versalitas text-tinta-tenue">{titulo}</dt>
      <dd className="mt-2 text-[1.6rem] leading-none text-verde">{valor}</dd>
      <dd className="mt-2 text-[0.85rem] text-tinta-tenue">{nota}</dd>
    </div>
  );
}
