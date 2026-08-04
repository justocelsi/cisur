# CISUR

Sitio de **CISUR — Centro Integral Sur** (Mar del Plata): venta de materiales
digitales de alfabetización para familias, con lector protegido, y vitrina de
talleres presenciales.

Autora del contenido: **Lic. Tatiana Galera**, psicopedagoga (Mat. Prov. 205281).

- **Producción:** https://cisur.vercel.app
- **Puesta en producción:** [`DEPLOY.md`](DEPLOY.md)
- **Instructivos para la clienta:** [`docs/tati-mercadopago.pdf`](docs/tati-mercadopago.pdf) · [`docs/tati-editar-la-web.pdf`](docs/tati-editar-la-web.pdf)
- **Onboarding de desarrollo:** [`PARA-MORA-aprender.md`](PARA-MORA-aprender.md)
- **Probar los cobros:** [`PRUEBA-MERCADOPAGO.md`](PRUEBA-MERCADOPAGO.md)

---

## La idea en una línea

> Alguien compra un material → obtiene acceso de lectura a un PDF que sólo él
> puede abrir, servido con URLs firmadas de vida corta.

Todo lo demás (auth, roles, pagos, edición de contenido) existe para sostener esa
frase.

---

## Stack

| Capa | Herramienta | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR/SSG y backend en un solo deploy |
| UI | React 19 + Tailwind CSS 4 | — |
| Tipografía | Times New Roman | pedido de diseño; y no descarga ni un byte de fuente |
| Identidad | logo compuesto en código; verde `#41664a` muestreado del isotipo | la paleta sale de la marca, no al revés |
| Base, auth, storage | Supabase (Postgres + RLS) | seguridad en la base, no sólo en el código |
| Pagos | Mercado Pago Checkout Pro | nunca tocamos datos de tarjeta |
| Lector | react-pdf + pdfjs | render embebido, sin descarga |
| Deploy + cron | Vercel Hobby | gratis, deploy desde `main` |
| Tests | Vitest | utilidades puras + firma del webhook |

Todo JavaScript, sin TypeScript.

**Costo de operación: $0.** El único gasto del proyecto es la comisión de Mercado
Pago por venta, que paga la clienta.

---

## Arranque local

```bash
npm install
cp .env.example .env.local     # y completar (ver DEPLOY.md paso 1)
npm run dev
```

```bash
npm run lint     # ESLint (incluye las reglas del compilador de React)
npm test         # Vitest
npm run build    # tiene que pasar sin credenciales reales
```

El build **no requiere** Supabase ni Mercado Pago configurados: las páginas
públicas caen en textos por defecto. Es a propósito, así CI puede buildear sin
secretos.

---

## Modelo de datos

| Tabla | Rol |
|---|---|
| `profiles` | extiende `auth.users` con `role` (`user` / `editor` / `admin`) |
| `productos` | lo que se vende: precio, portada, PDF, índice |
| `compras` | quién compró qué, en qué estado, a qué precio |
| `talleres` | vitrina, no se venden online |
| `site_settings` | textos editables inline por la clienta |
| `editor_invitations` | tokens de un solo uso para dar rol de editor |

**Convención de path de los PDF:** `guias/<producto_id>/material.pdf`. El primer
folder es el id del producto, y de ahí la policy de Storage deriva el permiso
consultando `compras`. **No cambiar esa convención sin actualizar `0005_storage.sql`.**

---

## Seguridad — dónde vive

La *publishable key* de Supabase viaja en el bundle del navegador. El diseño
asume que un atacante la tiene, y deja que Postgres lo detenga.

**RLS** (`0002_rls.sql`) define quién lee y escribe qué. Las tablas sensibles no
tienen policy de INSERT/UPDATE: toda escritura pasa por funciones
`SECURITY DEFINER`.

**Triggers de defensa** (`0003_defensa.sql`) definen *qué* se puede escribir, y
corren incluso dentro de las funciones que bypassean RLS:

1. `prevent_role_change` — nadie se auto-promueve a admin.
2. `snapshot_compra` — el precio lo pone la base leyendo `productos`, nunca el
   cliente. Imposible pagar $1 por algo de $25.000.
3. `prevent_compra_escalation` — sólo el `service_role` (el webhook) mueve una
   compra a `pagada`. Ni un editor puede regalarse acceso.

**El webhook de Mercado Pago** valida firma HMAC-SHA256 y **falla cerrado**: sin
header válido devuelve 401. Nunca cree el body: consulta el pago a la API de MP
con el `payment_id`. Y `confirmar_pago` es idempotente, porque MP reenvía la misma
notificación varias veces.

### Verificar que todo eso funciona

```sql
-- una sola vez
\i supabase/tests/instalar_smoke_tests.sql
-- cada vez
select * from public.cisur_smoke_tests();
```

58 pruebas sobre anon, comprador, tercero, editora, el flujo de pago, el webhook,
Storage y las invitaciones. La suite prepara, prueba y limpia dentro de la misma
llamada: no deja nada en la base.

Está metida en una función a propósito. El SQL Editor de Supabase no garantiza
que una sentencia vea lo que creó la anterior, ni que un `ROLLBACK` al final
deshaga algo — tres versiones anteriores fallaron por eso. Una sola sentencia
elimina la clase entera de problema.

Para correrlo localmente antes de tocar producción está
`supabase/tests/harness_local.sql`, que emula sobre un Postgres pelado los roles
de Supabase, los esquemas `auth` y `storage`, sus default privileges permisivos
y el trigger `protect_delete` que bloquea el borrado directo de objetos. Cuanto
más fiel es el harness, menos sorpresas quedan para el SQL Editor.

**Correlo cada vez que toques una policy, un grant o un trigger.**

---

## Flujo de compra

```
Cliente → POST /api/checkout (Bearer JWT)
   └─ RPC crear_compra()  →  compra 'pendiente', precio snapshoteado por trigger
   └─ MP: crea preference con external_reference = order_id
   └─ devuelve init_point
Cliente → paga en el dominio de Mercado Pago
MP → POST /api/webhook/mp   (server-to-server)
   └─ 1. valida firma HMAC          → 401 si falla
   └─ 2. consulta el pago a la API de MP  (no cree el body)
   └─ 3. RPC confirmar_pago()       → 'pagada' (idempotente)
MP → redirige a /pago/exito, que sondea con espera creciente
     (cubre el retraso del webhook sin asustar a quien acaba de pagar)
```

---

## Estructura

```
app/
├── page.js                     TODO el sitio público: una sola página
├── leer/[productoId]/          lector protegido (dynamic, ssr:false)
├── mis-materiales/             lo que compró el usuario
├── panel/                      admin: materiales, talleres, ventas
├── pago/[estado]/              exito | pendiente | error
├── legales/                    términos, privacidad, reembolsos, arrepentimiento
├── api/
│   ├── checkout/               crea compra + preference de MP
│   ├── webhook/mp/             confirma el pago  (runtime nodejs)
│   ├── leer/[productoId]/      firma la URL del PDF (TTL 1 h)
│   ├── cron/keep-alive/        evita que Supabase free se pause
│   └── admin/reconfirm/        rescate manual de un pago
├── components/
└── context/                    AuthProvider, TextosProvider, ModoEdicionProvider
lib/                            supabase, mercadopago, utils, errores (+ tests)
public/                         assets versionados (portadas, fotos)
supabase/migrations/            0001…0006, idempotentes, en orden
supabase/tests/                 harness local + 55 pruebas de seguridad
```

---

## Decisiones que conviene conocer antes de tocar el código

**Sin carrito.** Los materiales son compra individual: el botón va directo a
Mercado Pago. Eso eliminó `cart_items` y la mitad de la complejidad
transaccional. Si algún día se venden combos, hay que reintroducirlo.

**Es un one-pager, y las secciones salen de los datos.** Todo el sitio público
vive en `app/page.js`; el nav del encabezado se arma con un ítem por producto
publicado (`nombre_corto`) más Talleres y Sobre mí. Un material nuevo aparece
como sección Y en el nav sin tocar código. No hay páginas de catálogo ni de
detalle: eran el mismo contenido dos veces. Las URLs viejas (`/guias`,
`/talleres`, `/sobre-mi`) redirigen al ancla correspondiente.

**Las imágenes tienen dos orígenes.** `urlPublica()` devuelve la ruta tal cual si
empieza con `/` (un archivo de `public/`, versionado) y si no la resuelve contra
Supabase Storage. Así una portada puede venir con el repo y ser reemplazada
después desde el panel, sin tocar código.

**Las páginas públicas son estáticas** (`revalidate = 300`). La landing carga sin
esperar a la base y no gasta egress de Supabase en cada visita. Consecuencia: un
cambio de texto tarda hasta 5 minutos en verse para el público (la editora lo ve
al instante, porque el guardado es optimista).

**Sin dark mode.** La estética es de libro impreso y el crema es parte de la
identidad. `color-scheme: light` a propósito.

**El logo es texto, no una imagen.** El único asset que había era un recorte del
avatar de Instagram (esquinas negras, borde del círculo sucio) que se notaba al
escalar. `Logo.jsx` lo compone con la sans de marca (`font-marca`) y el favicon
es un SVG de 1 KB. Si aparece el vectorial original, se reemplaza por un
`<Image>`.

**El tostado es superficie, no acción.** La paleta de marca es verde + tostado +
crema. Los botones son siempre verdes; el tostado va en fondos (el bloque del
frasco, la tarjeta de compra). El rojo (`alerta`) existe sólo para errores y
acciones destructivas: no es un color de marca.

**Sin CSP estricta.** El lector de PDF necesita `blob:` y `worker-src`, y una CSP
mal calibrada lo rompe en silencio — el peor error posible en un sitio que nadie
va a mantener. Están los demás headers en `next.config.mjs`.

**La confirmación de mail está desactivada** en Supabase. El plan free manda 2
mails por hora; con la confirmación activada, la tercera persona que se registra
en una hora no puede entrar. El pago es la barrera real. Ver `DEPLOY.md` §2.2.

**El keep-alive no es opcional.** Supabase free pausa el proyecto tras 7 días sin
actividad. Si se borra el cron de `vercel.json`, una semana sin ventas tira el
sitio abajo.

**`prosa` no sirve aplicada sobre un `<ul>`.** Estiliza las listas que están
adentro suyo (`.prosa ul > li`). Para una lista suelta hay que usar las
utilidades `lista` / `lista-numerada`.

---

## Cumplimiento legal (Argentina)

- **Botón de arrepentimiento** en `/legales/arrepentimiento`, linkeado desde el
  footer de todas las páginas — obligatorio por Res. 424/2020.
- Derecho de revocación a 10 días (art. 34, Ley 24.240) en la política de
  reembolsos.
- Política de privacidad con las menciones que exige la Ley 25.326.

Los redactó quien escribió este código, no un abogado. Si el proyecto crece,
conviene que los revise alguien del rubro.

---

## Contexto

`contexto/` (material de trabajo de la clienta, ≈1 GB de video) y el handoff
técnico original están en `.gitignore`: no forman parte del repositorio.
