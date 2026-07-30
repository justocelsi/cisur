# Mora: aprender desarrollo web con este proyecto

Hola Mora. Este documento es para que aprendas a hacer páginas web usando CISUR
como campo de práctica: un proyecto real, con una clienta real y plata real de
por medio. Es la mejor forma de aprender, y es bastante más motivante que un
tutorial de una to-do list.

**No hace falta que sepas programar para empezar.** Sí conviene que tengas
paciencia con los errores: el 80% de este trabajo es leer un mensaje de error y
entender qué te está diciendo.

---

## Cómo usar este documento

Está ordenado de menos a más. **Hacé las partes en orden**, aunque alguna te
parezca obvia.

| Parte | Qué vas a lograr | Tiempo |
|---|---|---|
| 0 | Entender qué es cada pieza y por qué existe | 20 min de lectura |
| 1 | Tener las herramientas instaladas | 40 min |
| 2 | Bajar el proyecto y verlo andar en tu compu | 30 min |
| 3 | Orientarte en el código | 30 min |
| 4 | Hacer tu primer cambio y publicarlo | 45 min |
| 5 | Entender lo que todavía no se ve | lectura |

Cuando algo no funcione, **copiá el mensaje de error completo** y mandámelo. No
lo parafrasees: el texto exacto es la información.

---

# Parte 0 — El mapa

Antes de tocar nada, quiero que tengas el mapa mental. Si entendés esto, el
resto es aprender dónde se hace clic.

## Qué es una página web, en serio

Cuando entrás a `cisur.vercel.app`, pasa esto:

1. Tu navegador le pide la página a una **computadora que está prendida en algún
   lado** (un servidor).
2. Esa computadora le manda **HTML** (el contenido y su estructura), **CSS** (cómo
   se ve) y **JavaScript** (qué pasa cuando hacés clic).
3. Tu navegador junta las tres cosas y dibuja lo que ves.

Todo lo demás son formas más cómodas de generar esas tres cosas.

## Las cinco piezas de CISUR

```
   Vos / una mamá que quiere comprar
                │
                ▼
      ┌──────────────────┐
      │     VERCEL       │  la computadora prendida que sirve la página
      │  (Next.js)       │  y donde vive el código
      └────────┬─────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│  SUPABASE   │  │ MERCADO PAGO │
│             │  │              │
│ · usuarios  │  │ · cobra      │
│ · productos │  │ · avisa que  │
│ · compras   │  │   se pagó    │
│ · los PDF   │  │              │
└─────────────┘  └──────────────┘
       ▲
       │
┌──────────────┐
│    GITHUB    │  guarda el código y su historia
└──────────────┘
```

**Vercel** es donde vive la página. Cuando subimos código a GitHub, Vercel se da
cuenta y publica la versión nueva sola.

**Supabase** es la base de datos: una planilla de cálculo muy estricta y muy
rápida. Guarda quién se registró, qué materiales hay, quién compró qué, y los
archivos PDF.

**Mercado Pago** cobra. Nosotros nunca vemos una tarjeta: la persona paga en el
sitio de MP y MP nos avisa "che, fulano pagó".

**GitHub** guarda el código y **toda su historia**. Es lo que te permite
equivocarte sin miedo: siempre podés volver atrás.

**Next.js** es la herramienta con la que está escrito el sitio. Es React (una
forma de escribir interfaces) más un montón de cosas resueltas.

## El concepto más importante: el cliente y el servidor

Esto es lo que más cuesta al principio y lo que más te va a servir.

- **El servidor** es la computadora de Vercel. Ahí hay secretos (las claves para
  cobrar, la clave que da acceso total a la base). Nadie los ve.
- **El cliente** es el navegador de la persona. **Todo lo que mandás al cliente
  es público**, aunque no se vea a simple vista.

Por eso la regla de oro de este proyecto: **nunca confíes en el cliente**. Si el
navegador dice "esta guía cuesta $1", el servidor no le cree y busca el precio
real en la base. Vas a ver ese principio repetido por todos lados.

---

# Parte 1 — Las herramientas

Instalá estas cuatro cosas, en este orden.

## 1.1 VS Code — donde se escribe el código

Bajalo de **https://code.visualstudio.com** y instalalo.

VS Code es un editor de texto con superpoderes. Lo que tenés que conocer:

- **El explorador** (arriba a la izquierda, el ícono de hojas): los archivos del
  proyecto.
- **La terminal** (menú `Terminal → New Terminal`, o `` Ctrl + ñ ``): donde
  escribís comandos. **Le vas a tener miedo al principio y es normal.**
- **La búsqueda** (la lupa): busca texto en TODOS los archivos a la vez. Es la
  herramienta que más vas a usar para entender código ajeno.
- **`Ctrl + P`**: abrir un archivo escribiendo su nombre. Rapidísimo.

Instalá estas dos extensiones (el ícono de los cuadraditos, a la izquierda):

- **ESLint** — te marca errores mientras escribís.
- **Prettier** — ordena el código solo.

## 1.2 Node.js — para que el proyecto pueda correr

Bajá la versión **LTS** de **https://nodejs.org**.

Node es lo que permite ejecutar JavaScript fuera del navegador. Sin esto, el
proyecto no arranca.

Para verificar que quedó bien, abrí la terminal de VS Code y escribí:

```bash
node --version
```

Tiene que responder algo como `v22.x.x`. Si dice "command not found", cerrá VS
Code, abrilo de nuevo y probá otra vez (hay que reiniciarlo para que vea lo
recién instalado).

## 1.3 Git — la máquina del tiempo

Bajalo de **https://git-scm.com/downloads**.

Git guarda **fotos** de tu proyecto en el tiempo. Cada foto se llama *commit*.
Podés volver a cualquiera. Es lo que hace que romper algo no sea grave.

Después de instalarlo, configurá quién sos (una sola vez en la vida):

```bash
git config --global user.name "Mora"
git config --global user.email "tu-mail@ejemplo.com"
```

## 1.4 Una cuenta de GitHub

Creátela en **https://github.com**. Usá el mismo mail de arriba.

GitHub es donde viven los commits, en internet, para que varias personas
trabajen sobre el mismo proyecto. Decile a Justo tu usuario para que te dé
acceso al repositorio.

---

# Parte 2 — Bajar el proyecto y hacerlo andar

## 2.1 Traer el código a tu compu

Abrí la terminal de VS Code y escribí, línea por línea:

```bash
cd ~
git clone https://github.com/justocelsi/cisur.git
cd cisur
```

- `cd ~` — andá a tu carpeta personal ("cd" = *change directory*).
- `git clone …` — bajá una copia completa del proyecto, con toda su historia.
- `cd cisur` — entrá a la carpeta que se acaba de crear.

Después, en VS Code: `File → Open Folder` → elegí la carpeta `cisur`.

## 2.2 Instalar lo que el proyecto necesita

```bash
npm install
```

Esto lee el archivo `package.json` (la lista de ingredientes) y baja todas las
librerías que el proyecto usa. Crea una carpeta `node_modules` **enorme**. Es
normal, y esa carpeta nunca se sube a GitHub.

Tarda uno o dos minutos.

## 2.3 Las variables de entorno

El proyecto necesita claves para conectarse a Supabase y a Mercado Pago. Esas
claves **no están en GitHub** (sería como publicar la contraseña del banco).

Pedile a Justo el archivo `.env.local` y ponelo en la raíz de la carpeta
`cisur`. Fijate que aparezca en el explorador de VS Code, al mismo nivel que
`package.json`.

> **Regla que no se rompe nunca:** ese archivo no se sube a GitHub jamás. Ya
> está bloqueado en `.gitignore`, pero conviene que sepas por qué está.

## 2.4 Arrancar

```bash
npm run dev
```

Vas a ver algo como `Ready in 1.2s - Local: http://localhost:3000`.

Abrí **http://localhost:3000** en el navegador. **Esa es la web corriendo en tu
computadora.** Nadie más la ve.

Probá esto: con el sitio abierto, cambiá un texto en el código y guardá
(`Ctrl + S`). El navegador se actualiza solo. Eso se llama *hot reload* y es lo
que hace que desarrollar sea entretenido.

Para frenarlo: `Ctrl + C` en la terminal.

---

# Parte 3 — Orientarte en el código

Abrí el explorador de VS Code. Lo importante:

```
cisur/
├── app/                 ← todo lo que se ve
│   ├── page.js              la página de inicio
│   ├── layout.js            el marco: encabezado y pie de TODAS las páginas
│   ├── globals.css          los colores y las tipografías
│   ├── guias/               el catálogo y la página de cada material
│   ├── panel/               lo que ve Tati para administrar
│   ├── components/          piezas reutilizables
│   └── api/                 el código que corre en el SERVIDOR
├── lib/                 ← funciones auxiliares
├── supabase/            ← la definición de la base de datos
├── package.json         ← la lista de ingredientes
└── .env.local           ← las claves (no está en GitHub)
```

## La regla de las carpetas

En Next.js, **cada carpeta dentro de `app/` es una dirección de la web**:

| Carpeta | Dirección |
|---|---|
| `app/page.js` | `cisur.vercel.app/` |
| `app/talleres/page.js` | `cisur.vercel.app/talleres` |
| `app/guias/page.js` | `cisur.vercel.app/guias` |

Los corchetes significan "acá va algo variable": `app/guias/[slug]/page.js`
atiende `/guias/lo-que-sea`.

## Cómo encontrar dónde está algo

Ésta es la habilidad más útil de todas.

Supongamos que querés cambiar el texto "Quiero la guía". Apretá `Ctrl + Shift + F`
(la búsqueda global), escribí `Quiero la guía` y VS Code te dice exactamente en
qué archivo y en qué línea está.

**Hacelo siempre.** Nunca busques a ojo entre las carpetas.

## Leé un archivo completo

Abrí `app/components/Preguntas.jsx`. Es cortito y tiene de todo. Vas a ver:

- Un `import` arriba: traer cosas de otro archivo.
- Una `function` que devuelve algo parecido a HTML. Eso se llama **JSX**: HTML
  escrito dentro de JavaScript.
- Un `.map(...)`: "por cada pregunta de esta lista, dibujá esto". Es la forma de
  repetir sin copiar y pegar.
- Las `className="..."`: los estilos. Cada palabrita es una regla de CSS
  (`mt-5` = margen arriba, `text-tinta` = color de texto). Eso es **Tailwind**.

Si entendés ese archivo, entendés el 70% de los demás.

---

# Parte 4 — Tu primer cambio publicado

Este es el ciclo que vas a repetir toda tu vida como desarrolladora.

## 4.1 Crear una rama

Una **rama** es una línea de trabajo paralela. Trabajás ahí, y si rompés algo no
afecta a la web que está publicada.

```bash
git checkout -b mi-primer-cambio
```

(`checkout -b` = creá una rama nueva y pasate a ella.)

## 4.2 Hacer el cambio

Cambiá algo chiquito y visible. Por ejemplo, en `app/components/Preguntas.jsx`,
alguna respuesta.

Guardá con `Ctrl + S` y mirá el navegador.

## 4.3 Revisar que no rompiste nada

**Esto es obligatorio, siempre, antes de subir cualquier cosa:**

```bash
npm run lint && npm test && npm run build
```

- `lint` — revisa que el código esté bien escrito.
- `test` — corre las pruebas automáticas.
- `build` — arma la versión final, como quedaría publicada.

Si los tres pasan, seguís. Si alguno falla, **leé el error**: te dice el archivo
y la línea.

## 4.4 Guardar el cambio (commit)

```bash
git status
```

Te muestra qué archivos tocaste. Después:

```bash
git add -A
git commit -m "Ajusto la respuesta sobre las edades"
```

- `git add -A` — preparar todos los cambios.
- `git commit -m "..."` — sacar la foto, con un mensaje que explique **qué
  problema resolvés**, no qué líneas tocaste.

> Un mensaje bueno: `Aclaro la respuesta sobre edades, que confundía a las
> familias`. Uno malo: `cambios`. Dentro de seis meses el mensaje es lo único
> que vas a tener.

## 4.5 Subirlo

```bash
git push -u origin mi-primer-cambio
```

Andá a GitHub: te va a ofrecer crear un **Pull Request** (PR). Un PR es "miren
lo que hice, ¿lo incorporamos?". Escribí qué cambiaste y por qué, y avisale a
Justo para que lo revise.

Cuando lo aprueba y se hace *merge* a la rama `main`, **Vercel publica la
versión nueva sola**, en unos dos minutos.

## 4.6 Volver a empezar

```bash
git checkout main
git pull
```

`pull` trae lo último que hay en GitHub, incluido tu cambio ya incorporado.

---

# Parte 5 — Lo que no se ve

Estos conceptos no son de este proyecto: son de todos. Vale la pena entenderlos.

## La base de datos y por qué es estricta

Abrí `supabase/migrations/0001_schema.sql`. Vas a ver cosas como:

```sql
create table compras (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id),
  estado      compra_estado not null default 'pendiente',
  ...
);
```

Eso define una tabla: sus columnas y sus reglas. `not null` significa "esto no
puede quedar vacío". `references` significa "esto tiene que apuntar a una fila
que exista de verdad".

La base es estricta a propósito: **es la última línea de defensa**. Si el código
tiene un error, la base todavía te frena.

## RLS: quién puede ver qué

`supabase/migrations/0002_rls.sql` define, para cada tabla, quién puede leer y
escribir. Por ejemplo: una persona sólo ve **sus propias** compras.

Esto no está en el código de la página: está **en la base**. Y es a propósito.
Aunque alguien manipulara el navegador, la base sigue diciendo que no.

Fijate en `supabase/tests/rls_smoke_tests.sql`: son 55 pruebas que verifican
exactamente eso. Correlas después de tocar cualquier permiso.

## Qué es un webhook

Cuando alguien paga, Mercado Pago le manda un mensaje a nuestro servidor:
"el pago 12345 fue aprobado". Ese mensaje es un **webhook**.

El detalle importante está en `app/api/webhook/mp/route.js`: **no le creemos al
mensaje**. Cualquiera podría mandarnos uno falso diciendo "está pagado". Lo que
hacemos es tomar el número de pago y **preguntarle a Mercado Pago directamente**
cuál es el estado real.

Ese reflejo — "¿de dónde viene este dato y puedo confiar en él?" — es lo que
separa a alguien que programa de alguien que programa bien.

## Por qué hay tantos comentarios

Fijate que los comentarios del código no dicen *qué* hace una línea (eso ya se
lee en la línea), sino **por qué**. Por ejemplo:

```js
// Sin capa de texto no se puede seleccionar ni copiar el contenido. Es una
// barrera básica, no criptográfica: cualquiera puede sacar una foto de la
// pantalla. Alcanza para que copiar el material sea incómodo.
```

El *qué* lo entendés leyendo. El *por qué* se pierde para siempre si nadie lo
escribe. Adoptá esa costumbre desde el primer día.

---

# Cómo seguir

## El orden que yo seguiría

1. **HTML y CSS** de verdad, antes que cualquier framework. Sin esto, React es
   magia incomprensible. → [MDN en español](https://developer.mozilla.org/es/docs/Learn)
2. **JavaScript**: variables, funciones, arrays, `map`, `filter`, `async/await`.
   → [javascript.info](https://javascript.info) (hay traducción)
3. **React**: componentes, props, estado. → [react.dev/learn](https://react.dev/learn)
4. **Next.js**: recién acá. → [nextjs.org/learn](https://nextjs.org/learn)
5. **SQL**: es viejo, es aburrido y no pasa de moda nunca.

Tentación a evitar: saltar directo al paso 4 porque es lo que usamos. Vas a
poder copiar y pegar, pero no vas a poder arreglar nada cuando se rompa.

## Un consejo sobre la IA

Vas a usar ChatGPT o Claude, y está perfecto. Dos reglas:

1. **No pegues código que no entendés.** Pedile que te lo explique línea por
   línea hasta que lo entiendas. Si no, cuando falle no vas a saber por dónde
   empezar.
2. **Nunca le pegues el contenido de `.env.local`.** Son claves reales.

## Ejercicios sobre este proyecto

De menos a más:

1. Cambiá un texto de las preguntas frecuentes y publicalo.
2. Agregá una quinta pregunta en la sección "¿Alguna de estas preguntas te
   resulta familiar?" (pista: `app/page.js`, buscá `dolores`).
3. Agregá una invitación más al frasco (pista: `BloqueFrasco.jsx` **y**
   `0006_seed.sql`).
4. Cambiá el color del botón de compra y entendé de dónde sale ese color
   (pista: `globals.css`).
5. Sumá un campo nuevo a los talleres, por ejemplo "cantidad de familias". Este
   te obliga a tocar base de datos, panel y vista: es el ejercicio completo.

---

## Si algo se rompe

**"Rompí todo y no sé qué toqué"**

```bash
git status              # ver qué cambió
git checkout -- .       # descartar TODO lo no commiteado
```

Con git, mientras hayas commiteado, nunca perdés nada.

**"No arranca `npm run dev`"**

Noventa por ciento de las veces: faltó `npm install`, o falta `.env.local`.

**"Me tira un error rojo enorme"**

Leé **la primera línea**. El resto es el detalle de dónde pasó. Casi siempre te
nombra el archivo y la línea exactos.

---

Cualquier cosa, preguntame. Preguntar temprano ahorra horas, y no hay ninguna
pregunta demasiado básica.
