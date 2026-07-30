export const metadata = {
  title: "Política de privacidad",
  alternates: { canonical: "/legales/privacidad" },
};

export default function Privacidad() {
  return (
    <>
      <h1 className="text-[2rem] leading-tight text-tinta">
        Política de privacidad
      </h1>
      <p className="text-[0.95rem] text-tinta-tenue">
        Última actualización: julio de 2026
      </p>

      <h2>Responsable</h2>
      <p>
        Tatiana Galera (CISUR — Centro Integral Sur), Mar del Plata, provincia de
        Buenos Aires, Argentina. Contacto: WhatsApp{" "}
        <strong>+54 223 447-4674</strong>.
      </p>

      <h2>Qué datos recolectamos</h2>
      <p>Solamente lo necesario para que puedas comprar y leer el material:</p>
      <ul>
        <li>
          <strong>Mail:</strong> es tu usuario y el medio por el que podemos
          contactarte si hay un problema con una compra.
        </li>
        <li>
          <strong>Nombre</strong> (opcional): para dirigirnos a vos por tu
          nombre.
        </li>
        <li>
          <strong>Contraseña:</strong> nunca la vemos. La guarda nuestro
          proveedor de autenticación en forma cifrada (hash).
        </li>
        <li>
          <strong>Historial de compras:</strong> qué material compraste, cuándo,
          a qué precio y la referencia del pago. Es el comprobante de la
          operación y lo que habilita tu acceso.
        </li>
      </ul>

      <h2>Qué NO recolectamos</h2>
      <ul>
        <li>
          <strong>Datos de tarjetas.</strong> El pago ocurre íntegramente en el
          entorno de Mercado Pago. Nunca vemos el número de tu tarjeta, su
          vencimiento ni su código de seguridad.
        </li>
        <li>
          No usamos cookies de publicidad ni píxeles de seguimiento de terceros.
        </li>
        <li>No vendemos, alquilamos ni cedemos tus datos a terceros.</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Habilitar tu acceso al material que compraste.</li>
        <li>Recuperar tu contraseña si la olvidás.</li>
        <li>Contactarte si surge un problema con una compra.</li>
        <li>Cumplir con obligaciones legales, contables e impositivas.</li>
      </ul>
      <p>
        No te vamos a mandar publicidad sin que lo pidas expresamente.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Con los proveedores técnicos indispensables para que el sitio funcione,
        cada uno con sus propias políticas de privacidad:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — base de datos, autenticación y
          almacenamiento del material.
        </li>
        <li>
          <strong>Vercel</strong> — alojamiento del sitio.
        </li>
        <li>
          <strong>Mercado Pago</strong> — procesamiento de los pagos.
        </li>
      </ul>
      <p>
        Algunos de estos proveedores pueden alojar datos fuera de la Argentina.
        Al usar el sitio, aceptás esa transferencia internacional.
      </p>

      <h2>Cookies y almacenamiento local</h2>
      <p>
        Usamos almacenamiento local del navegador únicamente para mantener tu
        sesión abierta y que no tengas que ingresar la contraseña en cada visita.
        No es publicidad ni analítica: es lo que hace que el login funcione.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Los datos de tu cuenta, mientras la cuenta exista. Los registros de
        compra se conservan por el plazo que exigen las normas contables e
        impositivas, incluso si eliminás tu cuenta.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Conforme a la <strong>Ley 25.326 de Protección de Datos Personales</strong>,
        tenés derecho a acceder, rectificar, actualizar y suprimir tus datos.
        Escribinos por WhatsApp y lo resolvemos.
      </p>
      <p>
        La <strong>Agencia de Acceso a la Información Pública</strong>, en su
        carácter de órgano de control de la Ley 25.326, tiene la atribución de
        atender las denuncias y reclamos que interpongan quienes resulten
        afectados en sus derechos por incumplimiento de las normas vigentes en
        materia de protección de datos personales.
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el
        derecho de acceso a los mismos en forma gratuita a intervalos no
        inferiores a seis meses, salvo que se acredite un interés legítimo al
        efecto (art. 14, inc. 3 de la Ley 25.326).
      </p>

      <h2>Menores de edad</h2>
      <p>
        Este sitio está dirigido a personas adultas (familias y equipos
        educativos). No creamos cuentas para menores de edad ni recolectamos
        datos de los niños de quienes compran el material.
      </p>
    </>
  );
}
