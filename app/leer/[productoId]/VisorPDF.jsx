"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

/**
 * El worker se resuelve desde node_modules y lo empaqueta el bundler, en vez
 * de apuntar a un CDN. Así el lector funciona con los security headers
 * puestos y no depende de que un tercero esté arriba.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Sin capa de texto no se puede seleccionar ni copiar el contenido. Es una
// barrera básica, no criptográfica: cualquiera puede sacar una foto de la
// pantalla. Alcanza para que copiar el material sea incómodo.
const OPCIONES_DOC = { disableAutoFetch: false, disableStream: false };

// Tope de 820px para el ancho "natural": en un monitor grande una página a
// todo el ancho da líneas larguísimas, que es el error de legibilidad más
// común en la web. El zoom del lector se aplica encima de ese ancho.
const ANCHO_COMODO = 820;

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;
const ZOOM_PASO = 0.2;

/**
 * Preferencias del lector, guardadas por material.
 *
 * Se leen con un inicializador perezoso de useState, no con un efecto: el
 * componente se monta sólo en el navegador (`ssr: false`), así que
 * localStorage está disponible desde el primer render y no hace falta un
 * segundo render para sincronizar.
 */
function leerPreferencia(clave, porDefecto) {
  try {
    const crudo = window.localStorage.getItem(clave);
    if (crudo === null) return porDefecto;
    const valor = Number(crudo);
    return Number.isFinite(valor) ? valor : porDefecto;
  } catch {
    // Modo incógnito con almacenamiento bloqueado. No es un error: se lee sin
    // preferencias y listo.
    return porDefecto;
  }
}

function guardarPreferencia(clave, valor) {
  try {
    window.localStorage.setItem(clave, String(valor));
  } catch {
    // Ídem: que no se pueda recordar la página no debe romper la lectura.
  }
}

/**
 * `url` es la única fuente de verdad y viene del padre.
 *
 * Cuando la URL firmada vence, llamamos a renovarUrl(): eso actualiza el
 * estado del padre, que nos re-renderiza con la URL nueva. Copiarla a estado
 * local acá sólo agregaría un efecto de sincronización y una fuente de
 * verdad duplicada.
 */
export default function VisorPDF({
  url,
  titulo,
  productoId,
  soloVistaPrevia,
  renovarUrl,
}) {
  const clavePagina = `cisur:pagina:${productoId}`;
  const claveZoom = `cisur:zoom:${productoId}`;

  const [paginas, setPaginas] = useState(null);
  // Retomar donde se dejó. En un material de decenas de páginas, volver
  // siempre a la 1 obliga a buscar de nuevo dónde iba: es la diferencia entre
  // un lector y un visor de archivos.
  const [pagina, setPagina] = useState(() => leerPreferencia(clavePagina, 1));
  const [zoom, setZoom] = useState(() => leerPreferencia(claveZoom, 1));
  const [ancho, setAncho] = useState(680);
  const [errorCarga, setErrorCarga] = useState(null);
  // Porcentaje descargado. Los materiales pesan varios MB y por 4G la espera
  // llega a la media docena de segundos larga: sin un número que se mueva, la
  // pantalla parece colgada y la gente recarga (y vuelve a empezar de cero).
  const [progreso, setProgreso] = useState(0);

  const contenedorRef = useRef(null);
  const zonaRef = useRef(null);
  const renovando = useRef(false);
  const tactil = useRef(null);

  const anchoRender = Math.round(ancho * zoom);

  // El PDF se renderiza a un ancho fijo en píxeles, así que hay que medir el
  // contenedor y volver a medir en cada resize / rotación del celular.
  useLayoutEffect(() => {
    const nodo = contenedorRef.current;
    if (!nodo) return;

    function medir() {
      setAncho(Math.max(280, Math.min(nodo.clientWidth, ANCHO_COMODO)));
    }

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const alCargar = useCallback(
    ({ numPages }) => {
      setPaginas(numPages);
      setErrorCarga(null);
      setProgreso(100);
      renovando.current = false;
      // La página recordada puede haber quedado fuera de rango si el material
      // se reemplazó por una versión más corta.
      setPagina((actual) => Math.min(Math.max(actual, 1), numPages));
    },
    [],
  );

  // `total` puede venir en 0 si el servidor no manda Content-Length. En ese
  // caso mostramos los MB bajados en vez de un porcentaje mentiroso.
  const alProgresar = useCallback(({ loaded, total }) => {
    setProgreso(
      total > 0 ? Math.round((loaded / total) * 100) : -Math.round(loaded / 1048576),
    );
  }, []);

  /**
   * Si la URL firmada venció mientras la pestaña estaba abierta, pedimos otra
   * una sola vez antes de mostrar un error.
   */
  const alFallar = useCallback(() => {
    // Segunda falla consecutiva: ya pedimos una firma nueva y el archivo
    // siguió sin cargar, así que el problema no era el vencimiento.
    if (renovando.current) {
      setErrorCarga("No pudimos cargar el material. Recargá la página.");
      return;
    }
    renovando.current = true;
    renovarUrl();
  }, [renovarUrl]);

  // El destino se calcula acá y no dentro del updater de setPagina: React
  // puede ejecutar un updater más de una vez, así que no es lugar para
  // guardar en localStorage ni para scrollear.
  const irA = useCallback(
    (destino) => {
      // Mientras el PDF carga no se sabe cuántas páginas hay, y acotar contra
      // 1 mandaba TODA navegación a la primera —y la persistía. El botón
      // «Anterior» está habilitado durante la carga, así que un toque impaciente
      // borraba para siempre la página en la que iba.
      if (!paginas) return;
      const siguiente = Math.min(Math.max(destino, 1), paginas);
      if (!Number.isFinite(siguiente) || siguiente === pagina) return;

      setPagina(siguiente);
      guardarPreferencia(clavePagina, siguiente);
      // Al pasar de página, volver arriba: si no, quien venía leyendo el pie
      // de una página aterriza en el medio de la siguiente.
      zonaRef.current?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pagina, paginas, clavePagina],
  );

  const cambiarZoom = useCallback(
    (siguiente) => {
      const acotado = Math.min(Math.max(Number(siguiente.toFixed(2)), ZOOM_MIN), ZOOM_MAX);
      setZoom(acotado);
      guardarPreferencia(claveZoom, acotado);
    },
    [claveZoom],
  );

  // Navegación y zoom con teclado, como en un lector de verdad.
  useEffect(() => {
    function alTeclado(evento) {
      // Sin esto, escribir en el campo de página movería el cursor Y pasaría
      // de página al mismo tiempo.
      const etiqueta = evento.target?.tagName;
      if (etiqueta === "INPUT" || etiqueta === "TEXTAREA") return;
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;
      // La barra espaciadora ACTIVA el botón que tenga el foco, y en Chrome y
      // Firefox un botón queda enfocado después de un click. Sin esto, tocar
      // «Anterior» con el mouse y apretar espacio cancelaba esa activación y
      // avanzaba de página: exactamente al revés de lo pedido.
      if (evento.key === " " && evento.target?.closest?.("button, [role=button]")) {
        return;
      }

      switch (evento.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          evento.preventDefault();
          irA(pagina + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          evento.preventDefault();
          irA(pagina - 1);
          break;
        case "Home":
          irA(1);
          break;
        case "End":
          irA(paginas ?? 1);
          break;
        case "+":
        case "=":
          cambiarZoom(zoom + ZOOM_PASO);
          break;
        case "-":
          cambiarZoom(zoom - ZOOM_PASO);
          break;
        case "0":
          cambiarZoom(1);
          break;
        default:
      }
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [pagina, paginas, zoom, irA, cambiarZoom]);

  // Pasar página con el dedo. Se desactiva con zoom, donde el gesto
  // horizontal sirve para desplazarse dentro de la página ampliada.
  function alTocarInicio(evento) {
    if (zoom > 1) return;
    const t = evento.changedTouches[0];
    tactil.current = { x: t.clientX, y: t.clientY };
  }

  function alTocarFin(evento) {
    if (!tactil.current) return;
    const t = evento.changedTouches[0];
    const dx = t.clientX - tactil.current.x;
    const dy = t.clientY - tactil.current.y;
    tactil.current = null;
    // Umbral generoso y más horizontal que vertical: si no, cualquier scroll
    // con el pulgar cambiaría de página.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    irA(pagina + (dx < 0 ? 1 : -1));
  }

  // 44px de lado mínimo: es el tamaño por debajo del cual un botón deja de ser
  // cómodo de tocar con el pulgar.
  const claseBoton =
    "flex h-11 min-w-11 items-center justify-center rounded-[2px] border border-papel-3 text-tinta-suave transition-colors hover:border-salvia disabled:opacity-40";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col bg-papel-3/40">
      {/*
        El encabezado del lector NO es fijo en celular: se va con el scroll y
        devuelve su alto a la lectura. Los controles viven todos en la barra de
        abajo, al alcance del pulgar. En pantalla grande sí queda fijo, donde el
        espacio vertical sobra y tener el título siempre a la vista ayuda.
      */}
      <div className="no-imprimir border-b border-papel-3 bg-papel/95 backdrop-blur-sm sm:sticky sm:top-[73px] sm:z-30">
        <div className="contenedor flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <Link
              href="/mis-materiales"
              className="text-[1.05rem] text-tinta-tenue hover:text-verde"
            >
              ← Mis materiales
            </Link>
            <h1 className="truncate text-[1.21rem] leading-tight text-tinta">
              {titulo}
            </h1>
          </div>

          {/* En pantalla grande el salto directo a una página vive acá arriba;
              en celular sería una fila más de controles por muy poco uso. */}
          <label className="hidden shrink-0 items-center gap-2 text-[1.05rem] text-tinta-tenue sm:flex">
            <span>Ir a</span>
            <input
              type="number"
              min={1}
              max={paginas ?? 1}
              value={pagina}
              // Navegar en cada tecla, sobre un input controlado, hacía esto:
              // borrás el campo para escribir otro número → Number("") es 0 →
              // se acota a 1 → React rellena el campo con "1" → tipeás "15" y
              // queda "115" → aterrizás en la última página, y ese número queda
              // guardado. Un campo vacío es alguien escribiendo, no un destino.
              onChange={(e) => {
                if (e.target.value === "") return;
                irA(Number(e.target.value));
              }}
              className="w-16 rounded-[2px] border border-papel-3 bg-white px-2 py-1 text-center font-serif text-tinta"
            />
            <span>de {paginas ?? "…"}</span>
          </label>
        </div>

        {soloVistaPrevia ? (
          <div className="border-t border-tostado-tenue bg-tostado-tenue/40">
            <p className="contenedor py-2 text-center text-[0.95rem] text-tinta-suave">
              Vista previa de editora: estás viendo este material por tu rol, no
              por una compra.
            </p>
          </div>
        ) : null}
      </div>

      {/* Aviso que sólo se ve si alguien intenta imprimir */}
      <p className="lector-pdf-aviso hidden p-12 text-center">
        Este material está protegido por derecho de autor. La compra habilita
        únicamente la lectura personal en el sitio.
      </p>

      {/* Página */}
      <div
        ref={contenedorRef}
        className="lector-pdf contenedor flex flex-1 justify-center py-8"
        onContextMenu={(e) => e.preventDefault()}
      >
        {errorCarga ? (
          <p className="py-24 text-center text-alerta">{errorCarga}</p>
        ) : (
          <div
            ref={zonaRef}
            onTouchStart={alTocarInicio}
            onTouchEnd={alTocarFin}
            // Con zoom la página se sale del contenedor: que se pueda arrastrar
            // en horizontal en vez de recortarse.
            className={`w-full ${zoom > 1 ? "overflow-x-auto" : "flex justify-center"}`}
          >
            <Document
              file={url}
              onLoadSuccess={alCargar}
              onLoadProgress={alProgresar}
              onLoadError={alFallar}
              onSourceError={alFallar}
              options={OPCIONES_DOC}
              loading={
                <div className="mx-auto w-full max-w-sm py-24 text-center">
                  <p className="text-tinta-suave">
                    {progreso > 0
                      ? `Cargando el material… ${progreso}%`
                      : progreso < 0
                        ? `Cargando el material… ${-progreso} MB`
                        : "Cargando el material…"}
                  </p>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-papel-3">
                    <div
                      className="h-full bg-verde-claro transition-[width] duration-300"
                      style={{ width: `${progreso > 0 ? progreso : 8}%` }}
                    />
                  </div>
                  <p className="mt-4 text-[0.95rem] text-tinta-suave">
                    Son varios megas. Por datos móviles puede tardar unos
                    segundos.
                  </p>
                </div>
              }
              error={
                <p className="py-24 text-center text-alerta">
                  No pudimos mostrar este archivo.
                </p>
              }
              className={`select-none ${zoom > 1 ? "w-max" : ""}`}
            >
              <Page
                pageNumber={pagina}
                width={anchoRender}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-[0_10px_40px_-12px_rgba(31,42,28,0.35)]"
                loading={
                  <div
                    style={{ width: anchoRender, height: anchoRender * 1.414 }}
                    className="animate-pulse bg-papel-2"
                  />
                }
              />
            </Document>
          </div>
        )}
      </div>

      {/*
        La única barra de controles. Fija abajo en todas las pantallas: es la
        zona que el pulgar alcanza sin reacomodar la mano, y en escritorio no
        molesta. Pasar de página queda en los extremos, que es donde caen los
        dos pulgares; el zoom, al medio, porque se toca mucho menos.
      */}
      <div className="no-imprimir sticky bottom-0 z-30 border-t border-papel-3 bg-papel/95 backdrop-blur-sm">
        <div className="contenedor flex items-center justify-between gap-3 py-2.5">
          <button
            type="button"
            onClick={() => irA(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            className={`${claseBoton} px-5`}
          >
            <span aria-hidden="true" className="text-[1.3rem] leading-none">
              ‹
            </span>
            <span className="ml-2 hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cambiarZoom(zoom - ZOOM_PASO)}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Achicar"
              className={claseBoton}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => cambiarZoom(1)}
              title="Volver al tamaño que entra en la pantalla"
              aria-label={`Zoom ${Math.round(zoom * 100)} por ciento. Tocá para volver al tamaño de pantalla.`}
              className={`${claseBoton} min-w-[4.25rem] px-2 tabular-nums`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => cambiarZoom(zoom + ZOOM_PASO)}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Agrandar"
              className={claseBoton}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => irA(pagina + 1)}
            disabled={paginas ? pagina >= paginas : true}
            aria-label="Página siguiente"
            className={`${claseBoton} px-5`}
          >
            <span className="mr-2 hidden sm:inline">Siguiente</span>
            <span aria-hidden="true" className="text-[1.3rem] leading-none">
              ›
            </span>
          </button>
        </div>

        {/* El número de página, discreto y siempre visible. */}
        <p
          className="pb-2 text-center text-[0.95rem] tabular-nums text-tinta-suave"
          role="status"
          aria-live="polite"
        >
          Página {pagina} de {paginas ?? "…"}
        </p>
      </div>
    </div>
  );
}
