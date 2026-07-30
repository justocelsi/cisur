import Image from "next/image";
import { urlPublica } from "@/lib/utils";

/**
 * Portada del material.
 *
 * Si todavía no se subió una imagen, dibuja una tapa tipográfica en lugar de
 * mostrar un hueco gris. Así la landing se ve terminada desde el día uno,
 * antes de que Tati exporte la portada del Canva.
 *
 * Ojo: <Image> explota si src es null, así que el chequeo va SIEMPRE antes.
 */
export default function PortadaGuia({
  producto,
  prioridad = false,
  className = "",
}) {
  const src = urlPublica(producto?.portada_path);

  const marco =
    "relative aspect-[3/4] w-full overflow-hidden rounded-[3px] shadow-[0_18px_40px_-18px_rgba(31,42,28,0.45)] ring-1 ring-tinta/10";

  if (src) {
    return (
      <div className={`${marco} ${className}`}>
        <Image
          src={src}
          alt={`Portada de ${producto?.titulo ?? "la guía"}`}
          fill
          priority={prioridad}
          sizes="(max-width: 768px) 70vw, 380px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${marco} bg-verde ${className}`}
      role="img"
      aria-label={`Portada de ${producto?.titulo ?? "la guía"}`}
    >
      {/* Lomo, para que lea como libro y no como tarjeta. */}
      <div className="absolute inset-y-0 left-0 w-3 bg-black/15" />

      <div className="flex h-full flex-col justify-between p-7 pl-9 text-papel">
        <div>
          <p className="versalitas text-salvia">Una guía para familias</p>
          <div className="mt-6 h-px w-12 bg-salvia/60" />
        </div>

        <p className="text-[1.7rem] leading-[1.15] text-papel">
          {producto?.titulo ?? "El rol de la familia en el proceso de alfabetización"}
        </p>

        <div>
          <div className="mb-5 text-center text-[1.3rem] text-salvia/70" aria-hidden="true">
            ❧
          </div>
          <p className="text-[1.05rem] text-salvia">
            {producto?.autor ?? "Lic. Tatiana Galera"}
          </p>
          <p className="mt-1 text-[0.95rem] text-salvia/70">Psicopedagoga</p>
        </div>
      </div>
    </div>
  );
}
