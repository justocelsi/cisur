# Probar Mercado Pago con tu propia cuenta

> Para Justo. La idea: montar el circuito completo de cobro **con tu cuenta**,
> comprobar que funciona de punta a punta, y recién entonces grabarle a Tati un
> video mostrándole exactamente dónde hacer clic. Vos vas a haber recorrido el
> camino antes que ella, así que el video no tiene titubeos.

---

## Por qué conviene hacerlo así

Explicarle a alguien sin conocimiento técnico cómo sacar credenciales de una
plataforma que vos tampoco recorriste termina en veinte mensajes de WhatsApp con
capturas borrosas.

Si primero lo hacés con tu cuenta:

- Conocés las pantallas reales, no las de la documentación (que suele estar
  desactualizada).
- Sabés cuáles son los pasos donde uno se traba.
- El video muestra el flujo real, no una reconstrucción.
- Y sobre todo: **verificás que el código funciona** antes de involucrarla.

**Aclaración importante:** cuando pases a las credenciales de Tati, la plata va a
su cuenta. Las tuyas son sólo para probar. Cambiar de una a otra es reemplazar
dos variables de entorno.

---

## Etapa 1 — Sandbox (sin plata real)

Empezá acá. Es gratis y no toca dinero.

### 1.1 Crear la aplicación

1. **https://www.mercadopago.com.ar/developers/panel** con tu cuenta.
2. **Crear aplicación**:
   - Nombre: `CISUR web (pruebas)`
   - Producto: **Pagos online**
   - ¿Plataforma de e-commerce?: **No**
   - Tipo: **Checkout Pro**

### 1.2 Credenciales de prueba

En la aplicación → **Credenciales de prueba**. Copiá el **Access Token**
(empieza con `TEST-`) a tu `.env.local`:

```
MP_ACCESS_TOKEN=TEST-...
```

> El código detecta el prefijo `TEST-` solo y usa el sandbox de Mercado Pago.
> No hay que cambiar ninguna otra cosa. Está en `app/api/checkout/route.js`.

### 1.3 El webhook en local

Acá está el punto que confunde: **el webhook no puede llegar a tu `localhost`**.
Mercado Pago necesita una dirección pública de internet.

Dos caminos:

**Opción A — desplegar primero en Vercel (recomendado).** Es lo que vas a usar
igual, y evita una herramienta más. Seguí `DEPLOY.md` paso 5 y usá
`https://cisur.vercel.app/api/webhook/mp`.

**Opción B — un túnel a tu máquina.** Si querés iterar rápido sobre el código:

```bash
npx --yes localtunnel --port 3000
```

Te da una URL pública temporal. Esa URL va en dos lugares: en el webhook de MP,
y en `NEXT_PUBLIC_SITE_URL` de tu `.env.local` (porque de ahí salen las
`back_urls` y el `notification_url` que se le mandan a MP). Cambia en cada
reinicio.

### 1.4 Configurar el webhook

En la aplicación → **Webhooks** → **Configurar notificaciones**:

- URL: `https://cisur.vercel.app/api/webhook/mp`
- Eventos: tildá sólo **Pagos**
- Guardar, y copiar la **firma secreta** que aparece después:

```
MP_WEBHOOK_SECRET=...
```

> Sin esto el webhook rechaza **todas** las notificaciones con 401. Es a
> propósito: falla cerrado. Si en los logs de Vercel ves `[webhook] firma
> inválida o ausente`, es esta variable.

### 1.5 Comprar con tarjetas de prueba

Registrate en el sitio con un mail cualquiera y comprá la guía. En el checkout
de MP usá:

| Caso | Tarjeta | Nombre | Vto / CVV | DNI |
|---|---|---|---|---|
| **Aprobada** | `5031 7557 3453 0604` | `APRO` | `11/30` / `123` | `12345678` |
| **Rechazada** | la misma | `OTHE` | `11/30` / `123` | `12345678` |
| **Pendiente** | la misma | `CONT` | `11/30` / `123` | `12345678` |

El **nombre del titular** es lo que decide el resultado. Es la parte menos obvia
del sandbox de MP.

### 1.6 Qué verificar

Marcá cada uno:

- [ ] Con `APRO` volvés a `/pago/exito` y aparece **"¡Listo! Ya es tuya"**.
      Puede tardar unos segundos: la pantalla está esperando el webhook.
- [ ] En **Panel → Ventas** la compra figura como **Pagada**.
- [ ] En **Mis materiales** aparece la guía.
- [ ] El PDF se abre en el lector.
- [ ] Con `OTHE` caés en `/pago/error` y **no** se habilita el acceso.
- [ ] Con `CONT` caés en `/pago/pendiente` y la venta queda **Pendiente**.
- [ ] Desde otra cuenta que no compró, entrar a `/leer/<id>` dice
      **"Todavía no tenés acceso"**.
- [ ] Intentar comprar dos veces el mismo material ofrece **"Ya lo tenés — ir a
      leerlo"** en vez de cobrar de nuevo.

Si alguno falla, mirá **Vercel → Logs**: los mensajes del webhook empiezan con
`[webhook]` y los del checkout con `[checkout]`.

---

## Etapa 2 — Producción con tu cuenta (plata real, poca)

Ahora sí, una compra de verdad. Es la única forma de estar seguro: el sandbox no
reproduce todo.

### 2.1 Cambiar a credenciales de producción

En la misma aplicación → **Credenciales de producción**. Access Token y Public
Key empiezan con `APP_USR-`.

Cargalas **en Vercel** (Settings → Environment Variables) y **redeployá**:
Vercel sólo aplica variables nuevas en el deploy siguiente.

Configurá también el webhook de **producción** con su propia firma secreta (es
distinta de la de prueba).

### 2.2 Bajar el precio un rato

Para no gastar $25.000 en una prueba, entrá a **Panel → Materiales → Editar** y
poné el precio en **100**. Después lo volvés a subir.

> Esto también prueba algo importante: que el precio que se cobra sale de la
> base y no del navegador. Fijate que MP te cobre $100 y no $25.000.

### 2.3 Comprar de verdad

Con tu tarjeta, tu teléfono, como una compradora cualquiera. Recorré todo:
registro, compra, pago, lectura.

### 2.4 Qué verificar además

- [ ] La plata aparece en **tu** app de Mercado Pago, con la comisión
      descontada. Anotá **cuánto fue la comisión**: es el dato que a Tati más le
      va a importar.
- [ ] El mail del comprador que ves en Panel → Ventas es el correcto.
- [ ] Probá el **botón de arrepentimiento**: devolvé los $100 desde la app de MP
      y verificá que podés dar de baja el acceso.

### 2.5 Volver a dejar todo como estaba

- [ ] Precio de vuelta en **25000**.
- [ ] Compras de prueba: dejalas. Son parte del historial y borrarlas está
      bloqueado a propósito. Cuando pongas las credenciales de Tati, sus ventas
      arrancan de cero igual, porque son cuentas distintas.

---

## Etapa 3 — Pasar a las credenciales de Tati

Cuando ella te pase las suyas, en Vercel:

1. Reemplazá `MP_ACCESS_TOKEN` y `NEXT_PUBLIC_MP_PUBLIC_KEY` por las de ella.
2. Reemplazá `MP_WEBHOOK_SECRET` por la firma del webhook **de ella**.
3. **Redeploy.**
4. Una última compra de prueba —de $100, con tu tarjeta— para confirmar que la
   plata cae en **la cuenta de ella**. Que te la devuelva y listo.

Ese último paso no lo saltees. Es el único que prueba que el dinero va a donde
tiene que ir.

---

## Guión para el video de Tati

Grabá la pantalla con la voz encima. **Con tu cuenta**, no con la de ella. Que
sea corto y que se vea el mouse.

**Duración objetivo: 6-8 minutos.**

### Antes de grabar

- Cerrá todo lo que no sea el navegador.
- Usá una ventana nueva y limpia (sin tus marcadores a la vista).
- Zoom del navegador al 125%: se lee mucho mejor en el celular.
- Tené a mano el documento `PARA-TATI-mercadopago.md` para seguir el orden.

### El guión

**(0:00) Para qué es esto — 30 segundos**

> "Tati, hola. Esto es para conectar tu Mercado Pago con la web, así cuando
> alguien compra la guía la plata te entra directo a vos. Son unos veinte
> minutos. Te lo muestro con mi cuenta, la tuya se ve exactamente igual."

Decí de entrada las dos cosas que más la van a tranquilizar:
> "Dos cosas antes de empezar. Uno: la plata va a tu cuenta, yo no la toco en
> ningún momento. Dos: lo que me vas a pasar sirve para cobrar en tu nombre,
> no para sacar plata de tu cuenta, y lo podés anular cuando quieras."

**(0:30) Verificar identidad — 1 minuto**

Mostrá dónde está en la app del celular. Explicá el porqué:
> "Sin esto Mercado Pago retiene el dinero de las ventas. Es un requisito de
> ellos, no de la web."

**(1:30) Elegir el plazo de cobro — 1 minuto**

Mostrá la pantalla de Costos.
> "Acá elegís: cobrar al toque con más comisión, o esperar unos días con menos.
> Esto no cambia nada de la web, la persona recibe la guía igual al instante.
> Sólo cambia cuándo te entra la plata a vos."

Si ya hiciste la Etapa 2, decile el número real:
> "Para que tengas una idea, en la prueba que hice la comisión fue de tanto."

**(2:30) Crear la aplicación — 2 minutos**

Pantalla por pantalla, sin apurarte. Nombre `CISUR web`, "Pagos online", "No"
a la plataforma de e-commerce, "Checkout Pro".

**(4:30) Las credenciales — 1 minuto**

Mostrá dónde están las de prueba y las de producción, y **cuál es la diferencia**:
> "Las de prueba empiezan con TEST y sirven para que yo pruebe sin mover plata.
> Las de producción empiezan con APP_USR y son las de verdad. Primero mandame
> las de prueba."

Mostrá el botoncito de copiar y el ojito para revelar el Access Token.

**(5:30) El webhook — 1 minuto**

> "Este paso hacelo recién cuando yo te avise, porque necesito que la web ya
> esté publicada. Es lo que hace que la web se entere de que alguien pagó. Sin
> esto, la persona paga y no recibe la guía."

Mostrá dónde se pega la URL, cuál evento tildar (**sólo Pagos**), y de dónde se
copia la firma secreta después de guardar.

**(6:30) Cómo mandármelas — 30 segundos**

> "Mandámelas por WhatsApp y cuando te confirme que las copié, borrá el mensaje
> para todos. O si querés, pwpush.com y me pasás el link."

**(7:00) Cierre**

> "Si alguna pantalla no te aparece igual, mandame una captura y te digo. No se
> puede romper nada de tu cuenta desde acá."

### Después de grabar

Mandale el video **junto con** `PARA-TATI-mercadopago.md`. El video se mira una
vez; el documento se consulta cuando se traba.

---

## Chequeo de seguridad, para vos

- [ ] Las credenciales de Tati **nunca** en el repo, ni en un mail, ni en un
      Google Doc. Sólo en `.env.local` (que está en `.gitignore`) y en Vercel.
- [ ] Cuando reemplaces tus credenciales por las de ella, **borrá las tuyas** de
      Vercel: no dejes las dos.
- [ ] Si alguna vez se filtra un Access Token, se anula desde el panel de
      desarrolladores y se genera otro. No hay que rehacer nada más.
- [ ] La aplicación `CISUR web (pruebas)` de tu cuenta la podés eliminar cuando
      termines.
