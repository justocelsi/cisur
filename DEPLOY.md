# Puesta en producción — pasos manuales

> Todo lo que hay que hacer a mano, en orden. Nada de esto se puede automatizar
> porque involucra crear cuentas y aceptar términos.
>
> **Tiempo estimado:** 1 h 30 min de tu parte + lo que tarde Tati en mandarte
> las credenciales de Mercado Pago.
>
> Las cosas que dependen de Tati están marcadas con **[TATI]**. Para esas dos,
> mandale los archivos que están al final de este documento.

---

## Resumen de lo que vas a crear

| Servicio | Para qué | Plan | Costo |
|---|---|---|---|
| Supabase | base de datos, cuentas, archivos | Free | $0 |
| Vercel | alojamiento + cron | Hobby | $0 |
| Mercado Pago | cobros | — | comisión por venta |

El único costo del proyecto es la comisión de Mercado Pago, que se descuenta de
cada venta y la paga Tati.

---

## Paso 0 — Verificar que el proyecto corre local

```bash
cd ~/code/cisur
npm install
npm run lint && npm test && npm run build
```

Las tres cosas tienen que pasar. Si ya lo hiciste, seguí.

El `.env.local` ya está creado con `CRON_SECRET` y `ADMIN_SECRET` generados.
Faltan las claves de Supabase (paso 1) y de Mercado Pago (paso 4).

---

## Paso 1 — Crear el proyecto en Supabase

1. Entrá a **https://supabase.com** y creá una cuenta (podés usar tu GitHub).
2. **New project**:
   - **Name:** `cisur`
   - **Database Password:** generá una fuerte y **guardala en tu gestor de
     contraseñas**. No la vas a necesitar para el sitio, pero sin ella no podés
     recuperar la base si algo se rompe.
   - **Region:** `South America (São Paulo)` — es la más cercana a Mar del
     Plata; cualquier otra agrega latencia en cada consulta.
   - **Plan:** Free.
3. Esperá 2-3 minutos a que termine de provisionar.

### 1.1 Copiar las claves

En **Settings → API Keys** vas a ver tres cosas. Copiá cada una a
`.env.local`:

| En Supabase | En `.env.local` |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_…`) — hay que revelarla | `SUPABASE_SECRET_KEY` |

> ⚠️ La **secret key** bypassea toda la seguridad de la base. No la pegues en
> WhatsApp, ni en un Google Doc, ni en el código. Sólo en `.env.local` (que está
> en `.gitignore`) y en Vercel.

---

## Paso 2 — Crear el esquema de la base

En Supabase, andá a **SQL Editor** y corré los archivos de
`supabase/migrations/` **en orden numérico, de a uno**. Para cada uno: abrí el
archivo, copiá todo el contenido, pegalo en el editor, **Run**.

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `0001_schema.sql` | tablas, tipos, creación automática de perfiles |
| 2 | `0002_rls.sql` | Row Level Security: quién puede leer/escribir qué |
| 3 | `0003_defensa.sql` | triggers anti-fraude (precio, roles, estados) |
| 4 | `0004_compras_rpc.sql` | el flujo de compra y confirmación de pago |
| 5 | `0005_storage.sql` | los dos buckets y quién accede a los PDF |
| 6 | `0006_seed.sql` | textos iniciales del sitio y el primer producto |

Cada uno tiene que decir **Success**. Son idempotentes: si dudás si corriste
uno, corrélo de nuevo, no rompe nada.

> **Si `0005_storage.sql` da error de permisos** sobre `storage.objects`: creá
> los dos buckets a mano en **Storage → New bucket** (`publico` con "Public
> bucket" tildado, `guias` sin tildar) y volvé a correr el archivo.

### 2.1 Verificar que la seguridad quedó bien puesta

Este paso **no lo saltees**. Es lo que separa "funciona" de "funciona y nadie te
roba el material".

Son dos pasos, y el primero se hace una sola vez en la vida del proyecto:

**a)** Pegá `supabase/tests/instalar_smoke_tests.sql` y **Run**. Tiene que
responder `Instalado.`

**b)** Pegá `supabase/tests/rls_smoke_tests.sql` (es una sola línea) y **Run**.
La última fila del resultado tiene que decir:

```
TODO OK — 58 pruebas pasaron
```

Si dice `¡ATENCIÓN! N de 58 pruebas FALLARON`, la columna `detalle` de cada fila
explica qué pasó. No sigas: avisame.

La suite prepara sus datos, prueba y limpia **dentro de la misma llamada**, así
que no deja nada en la base y la podés correr las veces que quieras.

> **Por qué está partido en dos.** La primera versión era un script de muchas
> sentencias y falló tres veces seguidas en el SQL Editor, siempre por lo mismo:
> ahí no se puede dar por sentado que una sentencia vea lo que creó la anterior,
> ni que un `ROLLBACK` al final deshaga algo. Metida en una función, correrla es
> una sola sentencia y deja de depender de eso.
>
> Para correr todo localmente antes de tocar producción:
>
> ```bash
> export PATH=/usr/lib/postgresql/18/bin:$PATH
> rm -rf /tmp/pgcisur && initdb -D /tmp/pgcisur -U postgres --auth=trust
> pg_ctl -D /tmp/pgcisur -o "-p 55432" -l /tmp/pgcisur/log start
> createdb -p 55432 -U postgres cisur_test
> P="psql -p 55432 -U postgres -d cisur_test -q"
> $P -f supabase/tests/harness_local.sql
> for f in supabase/migrations/0*.sql; do $P -f "$f"; done
> $P -f supabase/tests/instalar_smoke_tests.sql
> $P -c "select * from public.cisur_smoke_tests();"
> ```

### 2.2 Desactivar la confirmación por mail

En **Authentication → Sign In / Providers → Email**, **destildá** "Confirm
email". Después, **Save**.

**Por qué:** el plan free de Supabase manda como máximo 2 mails por hora. Con la
confirmación activada, la tercera persona que se registre en una hora no puede
entrar y no hay nada que puedas hacer. Como el pago es la barrera real (nadie
accede al material sin comprar), pedir confirmación de mail no agrega seguridad
y sí agrega una forma silenciosa de perder ventas.

> Consecuencia a tener en cuenta: el **reset de contraseña** sí manda mail, y
> sigue limitado a 2 por hora. Con el volumen esperado no es un problema, pero
> si algún día lo es, la solución es conectar un SMTP propio (Resend tiene 3.000
> mails gratis por mes) — eso requiere un dominio propio.

---

## Paso 3 — Subir el proyecto a GitHub

El repositorio `justocelsi/cisur` ya existe y está vacío. Ojo con esto: tu `gh`
CLI está logueado como **Justocel**, que es otra cuenta, así que hay que ir por
SSH con la key de `justocelsi`.

```bash
cd ~/code/cisur
git remote add origin git@github.com-justocelsi-user:justocelsi/cisur.git
git push -u origin main
```

El alias `github.com-justocelsi-user` ya está configurado en tu `~/.ssh/config`
y apunta a `id_ed25519_justocelsi_user`. Verificalo con:

```bash
ssh -T git@github.com-justocelsi-user   # tiene que responder "Hi justocelsi!"
```

> `contexto/` (≈1 GB de videos) y `HANDOFF-plataforma-cursos.md` están en
> `.gitignore`: no se suben. GitHub rechaza archivos de más de 100 MB y ahí hay
> uno de 82 MB.

---

## Paso 4 — Mercado Pago **[TATI]**

Acá necesitás dos datos de la cuenta de Tati. **Tienen que ser de su cuenta, no
de la tuya**: son las credenciales que definen a qué cuenta bancaria entra el
dinero de cada venta.

1. Mandale el archivo **`PARA-TATI-mercadopago.md`**. Está escrito para alguien
   sin conocimiento técnico, con cada pantalla descrita.
2. Ella te tiene que pasar dos cosas:
   - **Access Token** de producción (empieza con `APP_USR-`)
   - **Clave secreta del webhook** (la genera ella en la misma pantalla)
3. Pedile que te las mande **por un medio que después pueda borrar** (un mensaje
   de WhatsApp que se elimine, o mejor: que las pegue en un
   https://pwpush.com que expire en 1 día). No por mail.

Cargalas en `.env.local`:

```
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...   (opcional hoy, pedísela igual)
```

### 4.1 Probar primero con credenciales de prueba

Antes de tocar plata real, Tati te puede pasar las credenciales de **prueba**
(el Access Token empieza con `TEST-`). El código detecta el prefijo solo y usa
el sandbox de Mercado Pago, donde podés simular pagos aprobados y rechazados sin
mover un peso.

---

## Paso 5 — Deploy en Vercel

1. Entrá a **https://vercel.com**, creá cuenta **con GitHub** (la cuenta
   `justocelsi`, para que vea el repo).
2. **Add New → Project → Import** `justocelsi/cisur`.
3. Framework: detecta Next.js solo. **No cambies nada** del build.
4. Antes de darle Deploy, abrí **Environment Variables** y cargá **las nueve**:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
MP_ACCESS_TOKEN
NEXT_PUBLIC_MP_PUBLIC_KEY
MP_WEBHOOK_SECRET
CRON_SECRET
ADMIN_SECRET
NEXT_PUBLIC_SITE_URL
```

Los valores son los mismos de `.env.local`, **excepto**:

```
NEXT_PUBLIC_SITE_URL=https://cisur.vercel.app
```

> Esa variable maneja el SEO, el sitemap y —lo más importante— las URLs de
> retorno y de notificación que se le mandan a Mercado Pago. Si queda en
> `localhost`, después de pagar la gente cae en el vacío y el webhook nunca
> llega.

5. **Deploy**. Tarda 2-3 minutos.
6. En **Settings → Domains**, confirmá que el dominio sea `cisur.vercel.app`. Si
   Vercel te asignó otro (`cisur-abc123.vercel.app`), o cambiás el dominio a
   `cisur` o corregís `NEXT_PUBLIC_SITE_URL` para que coincida **exactamente**.
   Después de cambiarla hay que **redeployar** (Deployments → … → Redeploy).

### 5.1 Verificar el cron

En **Settings → Cron Jobs** tiene que aparecer `/api/cron/keep-alive` una vez
por día a las 12:00 UTC. Viene de `vercel.json`, no hay que configurarlo.

**Para qué sirve:** el plan free de Supabase pausa el proyecto después de 7 días
sin actividad. Sin este ping, si en una semana no compra nadie, el sitio amanece
caído. Es la pieza que hace que el proyecto no necesite mantenimiento.

---

## Paso 6 — Configurar el webhook de Mercado Pago **[TATI]**

Recién ahora, con el sitio en línea, se puede configurar el webhook (antes no
existía la URL).

En el instructivo de Tati está el paso a paso. La URL que tiene que pegar es:

```
https://cisur.vercel.app/api/webhook/mp
```

Y el evento a tildar es **"Pagos"** (`payment`).

> Este es el único camino por el que una compra pasa a "pagada". Si el webhook
> está mal configurado, la gente paga y **no recibe el material**. Es el punto
> más importante de todo el deploy.

---

## Paso 7 — Darle a Tati el rol de editora

Tati primero se tiene que crear la cuenta como cualquier persona:

1. Entra a `https://cisur.vercel.app/ingresar`
2. "No tengo cuenta, quiero crear una"
3. Se registra con **el mail que va a usar siempre** para administrar el sitio.

Después, en Supabase → **SQL Editor**, corré esto reemplazando el mail:

```sql
update profiles
   set role = 'editor'
 where email = 'EL-MAIL-DE-TATI@ejemplo.com';
```

Tiene que decir `Success. 1 row affected`. Si dice 0 rows, el mail está mal
escrito o todavía no se registró.

Que cierre sesión y vuelva a entrar. Ahora le aparecen **"Editar la página"** y
**"Panel"** en el menú.

### ¿Por qué a mano y no con un link de invitación?

Existe la tabla `editor_invitations` y el sistema la soporta, pero para una sola
persona una línea de SQL es más simple y menos frágil que explicarle un flujo de
token. Si algún día hay que agregar a alguien más:

```sql
insert into editor_invitations (token, role, expires_at)
values ('un-token-largo-y-aleatorio', 'editor', now() + interval '7 days');
```

Y esa persona se registra en
`https://cisur.vercel.app/ingresar?invite=un-token-largo-y-aleatorio`.

### Si en algún momento necesitás rol de admin para vos

```sql
update profiles set role = 'admin' where email = 'jcelsi@itba.edu.ar';
```

`admin` es superconjunto de `editor`. Hoy la única diferencia es que sólo un
admin puede administrar invitaciones.

---

## Paso 8 — Cargar el material real **[TATI]**

El producto ya está creado por el seed, pero **sin el PDF y sin portada**, así
que está en borrador.

Necesitás de Tati:

1. **El PDF de la guía.** Está en Canva
   (`https://canva.link/9m5ayvwlsx8muys`). Tiene que exportarlo:
   *Compartir → Descargar → PDF estándar*.
2. **La portada**, como imagen aparte (PNG o JPG, vertical). Puede exportar sólo
   la primera página del Canva como PNG.
3. **Una foto suya** para la página "Sobre mí" (hoy muestra un ornamento).
4. **El precio final.** Está en $25.000; ella lo cambia desde el
   panel cuando quiera.

El **logo ya está puesto**, pero compuesto en código: el único archivo que había
era un recorte del avatar de Instagram y se notaba el mal recorte al escalarlo.
De ese archivo saqué el verde de marca (`#41664a`), que ahora manda en toda la
paleta. **Si le podés pedir el logo vectorial** (`.svg` o `.ai`, se lo puede dar
quien le diseñó la identidad), se reemplaza `Logo.jsx` por un `<Image>` y queda
el original. No es urgente: hoy se ve bien.

Del tostado de las piezas de Instagram no tengo el archivo, así que **el camel
(`#c9a77f`) lo estimé a ojo de la captura**. Si te pasa el código exacto, se
cambia una línea en `app/globals.css`.

Ella misma puede subir el PDF y la portada desde **Panel → Materiales →
Editar**. El instructivo `PARA-TATI-editar-la-web.md` lo explica.

Si preferís hacerlo vos la primera vez: entrás con tu cuenta de admin al panel y
es el mismo formulario.

> Para la foto de "Sobre mí" hay un paso extra: subila desde **Panel →
> Materiales** a cualquier producto (queda en el bucket público) o directo en
> Supabase → Storage → `publico` → carpeta `retratos`, y después en la web, en
> modo edición, no hay campo para eso todavía: hay que cargar el valor en
> Supabase → Table Editor → `site_settings`, clave `sobre_foto_path`, con el
> path relativo (por ejemplo `retratos/tati.jpg`).

**Recién cuando el PDF esté cargado**, tildá "Publicado" en el panel. El panel
te avisa en rojo si un material está publicado sin PDF.

---

## Paso 9 — Probar la compra de punta a punta

No des el sitio por terminado sin hacer esto.

**Con credenciales de prueba** (Access Token `TEST-`):

1. Creá una cuenta con un mail que no sea el de Tati ni el tuyo de admin
   (un usuario común, para probar lo que ve una compradora real).
2. Comprá la guía. Usá una
   [tarjeta de prueba de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards):
   - **Aprobada:** Mastercard `5031 7557 3453 0604`, venc. `11/30`, CVV `123`,
     nombre `APRO`, DNI `12345678`
   - **Rechazada:** el mismo número con nombre `OTHE`
3. Verificá, en orden:
   - Vuelve a `/pago/exito` y aparece "¡Listo! Ya es tuya" (puede tardar unos
     segundos: está esperando el webhook).
   - En **Panel → Ventas** figura la compra como **Pagada**.
   - En **Mis materiales** aparece la guía.
   - Se puede **leer el PDF** en el lector.
   - Probá el pago **rechazado**: tiene que caer en `/pago/error` y **no** dar
     acceso.
4. Probá que la protección funciona: con una cuenta que **no** compró, entrá a
   `/leer/<id-del-producto>`. Tiene que decir "Todavía no tenés acceso".

**Después pasá a producción:** cambiá `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` a
los de producción en Vercel, redeployá, y hacé **una compra real de verdad** con
tu propia tarjeta. Es la única forma de estar seguro. Después Tati te devuelve la
plata, o usá el botón de arrepentimiento para probar también ese flujo.

---

## Si algo sale mal

### Alguien pagó y no le llegó el material

Pasa si el webhook falló o el deploy estaba caído en ese momento.

1. Buscá el número de operación (la persona lo tiene de la pantalla de
   confirmación, o está en **Panel → Ventas** como compra "Pendiente").
2. Corré esto desde tu terminal:

```bash
curl -X POST https://cisur.vercel.app/api/admin/reconfirm \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: EL-ADMIN-SECRET" \
  -d '{"orderId":"EL-NUMERO-DE-OPERACION"}'
```

El endpoint le pregunta a Mercado Pago cuál es el estado real del pago y, si
está aprobado, habilita el acceso. No confía en lo que le mandes.

### El sitio dice que no está configurado

Falta alguna variable de entorno en Vercel, o se cargó pero no se redeployó.
Vercel sólo aplica variables nuevas en el deploy siguiente.

### Supabase pausó el proyecto

No debería, por el keep-alive. Si pasó, revisá en Vercel → Cron Jobs si el cron
viene fallando. Se despausa a mano desde el dashboard de Supabase.

### Ver los errores del servidor

Vercel → tu proyecto → **Logs**. Los mensajes del webhook empiezan con
`[webhook]`, los del checkout con `[checkout]`.

---

## Lo que queda sin resolver (a conciencia)

Cosas que decidimos no hacer y por qué. Ninguna bloquea el lanzamiento.

- **Mails transaccionales.** No se manda un mail de "gracias por tu compra". El
  acceso queda en la cuenta y la pantalla de éxito lo dice, pero un mail daría
  más confianza. Requiere un dominio propio para configurar Resend.
- **Dominio propio.** Va en `cisur.vercel.app`. Migrar a `cisur.com.ar` es
  cambiar `NEXT_PUBLIC_SITE_URL` y apuntar el DNS: 5 minutos. Cuesta ~$4.000/año
  en NIC.ar y además destrabaría los mails del punto anterior.
- **Los legales los escribí yo, no un abogado.** Cubren lo que la ley argentina
  exige para venta de bienes digitales (Ley 24.240, botón de arrepentimiento de
  la Res. 424/2020, Ley 25.326 de datos personales), pero si el proyecto crece
  conviene que los revise alguien del rubro.
- **Sin analítica.** No hay Google Analytics ni píxel de Facebook. Si Tati va a
  hacer publicidad paga, va a querer el píxel de Meta para medir conversiones —
  eso sí requiere agregarlo y actualizar la política de privacidad.
- **El material se puede fotografiar.** El lector no permite descargar, imprimir
  ni seleccionar texto, y las URLs vencen en una hora. Nada de eso impide una
  captura de pantalla; ninguna plataforma del mundo lo impide.
- **Vulnerabilidades de npm.** `npm audit` reporta 12 "high" en dependencias de
  desarrollo (ESLint, PostCSS, Sharp). Son de build-time, no afectan el sitio en
  producción, y el "arreglo" que propone npm es bajar Next.js a la versión 9.
  Dejarlas es lo correcto.

---

## Archivos para mandarle a Tati

| Archivo | Cuándo | Para qué |
|---|---|---|
| `PARA-TATI-mercadopago.md` | antes del paso 4 | conseguir las credenciales de cobro |
| `PARA-TATI-editar-la-web.md` | después del paso 7 | que pueda editar sola |

Los dos están escritos para alguien sin conocimiento técnico. Conviene mandarlos
como PDF o pegarlos en un Google Doc, no como archivo `.md`.
