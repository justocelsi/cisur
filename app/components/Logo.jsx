/**
 * Lockup de CISUR: la marca sobre la bajada, tal como está en la identidad.
 *
 * Está hecho con texto, no con una imagen. El único archivo de logo que había
 * era un recorte del avatar de Instagram (564×564 con esquinas negras y el
 * borde del círculo sucio): al escalarlo se notaba el recorte. Compuesto en
 * código queda nítido a cualquier tamaño, pesa cero y se puede recolorear.
 *
 * El logo usa la sans geométrica de la marca (`font-marca`), no la Times New
 * Roman del resto del sitio. Es lo correcto: un logo conserva su tipografía
 * propia aunque la publicación use otra.
 *
 * Si algún día aparece el archivo vectorial original, se reemplaza esto por un
 * <Image> y listo.
 */
export default function Logo({ conBajada = true, className = "" }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-marca text-[1.22rem] font-bold tracking-[0.14em] text-verde">
        CISUR
      </span>
      {conBajada ? (
        <span className="font-marca mt-[0.3rem] text-[0.6rem] font-medium uppercase tracking-[0.2em] text-verde-claro">
          Centro Integral Sur
        </span>
      ) : null}
    </span>
  );
}
