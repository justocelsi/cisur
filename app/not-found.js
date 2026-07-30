import Link from "next/link";

export const metadata = {
  title: "Página no encontrada",
};

export default function NoEncontrada() {
  return (
    <div className="contenedor-angosto py-24 text-center md:py-32">
      <p aria-hidden="true" className="text-3xl text-salvia">
        ❧
      </p>
      <h1 className="mt-5 text-[2.1rem] leading-tight text-tinta">
        No encontramos esta página
      </h1>
      <p className="mt-4 leading-relaxed text-tinta-suave">
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>

      <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="rounded-[2px] bg-verde px-6 py-3 text-papel transition-colors hover:bg-verde-oscuro"
        >
          Ir al inicio
        </Link>
        <Link
          href="/"
          className="rounded-[2px] border border-papel-3 px-6 py-3 text-tinta-suave transition-colors hover:border-salvia"
        >
          Ver los materiales
        </Link>
      </div>
    </div>
  );
}
