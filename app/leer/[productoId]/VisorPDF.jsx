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

/**
 * `url` es la única fuente de verdad y viene del padre.
 *
 * Cuando la URL firmada vence, llamamos a renovarUrl(): eso actualiza el
 * estado del padre, que nos re-renderiza con la URL nueva. Copiarla a estado
 * local acá sólo agregaría un efecto de sincronización y una fuente de
 * verdad duplicada.
 */
export default function VisorPDF({ url, titulo, soloVistaPrevia, renovarUrl }) {
  const [paginas, setPaginas] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [ancho, setAncho] = useState(680);
  const [errorCarga, setErrorCarga] = useState(null);

  const contenedorRef = useRef(null);
  const renovando = useRef(false);

  // El PDF se renderiza a un ancho fijo en píxeles, así que hay que medir el
  // contenedor y volver a medir en cada resize / rotación del celular.
  useLayoutEffect(() => {
    const nodo = contenedorRef.current;
    if (!nodo) return;

    function medir() {
      const disponible = nodo.clientWidth;
      // Tope de 820px: en un monitor grande una página a todo el ancho es
      // ilegible (líneas larguísimas).
      setAncho(Math.max(280, Math.min(disponible, 820)));
    }

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const alCargar = useCallback(({ numPages }) => {
    setPaginas(numPages);
    setErrorCarga(null);
    renovando.current = false;
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

  const irA = useCallback(
    (destino) => {
      setPagina((actual) => {
        const total = paginas ?? 1;
        return Math.min(Math.max(destino, 1), total);
      });
    },
    [paginas],
  );

  // Navegación con teclado, como en un lector de verdad.
  useEffect(() => {
    function alTeclado(evento) {
      if (evento.key === "ArrowRight" || evento.key === "PageDown") {
        irA(pagina + 1);
      }
      if (evento.key === "ArrowLeft" || evento.key === "PageUp") {
        irA(pagina - 1);
      }
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [pagina, irA]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col bg-papel-3/40">
      {/* Barra superior */}
      <div className="no-imprimir sticky top-[73px] z-30 border-b border-papel-3 bg-papel/95 backdrop-blur-sm">
        <div className="contenedor flex flex-wrap items-center justify-between gap-3 py-3">
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => irA(pagina - 1)}
              disabled={pagina <= 1}
              aria-label="Página anterior"
              className="rounded-[2px] border border-papel-3 px-3 py-1.5 text-tinta-suave disabled:opacity-40"
            >
              ‹
            </button>

            <label className="flex items-center gap-2 text-[1.05rem] text-tinta-tenue">
              <span className="sr-only">Número de página</span>
              <input
                type="number"
                min={1}
                max={paginas ?? 1}
                value={pagina}
                onChange={(e) => irA(Number(e.target.value))}
                className="w-14 rounded-[2px] border border-papel-3 bg-white px-2 py-1 text-center font-serif text-tinta"
              />
              <span>de {paginas ?? "…"}</span>
            </label>

            <button
              type="button"
              onClick={() => irA(pagina + 1)}
              disabled={paginas ? pagina >= paginas : true}
              aria-label="Página siguiente"
              className="rounded-[2px] border border-papel-3 px-3 py-1.5 text-tinta-suave disabled:opacity-40"
            >
              ›
            </button>
          </div>
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
          <Document
            file={url}
            onLoadSuccess={alCargar}
            onLoadError={alFallar}
            onSourceError={alFallar}
            options={OPCIONES_DOC}
            loading={
              <p className="py-24 text-center text-tinta-tenue">
                Cargando el material…
              </p>
            }
            error={
              <p className="py-24 text-center text-alerta">
                No pudimos mostrar este archivo.
              </p>
            }
            className="select-none"
          >
            <Page
              pageNumber={pagina}
              width={ancho}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-[0_10px_40px_-12px_rgba(31,42,28,0.35)]"
              loading={
                <div
                  style={{ width: ancho, height: ancho * 1.414 }}
                  className="animate-pulse bg-papel-2"
                />
              }
            />
          </Document>
        )}
      </div>

      {/* Navegación inferior, para no tener que volver arriba en mobile */}
      <div className="no-imprimir border-t border-papel-3 bg-papel">
        <div className="contenedor flex items-center justify-between py-4">
          <button
            type="button"
            onClick={() => irA(pagina - 1)}
            disabled={pagina <= 1}
            className="rounded-[2px] border border-papel-3 px-5 py-2.5 text-tinta-suave transition-colors hover:border-salvia disabled:opacity-40"
          >
            ‹ Anterior
          </button>

          <span className="text-[1.05rem] text-tinta-tenue">
            {pagina} / {paginas ?? "…"}
          </span>

          <button
            type="button"
            onClick={() => irA(pagina + 1)}
            disabled={paginas ? pagina >= paginas : true}
            className="rounded-[2px] border border-papel-3 px-5 py-2.5 text-tinta-suave transition-colors hover:border-salvia disabled:opacity-40"
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  );
}
