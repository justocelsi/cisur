# CISUR — notas para trabajar en este repo

Leer `README.md` primero: tiene el stack, el modelo de datos y la sección
"Decisiones que conviene conocer antes de tocar el código".

## Antes de dar algo por terminado

```bash
npm run lint && npm test && npm run build
```

Los tres tienen que pasar. El build corre sin credenciales a propósito.

## Trampas de este proyecto

- **Si tocás una policy de RLS o un trigger**, correr
  `supabase/tests/rls_smoke_tests.sql` en el SQL Editor de Supabase. Todas las
  filas tienen que decir `OK`.
- **Las migraciones son idempotentes y se corren a mano**, en orden numérico.
  Nunca editar una migración ya aplicada en producción: agregar una nueva.
- **El path de los PDF es `guias/<producto_id>/…`**. La policy de Storage
  (`0005_storage.sql`) deriva el permiso del primer folder. Cambiar la convención
  rompe el acceso al material de todos los compradores.
- **El precio nunca viene del cliente.** Lo pisa el trigger `snapshot_compra`.
  Si agregás un camino de compra nuevo, tiene que pasar por `crear_compra()`.
- **El webhook falla cerrado.** Si algo devuelve 401 en `/api/webhook/mp`, revisar
  `MP_WEBHOOK_SECRET` antes de tocar la validación de firma.
- **El sitio público es UNA página** (`app/page.js`). No agregar rutas nuevas
  para contenido: va como sección con su `id`, y el nav del encabezado se arma
  solo desde los productos. Si agregás una sección fija, sumala a `secciones`
  en `app/layout.js` y ponele la utilidad `ancla`.
- **`prosa` sobre un `<ul>` no funciona** (estiliza `.prosa ul > li`, o sea
  descendientes). Para listas sueltas: `lista` o `lista-numerada`.
- **ESLint corre las reglas del compilador de React.** No se permite `setState`
  sincrónico en el cuerpo de un efecto: la carga de datos va en una función async
  declarada *dentro* del efecto (la regla no ve a través de un `useCallback`).
  El patrón usado es un contador de recarga (`recarga` / `intento`).

## Estilo

- Castellano rioplatense en identificadores, comentarios y textos de UI.
- Comentar el *por qué*, no el *qué*.
- Los mensajes de error que ve el usuario pasan por `lib/errores.js`: nada de
  strings crudos de Supabase en pantalla.
