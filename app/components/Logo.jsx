import Image from "next/image";

/**
 * Identidad de CISUR: el isotipo real (la marca) + la bajada en Times New Roman
 * (la voz del sitio).
 *
 * El isotipo original es un cuadrado con el círculo verde inscripto y las
 * esquinas negras; `rounded-full` con `object-cover` recorta justo el círculo,
 * así que se usa el archivo tal como vino, sin editarlo.
 */
export default function Logo({ conBajada = true, tamano = 40, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/logo-cisur.jpg"
        alt="CISUR"
        width={tamano}
        height={tamano}
        priority
        className="shrink-0 rounded-full object-cover"
        style={{ width: tamano, height: tamano }}
      />

      {conBajada ? (
        <span className="flex flex-col leading-none">
          <span className="text-[0.95rem] tracking-[0.22em] text-verde">
            CISUR
          </span>
          <span className="mt-1 text-[0.58rem] uppercase tracking-[0.16em] text-tinta-tenue">
            Centro Integral Sur
          </span>
        </span>
      ) : null}
    </span>
  );
}
