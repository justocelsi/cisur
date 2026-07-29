"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthProvider";
import { useModoEdicion } from "@/app/context/ModoEdicionProvider";
import PanelProductos from "./PanelProductos";
import PanelTalleres from "./PanelTalleres";
import PanelVentas from "./PanelVentas";

const SOLAPAS = [
  { id: "materiales", texto: "Materiales" },
  { id: "talleres", texto: "Talleres" },
  { id: "ventas", texto: "Ventas" },
];

export default function Panel() {
  const router = useRouter();
  const { esEditor, cargando, autenticado } = useAuth();
  const { editando, alternar } = useModoEdicion();
  const [solapa, setSolapa] = useState("materiales");

  useEffect(() => {
    if (cargando) return;
    if (!autenticado) {
      router.replace("/ingresar?next=%2Fpanel");
      return;
    }
    if (!esEditor) router.replace("/");
  }, [cargando, autenticado, esEditor, router]);

  if (cargando || !esEditor) {
    return (
      <div className="contenedor py-24">
        <p className="text-center text-tinta-tenue">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="contenedor py-12 md:py-16">
      <header className="border-b border-papel-3 pb-8">
        <p className="versalitas text-verde-claro">Administración</p>
        <h1 className="mt-4 text-[2.2rem] leading-tight text-tinta sm:text-[2.6rem]">
          Panel
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-tinta-suave">
          Desde acá cargás los materiales que vendés, los talleres que se
          muestran en la web y ves las ventas. Para cambiar los{" "}
          <strong>textos de las páginas</strong>, usá el modo edición y hacé
          click sobre el texto que quieras cambiar.
        </p>

        <button
          type="button"
          onClick={alternar}
          className={`mt-6 rounded-[2px] border px-5 py-2.5 transition-colors ${
            editando
              ? "border-verde bg-verde text-papel"
              : "border-verde text-verde hover:bg-verde hover:text-papel"
          }`}
        >
          {editando
            ? "Modo edición activado — andá a cualquier página"
            : "Activar modo edición de textos"}
        </button>
      </header>

      <nav
        aria-label="Secciones del panel"
        className="mt-10 flex flex-wrap gap-2 border-b border-papel-3"
      >
        {SOLAPAS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSolapa(s.id)}
            aria-current={solapa === s.id ? "page" : undefined}
            className={`-mb-px border-b-2 px-5 py-3 transition-colors ${
              solapa === s.id
                ? "border-verde text-verde"
                : "border-transparent text-tinta-tenue hover:text-tinta"
            }`}
          >
            {s.texto}
          </button>
        ))}
      </nav>

      <div className="mt-10">
        {solapa === "materiales" ? <PanelProductos /> : null}
        {solapa === "talleres" ? <PanelTalleres /> : null}
        {solapa === "ventas" ? <PanelVentas /> : null}
      </div>
    </div>
  );
}
