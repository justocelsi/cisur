import Link from "next/link";

export const metadata = {
  title: "Cambios y reembolsos",
  alternates: { canonical: "/legales/reembolsos" },
};

export default function Reembolsos() {
  return (
    <>
      <h1 className="text-[2rem] leading-tight text-tinta">
        Política de cambios y reembolsos
      </h1>
      <p className="text-[0.95rem] text-tinta-tenue">
        Última actualización: julio de 2026
      </p>

      <h2>Derecho de revocación: 10 días corridos</h2>
      <p>
        Si compraste a distancia (por este sitio), tenés{" "}
        <strong>10 días corridos</strong> desde la fecha de la compra para
        revocarla sin necesidad de dar explicaciones y sin costo alguno, conforme
        al <strong>artículo 34 de la Ley 24.240</strong> de Defensa del
        Consumidor.
      </p>
      <p>
        Para ejercerlo, entrá al{" "}
        <Link href="/legales/arrepentimiento">botón de arrepentimiento</Link> o
        escribinos por WhatsApp con el mail de tu cuenta. No hace falta que
        justifiques el motivo.
      </p>

      <h2>Cómo se devuelve el dinero</h2>
      <ul>
        <li>
          El reintegro se hace por el <strong>mismo medio de pago</strong> con el
          que compraste, a través de Mercado Pago.
        </li>
        <li>
          Iniciamos la devolución dentro de las <strong>72 horas hábiles</strong>{" "}
          de recibir tu pedido.
        </li>
        <li>
          El plazo en el que el dinero se ve acreditado depende de Mercado Pago y
          de tu banco o tarjeta. Suele ser de pocos días, pero con tarjeta de
          crédito puede aparecer en el resumen del mes siguiente.
        </li>
        <li>
          Al procesarse el reintegro, <strong>se revoca el acceso</strong> al
          material.
        </li>
      </ul>

      <h2>Si el pago quedó pendiente o falló</h2>
      <p>
        Si el pago no se acreditó, no hay nada que devolver: no se te cobró.
        Podés volver a intentar la compra cuando quieras.
      </p>
      <p>
        Si <strong>pagaste pero el material no aparece</strong> en tu cuenta
        después de una hora, no vuelvas a comprar: escribinos por WhatsApp con el
        número de operación que te mostró la página de confirmación y lo
        resolvemos sin cargo.
      </p>

      <h2>Compras duplicadas</h2>
      <p>
        El sistema no permite comprar dos veces el mismo material. Si por algún
        error se generó un cobro duplicado, avisanos y lo reintegramos completo.
      </p>

      <h2>Después de los 10 días</h2>
      <p>
        Pasado el plazo de revocación, y por tratarse de contenido digital de
        acceso inmediato, no realizamos reintegros por cambio de opinión. Si
        tuviste un problema técnico para acceder al material, escribinos: eso
        siempre lo resolvemos.
      </p>

      <h2>Talleres presenciales</h2>
      <p>
        Los talleres no se contratan por este sitio. Sus condiciones de
        cancelación se acuerdan de manera particular con cada institución.
      </p>

      <h2>Cómo contactarnos</h2>
      <p>
        WhatsApp <strong>+54 223 447-4674</strong> o Instagram{" "}
        <strong>@cisur.mdp</strong>. Contanos el mail de tu cuenta y qué
        necesitás.
      </p>
    </>
  );
}
