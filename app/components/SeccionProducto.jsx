import PortadaGuia from "./PortadaGuia";
import BotonComprar from "./BotonComprar";
import { formatearPrecio } from "@/lib/utils";

/**
 * Una sección por producto.
 *
 * En un one-pager con dos materiales, darle a cada uno su propia sección evita
 * el problema de repetir: no hay un catálogo Y ADEMÁS un bloque de compra, es
 * la misma cosa una sola vez. El `id` sale del slug, así el nav de arriba lo
 * puede enlazar y cada material nuevo aparece solo.
 *
 * Las secciones alternan el lado de la imagen para que dos productos seguidos
 * no se lean como una lista.
 */
export default function SeccionProducto({ producto, invertido = false, fondo }) {
  const indice = Array.isArray(producto.indice) ? producto.indice : [];
  const enOferta =
    producto.precio_lista && Number(producto.precio_lista) > Number(producto.precio);

  return (
    <section
      id={producto.slug}
      className={`ancla border-b border-papel-3 py-20 md:py-28 ${
        fondo ?? "bg-papel"
      }`}
    >
      <div className="contenedor">
        <div
          className={`grid items-center gap-14 md:gap-20 lg:grid-cols-[0.8fr_1.2fr] ${
            invertido ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div className="mx-auto w-full max-w-[320px]">
            <PortadaGuia producto={producto} />
          </div>

          <div>
            {producto.subtitulo ? (
              <p className="versalitas text-verde-claro">{producto.subtitulo}</p>
            ) : null}

            <h2 className="mt-4 text-[2.1rem] leading-[1.1] text-tinta sm:text-[2.5rem]">
              {producto.titulo}
            </h2>

            {producto.descripcion ? (
              <p className="mt-6 max-w-xl leading-relaxed text-tinta-suave">
                {producto.descripcion}
              </p>
            ) : null}

            {indice.length > 0 ? (
              <div className="mt-9">
                {producto.indice_titulo ? (
                  <h3 className="versalitas text-tinta-tenue">
                    {producto.indice_titulo}
                  </h3>
                ) : null}
                <ol className="mt-5 max-w-xl space-y-3">
                  {indice.map((linea, i) => (
                    <li key={i} className="flex gap-4 border-b border-papel-3 pb-3">
                      <span
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-[1.05rem] text-salvia"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug text-tinta-suave">{linea}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="mt-10 flex flex-wrap items-baseline gap-3">
              <span className="text-[2.3rem] leading-none text-verde">
                {formatearPrecio(producto.precio)}
              </span>
              {enOferta ? (
                <span className="text-[1.3rem] text-tinta-tenue line-through">
                  {formatearPrecio(producto.precio_lista)}
                </span>
              ) : null}
              <span className="text-[1.05rem] text-tinta-tenue">pago único</span>
            </div>

            <BotonComprar producto={producto} className="mt-6" mostrarPrecio={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
