# Tati: cómo conectar Mercado Pago a la web

Hola Tati. Para que la web pueda cobrar y **que la plata caiga directo en tu
cuenta de Mercado Pago**, necesito que me pases dos códigos.

Suena técnico, pero son cinco pantallas. Te las describo una por una.

**Tiempo:** unos 20 minutos.

---

## Antes de empezar: dos aclaraciones

**1. La plata es tuya y va directo a tu cuenta.** Yo no toco el dinero en ningún
momento. Cuando alguien compra la guía, Mercado Pago le cobra y te acredita a
vos, igual que cuando cobrás con un link de pago o con el QR. La web sólo le
avisa a Mercado Pago cuánto tiene que cobrar.

**2. Los códigos que me vas a pasar sirven para cobrar en tu nombre, no para
sacar plata de tu cuenta.** Aun así, tratalos como una contraseña: no los pegues
en un grupo de WhatsApp ni se los mandes a nadie más. Si en algún momento
querés, se pueden anular y generar de nuevo en dos clics.

---

## Parte 1 — Que tu cuenta pueda recibir cobros

Me dijiste que tenés Mercado Pago pero que nunca cobraste con ella. Antes que
nada hay que habilitar eso.

### 1.1 Verificá tu identidad

1. Abrí la **app de Mercado Pago** en el celular.
2. Andá a **Tu perfil** (el ícono de la persona, abajo a la derecha).
3. Buscá **"Validá tu identidad"** o **"Completá tus datos"**.
4. Te va a pedir una foto del DNI (frente y dorso) y una selfie.

Si ya lo hiciste alguna vez, salteá este punto.

> **Por qué hace falta:** sin identidad verificada, Mercado Pago retiene el
> dinero de las ventas y no te lo libera. Es un requisito de ellos, no de la web.

### 1.2 Confirmá dónde querés recibir la plata

En la app, en **Tu perfil → Tu dinero** (o "Configuración → Datos bancarios"),
revisá que esté cargado tu CBU o alias.

Las ventas se acreditan primero en tu cuenta de Mercado Pago; desde ahí las
transferís a tu banco cuando quieras.

### 1.3 Fijate en cuánto tiempo cobrás

En la app: **Tu perfil → Costos** (o "Configuración → Costos de cobro").

Ahí ves dos cosas importantes:

- **Cuánto te cobra Mercado Pago de comisión.** Para venta online suele estar
  entre el 4% y el 7% según el plazo de acreditación.
- **En cuántos días te acreditan.** Podés elegir: cobrar al instante con más
  comisión, o a 10 / 18 / 30 días con menos comisión.

**Elegí el plazo que te convenga.** Esto no afecta a la web para nada: la
compradora recibe la guía igual, al instante. Sólo cambia cuándo entra la plata a
tu cuenta y cuánto te descuentan.

---

## Parte 2 — Crear la "aplicación" (el código para cobrar)

Esta parte se hace **desde la computadora**, no desde el celular.

### 2.1 Entrá al panel de desarrolladores

1. Abrí **https://www.mercadopago.com.ar/developers/panel**
2. Iniciá sesión con **tu cuenta de Mercado Pago** (la misma de la app).

Vas a ver una pantalla que dice **"Tus integraciones"**. Es normal que esté
vacía.

> Si te aparece algo sobre "términos y condiciones para desarrolladores",
> aceptalo. Es sólo para poder crear la aplicación.

### 2.2 Creá la aplicación

1. Botón **"Crear aplicación"**.
2. Te pide un nombre: escribí **`CISUR web`**. (El nombre es sólo para que vos la
   reconozcas después, no lo ve nadie.)
3. Te pregunta **"¿Qué producto estás integrando?"** → elegí **"Pagos online"**.
4. Después pregunta **"¿Estás usando una plataforma de e-commerce?"** → elegí
   **"No"**.
5. Si pregunta por el tipo de integración, elegí **"Checkout Pro"**.
6. **Crear aplicación**.

### 2.3 Buscá las credenciales

Ahora estás dentro de la aplicación `CISUR web`. En el menú de la izquierda vas a
ver:

- **Credenciales de producción**
- **Credenciales de prueba**

Vamos a necesitar **las dos**, en dos momentos distintos.

---

## Parte 3 — Lo que tenés que copiarme (primera tanda: PRUEBA)

Primero probamos todo sin mover plata real.

Hacé clic en **"Credenciales de prueba"**. Vas a ver dos campos:

| Lo que dice la pantalla | Cómo empieza |
|---|---|
| **Public Key** | `TEST-...` |
| **Access Token** | `TEST-...` |

**Copiame los dos** (hay un botoncito de copiar al lado de cada uno).

Con esto pruebo todo el circuito de compra con tarjetas falsas que da Mercado
Pago. No se cobra nada real.

---

## Parte 4 — Lo que tenés que copiarme (segunda tanda: PRODUCCIÓN)

Cuando te avise que las pruebas salieron bien, volvés a esta misma pantalla y
hacés clic en **"Credenciales de producción"**.

| Lo que dice la pantalla | Cómo empieza |
|---|---|
| **Public Key** | `APP_USR-...` |
| **Access Token** | `APP_USR-...` |

El **Access Token** puede estar tapado con puntitos y un botón que dice
**"Mostrar"** o un ojito. Hacé clic ahí para revelarlo, y después copialo.

**Copiame los dos.**

> ⚠️ **Estas dos, sobre todo el Access Token, son las importantes.** Mandámelas
> por un medio que puedas borrar después (ver "Cómo mandármelas" más abajo).

---

## Parte 5 — La clave del webhook

Este es el paso que hace que la web sepa **cuándo alguien pagó**. Sin esto, la
gente paga y no recibe la guía.

**Esperá a que yo te avise para hacer este paso**, porque necesito que la web ya
esté publicada.

1. En la misma aplicación `CISUR web`, en el menú de la izquierda buscá
   **"Webhooks"** (puede decir "Notificaciones webhooks").
2. Botón **"Configurar notificaciones"**.
3. Te va a pedir una **URL para el modo productivo**. Pegá exactamente esto:

```
https://cisur.vercel.app/api/webhook/mp
```

4. Más abajo hay una lista de **eventos**. Tildá solamente **"Pagos"**
   (en inglés puede decir `payment`). Dejá el resto sin tildar.
5. **Guardar**.
6. Después de guardar, aparece un campo que dice **"Firma secreta"** (o "Clave
   secreta"). Hacé clic en el ojito o en **"Mostrar"** y **copiámela**.

**Esa clave secreta es el tercer código que necesito.**

> **Para qué sirve:** es como un sello. Mercado Pago le avisa a la web cada vez
> que alguien paga, y esa clave le permite a la web comprobar que el aviso vino
> de verdad de Mercado Pago y no de alguien haciéndose pasar por ellos para
> llevarse la guía gratis.

---

## Resumen: los códigos que necesito

Copiá esta lista y completala:

```
=== PRUEBA (mandame estas primero) ===
Public Key de prueba:       TEST-...
Access Token de prueba:     TEST-...

=== PRODUCCIÓN (cuando te avise) ===
Public Key de producción:   APP_USR-...
Access Token de producción: APP_USR-...

=== WEBHOOK (cuando te avise) ===
Firma secreta del webhook:  ...
```

---

## Cómo mandármelas (importante)

**No me las mandes por mail.** Los mails quedan guardados para siempre en varios
servidores.

Elegí una de estas dos:

**Opción A — la más simple:** mandámelas por WhatsApp y, cuando yo te confirme
que las copié, **borrá el mensaje para todos** (mantené el dedo apretado sobre el
mensaje → Eliminar → Eliminar para todos).

**Opción B — la más segura:** entrá a **https://pwpush.com**, pegá los códigos en
el cuadro grande, elegí que expire en **1 día**, dale a **"Push it"** y mandame el
link que te genera. El link se autodestruye después de que yo lo abra.

---

## Preguntas que me imagino que vas a tener

**¿Esto me cuesta algo?**
No. Crear la aplicación es gratis. Lo único que pagás es la comisión de Mercado
Pago por cada venta, que ya se descuenta sola de lo que cobrás. La web, el
alojamiento y la base de datos van en planes gratuitos: no hay abono mensual.

**¿Le estoy dando acceso a mi cuenta a alguien?**
No. Los códigos permiten **generar cobros a tu favor**, no entrar a tu cuenta, ni
ver tu saldo, ni transferir tu dinero. Y los podés anular cuando quieras.

**¿Y si me arrepiento o quiero cortar esto?**
Entrás al panel de desarrolladores, a la aplicación `CISUR web`, y le das
**Eliminar**. La web deja de poder cobrar en ese mismo momento. Nada más.

**¿Cómo veo mis ventas?**
De dos formas. En la web tenés una sección **Panel → Ventas** con quién compró,
cuándo y cuánto. Y en la app de Mercado Pago las ves como cualquier otro cobro,
con la comisión ya descontada.

**¿Qué pasa si alguien paga en efectivo por Rapipago?**
Mercado Pago tarda uno o dos días en confirmarlo. La web lo maneja sola: le
muestra a la persona que el pago está pendiente, y cuando Mercado Pago confirma,
la guía aparece automáticamente en su cuenta. No tenés que hacer nada.

**¿Qué pasa si alguien pide que le devuelva la plata?**
Por ley tenés 10 días en los que puede arrepentirse sin dar explicaciones. La
devolución la hacés desde la app de Mercado Pago, en el detalle de ese cobro,
con la opción **"Devolver dinero"**. Avisame y yo le doy de baja el acceso a la
guía.

**No encuentro alguna de las pantallas que describís.**
Mercado Pago cambia el diseño cada tanto. Mandame una captura de lo que ves y te
digo dónde hacer clic.

---

Cualquier cosa que no te cierre, preguntame antes de tocar algo. No hay apuro y
no se puede romper nada de tu cuenta desde acá.
