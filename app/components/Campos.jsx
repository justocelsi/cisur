"use client";

/**
 * Campos de formulario del panel.
 *
 * Existen para que las etiquetas, las ayudas y los estilos sean iguales en
 * todas las pantallas de administración. La `ayuda` no es decorativa: Tati no
 * tiene formación técnica, así que cada campo que no sea obvio explica en
 * castellano qué se espera.
 */

const CLASE_CAMPO =
  "mt-2 w-full rounded-[2px] border border-papel-3 bg-white px-4 py-2.5 font-serif text-[1.19rem] text-tinta focus:border-verde";

export function Campo({
  id,
  etiqueta,
  ayuda,
  tipo = "text",
  valor,
  alCambiar,
  requerido = false,
  ...resto
}) {
  return (
    <div>
      <label htmlFor={id} className="versalitas block text-tinta-tenue">
        {etiqueta}
        {requerido ? <span className="text-alerta"> *</span> : null}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor ?? ""}
        onChange={(e) => alCambiar(e.target.value)}
        required={requerido}
        className={CLASE_CAMPO}
        {...resto}
      />
      {ayuda ? (
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-tinta-tenue">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function CampoLargo({
  id,
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  filas = 4,
  requerido = false,
  ...resto
}) {
  return (
    <div>
      <label htmlFor={id} className="versalitas block text-tinta-tenue">
        {etiqueta}
        {requerido ? <span className="text-alerta"> *</span> : null}
      </label>
      <textarea
        id={id}
        value={valor ?? ""}
        onChange={(e) => alCambiar(e.target.value)}
        rows={filas}
        required={requerido}
        className={`${CLASE_CAMPO} leading-relaxed`}
        {...resto}
      />
      {ayuda ? (
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-tinta-tenue">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function CampoSiNo({ id, etiqueta, ayuda, valor, alCambiar }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(valor)}
          onChange={(e) => alCambiar(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#41664a]"
        />
        <span>
          <span className="text-tinta">{etiqueta}</span>
          {ayuda ? (
            <span className="mt-0.5 block text-[0.95rem] leading-relaxed text-tinta-tenue">
              {ayuda}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

export function CampoArchivo({
  id,
  etiqueta,
  ayuda,
  acepta,
  alElegir,
  nombreActual,
}) {
  return (
    <div>
      <label htmlFor={id} className="versalitas block text-tinta-tenue">
        {etiqueta}
      </label>
      <input
        id={id}
        type="file"
        accept={acepta}
        onChange={(e) => alElegir(e.target.files?.[0] ?? null)}
        className="mt-2 w-full cursor-pointer rounded-[2px] border border-dashed border-salvia bg-papel-2 px-4 py-3 text-[1.05rem] text-tinta-suave file:mr-4 file:cursor-pointer file:rounded-[2px] file:border-0 file:bg-verde file:px-4 file:py-2 file:font-serif file:text-papel"
      />
      {nombreActual ? (
        <p className="mt-1.5 text-[0.95rem] text-verde">
          Ya hay un archivo cargado: {nombreActual}
        </p>
      ) : null}
      {ayuda ? (
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-tinta-tenue">{ayuda}</p>
      ) : null}
    </div>
  );
}

export function Aviso({ tipo = "info", children }) {
  if (!children) return null;

  const estilos = {
    info: "border-salvia bg-salvia-tenue/40 text-verde",
    error: "border-alerta/30 bg-alerta/5 text-alerta",
    ok: "border-verde/30 bg-verde/5 text-verde",
  };

  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-[2px] border px-4 py-3 text-[1.05rem] ${estilos[tipo]}`}
    >
      {children}
    </p>
  );
}

export function Boton({ children, variante = "primario", ...resto }) {
  const estilos = {
    primario:
      "bg-verde text-papel hover:bg-verde-oscuro disabled:opacity-60",
    secundario:
      "border border-papel-3 text-tinta-suave hover:border-salvia disabled:opacity-60",
    peligro:
      "border border-alerta/40 text-alerta hover:bg-alerta hover:text-papel disabled:opacity-60",
  };

  return (
    <button
      type="button"
      className={`rounded-[2px] px-5 py-2.5 transition-colors ${estilos[variante]}`}
      {...resto}
    >
      {children}
    </button>
  );
}
