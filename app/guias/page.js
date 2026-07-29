import Link from "next/link";
import PortadaGuia from "../components/PortadaGuia";
import { getProductos } from "@/lib/datos";
import { formatearPrecio } from "@/lib/utils";

export const revalidate = 300;

export const metadata = {
  title: "Materiales",
  description:
    "Guías y cuadernillos de alfabetización para familias, por la Lic. Tatiana Galera.",
  alternates: { canonical: "/guias" },
};

export default async function Guias() {
  const productos = await getProductos();

  return (
    <div className="contenedor py-16 md:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="versalitas text-verde-claro">Materiales</p>
        <h1 className="mt-4 text-[2.2rem] leading-tight text-tinta sm:text-[2.7rem]">
          Guías para acompañar el aprendizaje
        </h1>
        <p className="mt-5 leading-relaxed text-tinta-suave">
          Material escrito por una psicopedagoga, pensado para leer sin
          tecnicismos y aplicar en la vida cotidiana. Se compran una vez y
          quedan en tu cuenta para siempre.
        </p>
      </header>

      {productos.length === 0 ? (
        <p className="mx-auto mt-16 max-w-md rounded-[3px] border border-arena bg-papel-2 px-6 py-8 text-center text-tinta-suave">
          Todavía no hay materiales publicados. Volvé pronto.
        </p>
      ) : (
        <ul className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => (
            <li key={producto.id}>
              <Link
                href={`/guias/${producto.slug}`}
                className="group block focus-visible:outline-none"
              >
                <div className="transition-transform duration-300 group-hover:-translate-y-1">
                  <PortadaGuia producto={producto} />
                </div>

                <h2 className="mt-6 text-[1.25rem] leading-snug text-tinta group-hover:text-verde">
                  {producto.titulo}
                </h2>

                {producto.subtitulo ? (
                  <p className="mt-1 text-sm text-tinta-tenue">
                    {producto.subtitulo}
                  </p>
                ) : null}

                {producto.descripcion ? (
                  <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-tinta-suave">
                    {producto.descripcion}
                  </p>
                ) : null}

                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-[1.3rem] text-verde">
                    {formatearPrecio(producto.precio)}
                  </span>
                  {producto.precio_lista &&
                  Number(producto.precio_lista) > Number(producto.precio) ? (
                    <span className="text-sm text-tinta-tenue line-through">
                      {formatearPrecio(producto.precio_lista)}
                    </span>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
