# CISUR — notas para trabajar en este repo

Leer `README.md` primero: tiene el stack, el modelo de datos y la sección
"Decisiones que conviene conocer antes de tocar el código".

## Antes de dar algo por terminado

```bash
npm run lint && npm test && npm run build
```

Los tres tienen que pasar. El build corre sin credenciales a propósito.

## Trampas de este proyecto

- **Si tocás una policy de RLS, un grant o un trigger**, correr
  `select * from public.cisur_smoke_tests();` en el SQL Editor: la última fila
  tiene que decir `TODO OK`. Si la función no existe todavía, instalarla con
  `supabase/tests/instalar_smoke_tests.sql`.
- **Una prueba de la suite no puede depender de cuántas filas hay en la base.**
  Se corre en producción, con clientes adentro. Toda cuenta se filtra por los
  actores de prueba (`%@test.cisur`) o por los slugs de prueba, salvo que pase
  por RLS y ya esté acotada al actor. "editor ve las ventas" contaba sin filtro:
  pasaba con la base vacía y empezó a fallar sola con la primera venta real.
- **Un script de mantenimiento para Supabase no puede depender de que una
  sentencia vea lo que creó la anterior**, ni de `BEGIN`/`ROLLBACK`, ni de
  tablas `ON COMMIT DROP`. Si necesita estado compartido, va adentro de una
  función y se invoca con una sola sentencia. Tres versiones de los smoke tests
  fallaron por ignorar esto.
- **No insertar filas en `storage.objects` desde SQL.** Un trigger de Supabase
  (`protect_delete`) prohíbe borrarlas después, así que quedan como archivos
  fantasma en el bucket. Las policies de Storage se prueban por sus piezas
  (`storage.foldername` + `tiene_acceso`), no creando objetos.
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
