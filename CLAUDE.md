# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio. **Es la fuente de verdad del estado actual y de las decisiones tomadas.** Guarda las *decisiones y sus porqués*; las *tareas abiertas* están en [BACKLOG.md](BACKLOG.md) y no se duplican aquí.

---

## Qué es esto

Sistema de reserva del **Laboratorio de Analítica de Datos e Inteligencia Artificial** de la Universidad Católica Luis Amigó. El público llega por un código QR → ve la disponibilidad en un calendario → solicita una franja. Un único administrador (una contraseña, sin sistema de usuarios) aprueba, rechaza o cancela solicitudes y gestiona bloqueos de horario. Todo el texto visible va en español.

**Hay una sola sala reservable, "Sala Principal"**, pero el modelo `Room` es genérico a propósito: hubo una segunda sala y se retiró por decisión de producto, no por limitación técnica. Por eso conviven `getActiveRoom()` y `getActiveRooms()`, y el selector de sala de `TimeBlockForm` sigue existiendo aunque hoy solo ofrezca dos opciones. **No "simplificar" eso**: reactivar una segunda sala debe seguir siendo un cambio de datos, no una migración.

⚠️ **Dos nombres que se confunden**, y ya costaron dos rondas de correcciones: el **Laboratorio de Analítica de Datos e Inteligencia Artificial** es el espacio que se reserva y aparece en toda la app; la **Unidad de Estrategia del Dato y Analítica** es quien lo administra y construyó la herramienta, y aparece **una sola vez**, en el crédito de `Footer.tsx`. Esa línea dice algo distinto al resto del producto a propósito — no unificarla.

**Estado: las diez fases del MVP están completas y la aplicación está [en producción](https://reservas-laboratorio-ueda.vercel.app)**, con el criterio de aceptación final confirmado por el usuario.

---

## Datos: dos proyectos de Supabase

**Hay una base de desarrollo separada desde el 2026-08-11.** Antes no la había —local y producción compartían proyecto— y ese era el mayor riesgo del repositorio.

| Entorno | Proyecto | Quién lo usa |
|---------|----------|--------------|
| **Desarrollo** | `vkixgpvztkvbuwamhqdv` | el `.env` local y el MCP de `.mcp.json` |
| **Producción** | `ceqqzubsxxuroawcnpvg` | solo las variables de entorno de Vercel |

⚠️ **Antes de ejecutar cualquier cosa que escriba en la base, confirmar a cuál apunta el `.env`.** La forma rápida, sin exponer la contraseña:

```bash
grep -oE 'postgres\.[a-z0-9]{20}' .env | head -1
```

Sigue siendo importante porque **el guard de `prisma/seed.ts` no protege**: comprueba `NODE_ENV === "production"`, que en una terminal local vale `"development"` o nada, aunque `DATABASE_URL` apunte a producción. Y `npx prisma db seed` **borra `Reservation` y `TimeBlock` completos** antes de recrear los datos de demo. La separación de proyectos quita el riesgo por defecto, no la posibilidad de pegarse un tiro pegando la cadena equivocada.

**En desarrollo la semilla es bienvenida**: deja 1 sala, 6 reservas y 2 bloqueos, que es justo lo que hace falta para trabajar. En producción **no resembrar sin pedirlo** — el usuario vació `Reservation` y `EmailLog` a propósito para dejar la app lista para uso real.

⚠️ **No dar por buena ninguna cifra de filas de producción que leas aquí: la app está en uso.** Míralo en vez de deducirlo.

⚠️ **`_prisma_migrations` no tiene RLS**, en los dos proyectos. Es una decisión heredada ("tabla interna, sin datos sensibles") que conviene revisar: no guarda datos personales, pero con la llave `anon` **se puede escribir**, y corromper el historial de migraciones rompería los despliegues. Arreglarlo es una línea y es seguro, porque Prisma se conecta como `postgres`, que ignora RLS.

---

## Documentos

- ⚠️ **[FUSION-DATACUEVA.md](FUSION-DATACUEVA.md)** — **el trabajo grande que viene**: absorber la app de préstamo de equipos ([DataCueva](https://github.com/JuanSNuno/DataCueva)) dentro de este panel de admin, con una sola base para las dos apps y usuarios con roles en vez de la contraseña compartida. Plan aprobado y por fases. **Si vas a trabajar en eso, léelo entero antes de tocar nada, y respeta su regla número 1: cada fase se explica al usuario y se aprueba antes de empezarla.**
- **[BACKLOG.md](BACKLOG.md)** — lo que falta y lo que se dejó fuera de alcance. No implementar nada listado como fuera de alcance; si aparece la tentación, anotarla ahí y seguir.
- **[identidad-visual-ucla-ui-ux.md](identidad-visual-ucla-ui-ux.md)** — tokens, tipografía, logo y voz de redacción. **De cumplimiento obligatorio.**
- **[PLAN-MVP.md](PLAN-MVP.md)** — la especificación numerada que citan los comentarios del código (`§5 del plan`, `§8 del plan`…). Es referencia de contrato, no estado actual: **donde difiera del código, manda el código.**
- **[README.md](README.md)** — instalación, variables de entorno y despliegue.

---

## Comandos

```bash
npm run dev                  # desarrollo
npm run build                # debe pasar limpio antes de cerrar cualquier trabajo
npm run lint
npm run typecheck
npm run check:datetime       # casos límite de fecha/hora (no está en CI)

npx prisma migrate dev       # crear y aplicar migración en desarrollo
npx prisma migrate deploy    # aplicar migraciones ya creadas
npx prisma generate          # regenerar cliente tras cambiar el schema
npx prisma studio            # inspector de BD — el verificador principal
npx prisma db seed           # ⚠️ DESTRUCTIVO: ver la sección de Datos
```

**No hay framework de tests.** La verificación es por criterios de aceptación: `prisma studio`, `curl` contra los Route Handlers y `scripts/check-datetime.ts` para la capa horaria. Para bugs de interfaz y auditorías de accesibilidad, **Playwright y axe-core instalados temporalmente** (`npm install --no-save playwright @axe-core/playwright`) han sido efectivos; `package.json` y `package-lock.json` deben quedar intactos.

**`npm run check:datetime` no está en el CI** porque no necesita base de datos, pero es la red de seguridad de la capa horaria: correrlo al cerrar cualquier trabajo que toque fechas.

---

## Git y GitHub

- `main` = producción, cada push despliega a Vercel. `develop` = rama por defecto e integración, donde apuntan los PR. Cada unidad de trabajo en su rama: `feat/*`, `fix/*`, `chore/*`, `docs/*`.
- Los rulesets bloquean push directo, force-push y borrado en `main` y `develop`.
- [ci.yml](.github/workflows/ci.yml) corre lint + typecheck + build en PR y en push a `develop`; es el status check obligatorio. **No corre en `main`**, a propósito.
- `gh pr checks <n>` a veces reporta "pending" con el job ya terminado; `gh run view --job=<id>` es más fiable.

**Nunca fusionar un PR sin confirmación explícita del usuario.** Instrucción permanente suya, repetida en varias sesiones.

⚠️ **Un merge a `main` puede no desplegar, y nada avisa.** Pasó una vez: el PR se fusionó, Vercel no creó el despliegue y la app quedó atrasada ~12 h. Fue puntual —el merge siguiente desplegó sin tocar nada— pero el fallo es silencioso, porque el CI no corre en `main` y Vercel no marca error. **Tras fusionar a `main`, comprobar producción con una petición real** a una ruta cuyo contenido haya cambiado.

---

## Decisiones de producto

Todas pedidas explícitamente por el usuario.

**Rechazar y cancelar no piden motivo.** El plan exigía `adminNote` obligatorio; el usuario pidió lo contrario antes de construir la bandeja: ambas acciones solo piden confirmación. El campo sigue en el modelo (nullable) y `ReservationDetail` lo muestra si tiene valor. **Consecuencia:** el correo de rechazo no puede citar una razón, porque no se recoge en ningún punto del flujo.

**Campos del formulario.** Son obligatorios `academicProgram` y `activityType` (listas cerradas; `OTRO` pide detalle en `activityTypeOther`), `attendees` —validado contra `Room.capacity`, no contra una constante— y `responsibilityAccepted`. El campo libre `purpose` se eliminó: lo reemplaza `activityType`, más útil para decidir sin leer texto libre.

⚠️ **El cargo es la excepción.** `REQUESTER_ROLES` existe como las otras listas, pero `Reservation.requesterRole` sigue siendo **`String`, no un enum de Prisma**. Es deliberado: el campo nació como texto libre y hay filas con valores que no traducen a la lista. Migrar obligaría a inventarles un mapeo o a perderlos, y no compraría nada — la única escritura pasa por Zod, que valida contra esa lista, y el canal REST de Supabase está cerrado por RLS. `labelForRequesterRole()` devuelve el valor crudo si no lo reconoce, así las reservas antiguas siguen legibles. Su "Otro", a diferencia del de `activityType`, **no** pide detalle.

⚠️ **Los `value` de `src/config/reservationOptions.ts` deben coincidir exactamente con los enums `AcademicProgram`/`ActivityType` de `prisma/schema.prisma`.** Están comentados cruzadamente. Ese archivo es la única fuente: lo consumen el `<select>` de `StepRequester.tsx`, el `z.enum` de `lib/validation/reservation.ts` y las etiquetas de `StepReview.tsx`.

**No se rota `ADMIN_PASSWORD`.** Estuvo anotado como pendiente de seguridad; el usuario decidió no hacerlo, con la información delante. **No volver a proponerlo.**

---

## Arquitectura: lo que hay que entender de varios archivos a la vez

**Configuración como fuente única de reglas.** `src/config/booking.ts` y `src/config/holidays.ts` concentran horarios, granularidad, duraciones, límites y festivos. Ninguna regla de negocio se hardcodea en componentes ni handlers.

**El horario de atención absorbe los festivos.** `getOpeningRangesFor(date)` en `lib/datetime.ts` devuelve `[]` para sábados, domingos y festivos. Todo lo demás —generación de slots, validación del servidor, pintado del calendario— consume esa función, así que cerrar un día no requiere lógica extra en ninguna capa. Los cierres excepcionales no van aquí: los crea el admin como `TimeBlock` de tipo `BLOCKED`.

**Dos jornadas por día con receso 12:00–13:00.** Una reserva nunca puede cruzarlo: `fitsInSingleRange()` rechaza 11:00–14:00 aunque ambos extremos estén en horario.

**Zod compartido cliente/servidor.** Los esquemas de `lib/validation/` son la única definición de las reglas de campo; el cliente los usa vía `@hookform/resolvers` y el servidor los revalida siempre. El servidor no confía en el cliente ni cuando el formulario ya validó.

**Qué vive en Zod y qué en el Route Handler.** `lib/validation/reservation.ts` cubre lo que es función pura de los campos (formato, dominio del correo, duración, alineación a la grilla, receso, anticipación), reutilizando `lib/datetime.ts` en vez de reimplementar aritmética. Lo que necesita la base de datos —sala activa, solapamiento, bloqueos, aforo, límite de pendientes por correo— vive en `POST /api/reservations`, **dentro de la misma `prisma.$transaction` que crea el registro**: la comprobación de choque y la creación no pueden ir separadas.

**Disponibilidad.** `lib/availability.ts` implementa el solapamiento con exactamente `A.startsAt < B.endsAt && B.startsAt < A.endsAt` (09:00–10:00 y 10:00–11:00 **no** solapan). Las reservas `PENDING` **ocupan la franja** igual que las `CONFIRMED`.

⚠️ `lib/availability.ts` declara su **propio** union `ReservationStatus` en vez de importar el de Prisma (para servir igual en cliente y servidor, y poder probarse con literales). No puede desincronizarse en silencio —los handlers pasan resultados de Prisma a `findConflicts()`, así que un estado nuevo que falte allí rompe la compilación— pero al añadir uno hay que tocar los dos sitios.

**Mutaciones = Route Handlers, no Server Actions.** Un solo patrón, para poder probar con `curl`. Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`.

**Dos patrones de datos distintos, a propósito.** `app/page.tsx` consulta Prisma directo: es Server Component y no necesita refrescarse tras una mutación. `app/admin/(protected)/page.tsx` es Client Component y llama a `GET /api/admin/reservations` desde el navegador, porque necesita revalidar tras cada `PATCH`, mantener filtros y mostrar toasts.

**Comunicación entre hermanos sin store global.** El contador de pendientes vive en `AdminNav` (dentro del layout) pero quien dispara los cambios es la bandeja — hermanos en el árbol. En vez de Context o un store para un solo valor derivado, se usa un evento de `window` (`ADMIN_RESERVATIONS_CHANGED_EVENT`): la bandeja lo dispara tras cada `PATCH` exitoso y `AdminNav` vuelve a pedir el conteo.

**El formulario de `/reserva` funciona sin JavaScript**, y no por purismo: entre que la página pinta y que React hidrata hay una ventana en la que el `onSubmit` no está enlazado, y pulsar el botón hacía un envío nativo que recargaba la misma página **sin ir a ninguna parte** (detectado con Playwright, no por lectura). El `<form>` es un `GET` real hacia `/reserva`, que resuelve `?codigo=` en el servidor y redirige; el handler de cliente ahorra el viaje.

### `EXPIRED` se aplica al leer, no con una tarea programada

Una solicitud que nadie revisó y cuya franja ya terminó pasa a `EXPIRED`. Es el único estado que **no** decide el administrador, así que no hay ninguna acción de usuario donde colgarlo: `lib/expiration.ts` hace un `updateMany` idempotente que se llama **antes** de las tres lecturas que importan — `GET /api/admin/reservations` (de donde cuelga el contador del nav), `getPublicReservationByCode()` y el conteo de pendientes de `POST /api/reservations`.

Se descartó Vercel Cron porque **en plan Hobby solo permite una ejecución al día**: una solicitud vencida por la mañana seguiría mostrándose "En revisión" hasta la madrugada. `decidedAt` se deja en `null` a propósito — `EXPIRED` con `decidedAt` nulo significa exactamente "se venció sin que nadie la mirara".

**Es terminal:** `ALLOWED_FROM` en el `PATCH` solo admite origen `PENDING` o `CONFIRMED`, así que las tres acciones sobre una vencida devuelven `409` sin código extra. Y **arregla un bug real**: el tope de `maxPendingPerEmail` filtra por `PENDING`, así que antes tres solicitudes vencidas sin revisar bloqueaban ese correo de forma permanente.

### Cancelación por el propio solicitante

`POST /api/reservations/[code]/cancel` no lleva sesión: la llave son **código + número de documento**, dos datos que solo junta quien reservó.

- **El error es el mismo para "ese código no existe" y "ese documento no coincide".** Si fueran distintos, el endpoint diría si un código existe y volvería recorrible el espacio de códigos.
- **El acuse por correo al solicitante es parte de la seguridad**, no cortesía: el documento no es un secreto, así que si alguien cancelara sin permiso, el dueño se entera al momento. Usa `selfCancelTemplate` y **no** `cancelTemplate` — la redacción de esa ("lamentamos informarte") es la de una cancelación que se sufre, no una que se decide.
- **Compare-and-set**: el estado va en el `WHERE` del `updateMany`, no solo en la comprobación previa. Si el admin decide entre una cosa y la otra, no se pisa su decisión.
- Se puede cancelar hasta que la reserva **empieza**, estando `PENDING` o `CONFIRMED`. `EXPIRED` no, por terminal. La franja se libera sola: `CANCELLED` no está en `ESTADOS_QUE_OCUPAN`.
- No se distingue en la BD quién canceló; ambos dejan `CANCELLED` con `decidedAt`.

### Correos

**El correo nunca bloquea la transición de estado.** Orden: actualizar BD → intentar enviar → registrar en `EmailLog` (`SENT`/`FAILED`/`LOGGED`). Si el envío falla, la respuesta sigue siendo `200` con `{ emailStatus: "FAILED" }`.

⚠️ **Las llamadas a correo van envueltas en `try/catch` en los handlers, además del que ya tiene el mailer.** `enviarCorreo()` atrapa los fallos de *envío* y los registra como `FAILED`, pero el `EmailLog.create` de su propio `catch` puede fallar y esa excepción sí escaparía — convirtiendo un `201`/`200` en `500` con la reserva ya escrita. En `POST /api/reservations` eso sería peor que ruido: el solicitante creería que no se envió y al reintentar chocaría con su propia franja.

**El HTML se escapa en origen Y se previsualiza en un `<iframe sandbox="">` — doble capa.** `requesterName`, `activityTypeOther` y `adminNote` los escribió alguien externo por el formulario público, y ese HTML no solo se manda: se guarda en `EmailLog.body` y se vuelve a renderizar en `/admin/correos`, dentro de la sesión del admin. `templates.ts` escapa todo valor interpolado; `EmailLogRow.tsx` además usa un `<iframe sandbox="">` sin ningún token en vez de `dangerouslySetInnerHTML`.

**`lib/mail/mailer.ts` comprueba `SMTP_HOST` Y `SMTP_PASSWORD`**, no solo el host, para decidir el fallback a consola + `LOGGED`. En la práctica el usuario ya tenía host/puerto/usuario configurados antes de tramitar la contraseña de aplicación, así que revisar solo el host habría intentado una conexión real sin credenciales y fallado con `FAILED` en vez de degradar limpiamente.

**`MAIL_TO_ADMIN` para los avisos internos** (solicitud nueva, y cancelación hecha por el solicitante). Hoy vale lo mismo que `SMTP_USER` —el laboratorio se avisa a sí mismo— pero sigue siendo variable aparte a propósito: el día que los avisos deban ir a otra persona se cambia eso y no el remitente de todos los correos. `enviarCorreoAlLaboratorio()` devuelve `null` y avisa por consola si no está configurada, en vez de inventar un destinatario.

⚠️ **El enlace de Google Calendar usa el instante UTC real** (`fechaParaGoogleCalendar()`). **No** pasa por `toBogotaWallClockIso()`: ese truco es exclusivo del límite con FullCalendar y aquí metería 5 h de desfase en el calendario de quien pulse el botón. El separador `/` de `dates` va sin codificar, como en la documentación de Google.

**Verificado contra Gmail real**, no simulado: los tres estados de `EmailLog` (`SENT`; `LOGGED` con contraseña vacía; `FAILED` con contraseña incorrecta — Gmail devolvió `535-5.7.8`, capturado en `EmailLog.error`, y la reserva quedó igual `CONFIRMED`), más el reintento sobre un registro `LOGGED`, que pasó a `SENT`.

### Autenticación del admin

JWT firmado con `jose` en cookie `admin_session` (httpOnly, 8 h). Sin NextAuth.

**El middleware no es la única defensa:** `middleware.ts` solo protege *páginas*. Cada handler de `/api/admin/**` debe llamar a `getAdminSession()` por su cuenta.

⚠️ **Dos runtimes, un solo `lib/auth.ts`.** `middleware.ts` corre en **Edge** y solo puede importar `signAdminToken`/`verifyAdminToken`/`ADMIN_SESSION_COOKIE`; nunca `getAdminSession()`, que depende de `next/headers` (Node). Para que ambos convivan sin que el bundler de Edge arrastre un import de Node, `getAdminSession()` importa `next/headers` de forma **dinámica** dentro de su propio cuerpo, así no puede quedar atrapado en el grafo estático del bundle del middleware.

**Route group `(protected)`.** Agrupa las páginas con el shell autenticado; `app/admin/login/page.tsx` queda **fuera**. Los paréntesis no aparecen en la URL. Esto arregló un bug real: `/admin/login` heredaba el layout autenticado y mostraba el nav y el botón de cerrar sesión **antes de que hubiera sesión**, con un `<main>` anidado dentro de otro. Next.js aplica un layout a *todas* las rutas anidadas, sin excepción automática para páginas públicas.

### Franjas de admin (`TimeBlock`)

**El formulario pide fecha de inicio y fecha de fin por separado, no un solo día.** A diferencia del wizard público (una reserva siempre cabe en un día), una franja de admin puede abarcar varios. Por eso `TimeBlockForm.tsx` no reutiliza las reglas de grilla — solo valida que `endsAt` sea posterior a `startsAt`. Consecuencia: `TimeBlockCard.tsx` no puede usar `formatRange()` (asume un solo día) y cae a `formatBlockRange()` local cuando el rango cruza medianoche.

**El chequeo de conflicto distingue franja por sala de franja global:** si `roomId` tiene valor, la búsqueda se filtra a esa sala; si es `null`, no se filtra — una franja global choca con una reserva de *cualquier* sala. Solo `BLOCKED` dispara el chequeo: `WARNING` es reservable por definición.

### Pantallas de estado (error, 404, carga)

`app/not-found.tsx`, `error.tsx`, `loading.tsx` y `global-error.tsx`, en voz de marca. Reutilizan `EmptyState` y el shell público en vez de inventar composiciones nuevas.

- **`EmptyState` tiene `nivelTitulo`** (`"h1" | "h3"`, por defecto `"h3"`). El 404 y el error **son** la página, así que su título es el `h1`. El tamaño visual no cambia — lo pide la semántica, no el diseño.
- **Ningún botón de estas pantallas es `variante="accent"`.** `EmptyState` ya trae su arco naranja, el único elemento naranja que admite la vista.
- ⚠️ **`global-error.tsx` usa estilos en línea con hex escritos a mano**, rompiendo a propósito la regla de "ningún hex suelto". Es la pantalla del fallo del layout raíz, y ese layout es justo quien aplica las variables de `next/font` e importa `globals.css`: depender de esa cadena para dibujar su propio fallo es frágil. Por lo mismo no importa ningún componente del proyecto.
- **`app/admin/(protected)/loading.tsx` es una guarda, no un arreglo.** Hoy no llega a dispararse (las páginas del panel son Client Components y nada suspende en el servidor), pero si una pasara a Server Component, el boundary de la raíz mostraría la cabecera y el pie **públicos** dentro del panel.
- ⚠️ **`error.tsx` y `global-error.tsx` no se pueden verificar con `npm run dev`**: el overlay de desarrollo los tapa. Hay que usar `npm run build && npm run start`. Para provocar el error basta una `DATABASE_URL` inalcanzable; para el fallo total, un `throw` en el layout **detrás de una variable de entorno** (uno incondicional rompe el propio build al prerenderizar).
- `/reserva/[codigo]` **no** usa `notFound()` a propósito: responde `200` con su propio `EmptyState`, que además avisa de la confusión entre S/5 y Z/2 al leer un código. Un 404 genérico no puede dar ese consejo.

---

## FullCalendar: tres trampas que costaron análisis

### 1. El truco de zona horaria

`RoomCalendar` configura FullCalendar con `timeZone="UTC"` y le pasa cadenas ISO **sin sufijo de zona** que ya representan hora de Bogotá (`toBogotaWallClockIso()`). Así el calendario se ve igual sin importar la zona del navegador — la alternativa delegaría la corrección en el dispositivo del visitante.

Contrapartida: los `Date` que FullCalendar construye internamente traen los campos de Bogotá metidos en los *getters* UTC. `src/lib/fullcalendar.ts` deshace el truco para recuperar el instante real. **No usar esas funciones fuera del límite con FullCalendar** — son un adaptador de un solo sentido, no utilidades de fecha.

Por lo mismo, el prop `now` se sobrescribe: sin eso, el indicador de hora actual usaría la hora real del sistema, desalineada 5 h de la grilla.

### 2. AVISO va de fondo, no en primer plano

El calendario es clicable y abre `/reservar?startsAt=` al tocar una franja libre. Por eso los `TimeBlock` de tipo `WARNING` —que **sí** son reservables— se renderizan como evento de **fondo**: un evento de fondo no intercepta el clic, así que `dateClick` sigue disparando con la media hora exacta que se tocó. Si fuera de primer plano, `eventClick` solo entregaría el rango completo del bloque, que puede durar horas.

⚠️ Un evento de fondo **no tiene** el wrapper `.fc-event-main` de los de primer plano: el contenido se inserta directo en `.fc-bg-event`. El tinte va en `background-color` con alpha, **nunca** en `opacity` — `opacity` en ese nodo atenuaría también el icono y el texto, que viven ahí mismo. Verificado leyendo `@fullcalendar/core/internal-common.js`, no asumido por la documentación.

⚠️ `renderEventContent` necesita un guard (`if (!tipo) return null`). Los eventos de festivo no llevan `extendedProps.tipo`; el código original hacía un *cast* en vez de comprobar, así que `<Icono />` con un tipo de componente `undefined` **tronaba React** en cualquier semana con festivo. TypeScript no lo vio porque el `as` se lo ocultaba.

### 3. El bucle infinito de `datesSet`

Reproducido en un navegador real con Playwright, tras dos diagnósticos previos equivocados.

**Causa raíz:** cada `setState` hace que `<FullCalendar>` reciba props nuevas. El wrapper de `@fullcalendar/react` llama `calendar.resetOptions(this.props)` en **cada** `componentDidUpdate`, pasando un objeto recién creado por React en cada render. La memoización interna de `@fullcalendar/core` compara **por referencia** contra ese objeto, así que falla siempre, reconstruye el `dateProfile` y dispara `datesSet` de nuevo **para el mismo rango visible**. Eso relanza el fetch → nuevo `setState` → nuevo `resetOptions()`… Sin el fix, `/api/availability` disparaba pares de peticiones cada ~150 ms indefinidamente.

**Arreglo, en dos capas que se complementan:**

- `ultimoRangoRef` guarda el último rango pedido. `handleDatesSet` ignora un `datesSet` cuyo rango sea idéntico, antes de crear siquiera el `AbortController`. Esto corta el ciclo en su origen.
- El `AbortController` por componente sigue haciendo falta para navegación real solapada: cada pedido nuevo aborta el anterior, y el `finally` solo apaga el spinner si sigue siendo el más reciente.

⚠️ **El rango se marca al empezar la petición, pero se desmarca si esa petición falla o se aborta.** Las dos mitades arreglan síntomas distintos: *marcar al empezar* evita que un `datesSet` espurio dispare un segundo fetch mientras el primero sigue en vuelo; *desmarcar si falla* evita que un rango quede bloqueado para siempre sin datos (en desarrollo React monta cada componente dos veces y el `useEffect` de limpieza aborta el primer intento — ese era el síntoma "la primera carga no trae las franjas hasta que cambio de semana y vuelvo").

> **`/` y `/reservar` deben seguir con `force-dynamic`.** No son candidatos a ISR aunque `Room` cambie poco, porque `ci.yml` construye con credenciales de base de datos falsas e ISR exige generar la página en build time — rompería el CI por la trampa de pre-renderizado de más abajo.

---

## Trampas que ya costaron análisis

### 1. Dos URLs de base de datos, y el pooler es intermitente

`DATABASE_URL` = pooler puerto **6543** con `?pgbouncer=true&connection_limit=N` (runtime). `DIRECT_URL` = puerto **5432**, solo para migraciones (PgBouncer en modo transacción no soporta DDL). Ambas declaradas en el bloque `datasource`. Omitirlo produce *"prepared statement already exists"* o agotamiento de conexiones, y típicamente **solo después de desplegar**.

⚠️ **El puerto 6543 falla de forma intermitente desde las herramientas de este agente** — acepta TCP pero a veces no completa el handshake de Postgres; **desde la terminal del usuario funciona siempre**. Distinguir los dos errores importa: *"Can't reach database server"* es el fallo de handshake del agente; `P2024` solo puede ocurrir con la conexión ya establecida, y significa saturación del pool.

Cuando falla, correr con la URL directa como override **solo de terminal, nunca escrito al `.env`**:

```bash
DIRECT_URL=$(grep '^DIRECT_URL=' .env | cut -d'"' -f2) && DATABASE_URL="$DIRECT_URL" npm run dev
```

⚠️ **`connection_limit=1` prohíbe `Promise.all` de varias consultas Prisma fuera de una `$transaction`.** Cada llamada intenta adquirir su propia conexión; con el límite en 1, lanzarlas a la vez las hace competir en vez de esperar turno y agota el `pool_timeout`. Dentro de `prisma.$transaction` sí es seguro, porque `tx` reutiliza la conexión ya reservada. **Fuera de una transacción, las consultas van secuenciales, sin excepción** — ya pasó: "paralelizar para ganar velocidad" en `GET /api/availability` causó un `P2024`.

En Vercel `connection_limit=1` es lo correcto. En el `.env` **local únicamente** puede subirse a 5.

### 2. Un advisory lock huérfano bloquea toda migración futura

`prisma migrate dev` falló 6 veces seguidas alternando `P1002` y `P1001`. **La causa no era la red:** un `migrate dev --create-only` anterior había abortado en un entorno no interactivo, dejando una sesión **`idle`** con `SELECT pg_advisory_lock(...)` todavía tomado. Postgres no libera un advisory lock hasta que la sesión que lo pidió se cierra.

**Si `migrate dev` falla con `P1002` de forma persistente, sospechar de esto antes que de la red:** buscar en `pg_stat_activity` (por `DIRECT_URL`) una fila `idle` cuya `query` sea ese lock, y liberarla con `pg_terminate_backend()`. **Confirmar con el usuario antes de ejecutarlo** — es una acción sobre la base compartida.

### 3. El servidor corre en UTC, no en hora de Colombia

Todo se almacena en UTC y se presenta en `America/Bogota`. **Nunca `new Date("2026-08-01 08:00")` sin zona explícita.** Un desfase de 5 h aparece en la anticipación mínima y en el horario de atención, y funciona bien en local antes de fallar en producción.

### 4. Pre-renderizado silencioso en build time

**Un Route Handler `GET` o un Server Component que no lea `request`, `searchParams`, `cookies()` ni `headers()` se pre-renderiza durante `next build`.** Si consulta la base de datos, el build queda acoplado a que la BD esté disponible — y en CI, a las credenciales falsas de `ci.yml`. Pasó dos veces. Necesitan `export const dynamic = "force-dynamic";` explícito. Los que leen `request.nextUrl` salen dinámicos solos, pero **revisar cada página o handler nuevo que toque la base de datos**.

### 5. Row-Level Security: obligatorio en toda tabla nueva

Supabase expone automáticamente **todas** las tablas de `public` vía su API REST, protegidas únicamente por RLS — sin relación con si el código usa esa API (esta no la usa: solo Prisma). Sin RLS, cualquiera con la URL del proyecto y la llave `anon` (pública por diseño) podía leer o borrar `Reservation` entera: nombre, documento, correo. Supabase lo detectó y envió una alerta.

Corregido con `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` sobre las cuatro tablas. **Es seguro porque se verificó primero:** Prisma se conecta como el rol `postgres`, que tiene `rolbypassrls = true` e **ignora RLS por completo**. Habilitar RLS sin políticas bloquea el canal REST sin afectar a la app.

⚠️ **Toda tabla nueva necesita su propio `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` en su migración.** Prisma no lo hace por defecto ni lo deriva de `schema.prisma`. Si algún día se introduce `@supabase/supabase-js` del lado del cliente, ahí sí harán falta políticas reales.

### 6. Otras

- **Nodemailer no corre en Edge Runtime.** Los handlers que envían correo necesitan `export const runtime = "nodejs"`.
- **`"postinstall": "prisma generate"`** en `package.json`: Vercel cachea `node_modules` y sin esto el build falla con errores de tipos confusos tras cambiar el schema.
- **Supabase free pausa el proyecto tras 7 días sin actividad.** Verificar que esté despierto antes de cualquier demostración.
- **`NEXT_PUBLIC_APP_URL` es lo que codifica el QR** y la base de `metadataBase`. Un valor incorrecto rompe la función principal y deja el enlace compartido sin vista previa.
- **La lista de festivos puede cambiar por ley a mitad de año.** La **Ley 2578 de 2026** creó el festivo de la Virgen de Chiquinquirá; son **19**, no 18. Al añadir un año no basta con calcular Pascua y aplicar la Ley Emiliani: hay que comprobar si se creó alguno nuevo. `holidays.ts` emite `console.warn` si falta el año en curso.
- **`z.coerce.number()` sobre un campo opcional vacío.** Un `<input type="number">` sin valor llega como `""`, y `Number("")` da **`0`, no `NaN`** — sin un `z.preprocess` que convierta `""` a `undefined`, dejar el campo en blanco falla la validación de "mayor que cero" en vez de aceptarse vacío.

---

## Capa de UI: convenciones establecidas

- **Props en español** (`variante`, `tamano`, `tono`, `cargando`, `ayuda`, `opcional`), igual que el resto del producto.
- **`cn()` de [src/lib/utils.ts](src/lib/utils.ts)** para componer clases. Usa `extendTailwindMerge` declarando nuestra escala tipográfica: sin esa extensión, tailwind-merge clasificaría `text-h1` como color de texto y descartaría una de dos clases en silencio. **Si añades un tamaño a `fontSize` en `tailwind.config.ts`, añádelo también ahí.**
- **[Field](src/components/ui/Field.tsx) cablea la accesibilidad por contexto**: genera el id, lo enlaza al `<label>` y apunta `aria-describedby` a ayuda y error, y pone `aria-invalid`. `Input`, `Textarea` y `Select` lo consumen con `useFieldControl()`. Envolver siempre los controles en `Field`, así el enlace no se puede olvidar.
- **`Checkbox` es la excepción**: no usa `Field` porque su layout es distinto; trae su propia etiqueta, error e id.
- **`Dialog`** es siempre controlado desde fuera (`open`/`onOpenChange`), sin `Trigger` propio, porque cada sitio de uso ya decide cuándo abrirlo.
- **Los tokens viven en dos sitios** que hay que mantener sincronizados: el bloque `:root` de [globals.css](src/app/globals.css) (para CSS crudo: FullCalendar, plantillas de correo) y `tailwind.config.ts` (para las utilidades). Los componentes usan solo las utilidades.
- **El `<Toaster/>` de sonner ya está en el layout raíz**; para notificar, `import { toast } from "sonner"`.

---

## Accesibilidad

Auditada con **axe-core sobre el build de producción** (no en `dev`) más recorridos de teclado con Playwright: 12 pantallas incluidas las del panel con sesión real, los tres pasos del wizard, el formulario con errores visibles, el diálogo abierto y una semana **con festivo** — esta última importa, porque la etiqueta "Festivo" tiene su propio color y una semana cualquiera no la muestra.

**El azul y el naranja de marca no valen como texto pequeño.** Ni `#007B99` ni `#C77700` llegan a 4.5:1 sobre nuestras superficies claras. Por eso hay dos tokens aparte, `--azul-texto` (`#00647D`) y `--naranja-texto` (`#9A5C00`), y una regla de una línea: **color de fondo, icono o borde → el token de marca; color de texto → el token `-texto`.** Los colores de marca no se tocaron.

**`--texto-secundario` ya no es el gris de marca.** `#848585` se queda en `--color-gris` para gráficos, pero como texto daba 3.70 sobre blanco y 3.39 sobre `--superficie`. El neutral de texto es `#6F7070`, el más claro que pasa AA sobre ambos fondos conservando el matiz. Está replicado en `lib/mail/templates.ts`, que copia los tokens en hex porque un cliente de correo no resuelve variables CSS.

**El hover del acento aclara en vez de oscurecer** (`#E08600`). Sobre naranja el texto va oscuro, así que oscurecer el fondo acerca los dos y hunde el contraste — con `#C77700` el botón principal caía a 3.92 al pasar el ratón.

⚠️ **`.fc .fc-button { box-shadow: none !important }` borraba el anillo de foco global.** Tailwind dibuja `ring-*` con `box-shadow`, así que ese reset dejaba las flechas de navegación como los dos únicos controles de la app que se podían enfocar sin que se viera nada. Repuesto con `outline` en `:focus-visible`, no con box-shadow, para no depender de ganarle el `!important`.

⚠️ **FullCalendar dibuja las flechas como `<span role="img">` sin nombre**, y no hay opción para cambiarlo. `RoomCalendar` lo corrige sobre el DOM montado (`aria-hidden` en el icono, `title` → `aria-label` en el botón) con un `MutationObserver`, porque la barra se vuelve a dibujar al cambiar de vista.

⚠️ **`Dialog` restaura el foco por su cuenta.** Radix lo trae de serie, pero aquí no ocurría: al cerrar, el foco caía en `<body>` aunque el botón que abrió el diálogo siguiera en el DOM (comprobado marcando ese nodo). El componente anota el último elemento enfocado **fuera** de un diálogo y lo restaura en `onCloseAutoFocus`. No sirve leerlo al abrir: los efectos de Radix son hijos y ya movieron el foco antes.

**La rejilla del calendario no es operable por teclado** y se acepta así: FullCalendar no hace focusables las celdas. No incumple WCAG 2.1.1 porque existe el camino equivalente —"Reservar espacio" → wizard, completamente navegable—. Si algún día el wizard dejara de cubrir ese caso, esto pasaría a ser un incumplimiento.

---

## Identidad visual

Los tokens del documento de marca se copian a `globals.css` y se mapean en `tailwind.config.ts`. **Ningún hex suelto en componentes.**

Jerarquía: azul estructura · blanco respira · naranja señala **una sola cosa** por vista · gris acompaña. Un solo gesto gráfico protagonista por pantalla. Texto sobre naranja `#F39200` siempre `#2E2E2E`, nunca blanco. Fuentes vía `next/font/google`: Montserrat (display) + Inter (cuerpo); las oficiales son comerciales y no se incrustan sin licencia.

Copy en voz de marca: cercana, activa, sentence case; los botones dicen qué hacen; los errores explican qué pasó y cómo resolverlo, sin dramatismo.

Los estados del calendario llevan **refuerzo no cromático** además del color (etiqueta, borde punteado, rayado diagonal, icono) por daltonismo — la tabla está en el §8 del plan.

**Grid del calendario:** token `--borde-calendario` en `globals.css` y **solo** ahí, no en `tailwind.config.ts`, porque es exclusivo de `--fc-border-color` y ningún componente lo usa como utilidad — no aplica la regla de espejar ambos archivos.

### Los dos logos, y por qué no son intercambiables

| Fichero | Qué es | Alfa | Para qué |
|---------|--------|------|----------|
| `logo-uclam.png` | horizontal, 427×118 | **No** — fondo blanco horneado | cabecera, pie, tarjeta de Open Graph |
| `logo-uclam-escudo.png` | escudo, 78×118 | **Sí** | iconos de pestaña y de iOS |

Que el horizontal **no** tenga transparencia está confirmado inspeccionando los chunks del PNG, no asumido. Por eso sobre superficies azules se envuelve en una tarjeta blanca: así el recorte se lee como decisión de diseño y no como un accidente de exportación. El escudo sí la tiene, y por eso es el que sirve como favicon.

`src/app/icon.png`, `apple-icon.png` y `opengraph-image.png` (+ su `.alt.txt`) los **enlaza Next.js solo, por convención de nombre**, sin tocar `layout.tsx`. Se generan con [scripts/generar-imagenes-marca.mjs](scripts/generar-imagenes-marca.mjs), que necesita Playwright con `--no-save`. Es `.mjs` a propósito: `tsconfig.json` incluye `**/*.ts`, así que un `.ts` importando `playwright` rompería el typecheck en CI.

⚠️ **`metadataBase` en `layout.tsx` es lo que hace que el Open Graph funcione.** Sin él, Next resuelve la URL de la imagen contra `localhost:3000` y ningún servicio externo puede descargarla.

**QR imprimible (`/admin/qr`):** `QRCodeSVG` apuntando a `NEXT_PUBLIC_APP_URL`, con formato de impresión (`print:` de Tailwind oculta la barra del panel; `@page { size: letter }` en `globals.css`). Se probó incrustar el logo *dentro* del QR, pero a 40×40 px se veía borroso y era redundante con el que ya está encima; al quitarlo, el nivel de corrección de errores pudo bajar de `H` a `M`.

---

## Privacidad

`GET /api/availability` es público y **nunca** devuelve datos personales: solo `startsAt`, `endsAt` y `status`. `GET /api/reservations/[code]` tampoco expone documento ni correo completo. El `.env` nunca se commitea; sí `.env.example`.

---

## Stack: versiones fijadas a propósito

Next `14.2.35` + React `18.3.1` + Tailwind `3.4.14`, sin `^` en `package.json`. **No actualizar a Next 15/16, React 19 ni Tailwind v4**: la elección es por madurez de documentación, no por descuido. Tampoco usar `shadcn/ui` (su CLI asume Tailwind v4) ni Turbopack.

Supabase se usa **solo como PostgreSQL alojado** — nada de su SDK, Auth ni Storage. El acceso a datos es Prisma `5.22.0`.

Cuatro paquetes están por encima de lo que pedía el plan **por advisories de seguridad**, no por capricho: `next` (14.2.18 arrastraba el *Authorization Bypass in Middleware*, que es exactamente el mecanismo que protege `/admin/**`), `nodemailer` (4 advisories afectan a todo `>=6.5.0`; el parche solo existe en 9.x), `@types/nodemailer` y `postcss`. Ninguna API que usamos cambió.

**Postura frente a `npm audit`: nunca quedará en cero, y no hay que perseguirlo.** Lo que queda son (a) la cadena de ESLint, dev-only, y (b) advisories de Next cuyo único "fix" es saltar a Next 16 — aplican a Server Actions, `next/image` remoto, rewrites e i18n de Pages Router, superficies que esta aplicación no tiene. **Antes de reaccionar a un audit, comprobar si la superficie afectada existe aquí.**

**Las skills de agente no se versionan.** `.claude/skills/` y `.agents/skills/` están en `.gitignore`; lo versionado es `skills-lock.json`, que guarda de qué repo y con qué hash viene cada una. El árbol de ficheros es caché reinstalable, y además estaba duplicado: en esta máquina `.claude/skills/` son junctions hacia `.agents/skills/`, pero git no los sigue como enlaces y guardaba las dos copias.

---

## Entorno local

Node **20.20.2** vía nvm-windows, para paridad con Vercel (`engines: 20.x`, `.nvmrc`).

⚠️ **`nvm use` falla en esta máquina** porque `NVM_HOME` contiene un espacio y el `elevate.cmd` de nvm-windows no entrecomilla la ruta. El enlace `C:\nvm4w\nodejs` se creó a mano con `mklink /D` elevado; para cambiar de versión hay que repetir esa operación, o reinstalar nvm en una ruta sin espacios. **Esto va a doler en la migración a Node 22** (ver `BACKLOG.md`). Una terminal nueva resuelve `node` sin problema.

---

## Despliegue (Vercel)

Proyecto `reservas-laboratorio-ueda` en la cuenta `juanalzate82212`. **Production Branch = `main`**; los PR generan despliegues de vista previa. Las 12 variables de entorno están cargadas en Production y Preview. `DATABASE_URL` en Vercel usa `connection_limit=1`.

- ⚠️ **El primer `vercel deploy` de un proyecto se asigna a producción SIEMPRE**, aunque no se pase `--prod`. Pasó de verdad: se corrió sin la bandera solo para inspeccionar el log y publicó el contenido local directo a la URL pública. **Nunca desplegar desde local para "arreglar" un despliegue que falta.**
- **Vercel toma la rama por defecto del repo como Production Branch.** Como aquí es `develop`, quedó mal por defecto y hubo que corregirlo a mano en Settings → Git: la CLI no expone esa opción.
- **`vercel env add --value` se cuelga indefinidamente con valores que contienen `<` o `>`** (le pasó a `MAIL_FROM`). Pasar el valor por stdin.
- **No hay dropdown de versión de Node en el dashboard.** Vercel respeta `engines.node` de `package.json` directamente.
- Los despliegues de vista previa están **detrás del muro de autenticación de Vercel**: `curl` a esa URL devuelve la página de login, no la app. Para verificar hay que usar producción o un build local.

---

## Disciplina de trabajo

- **`npm run build` debe pasar limpio** antes de dar por cerrado cualquier trabajo. No acumular deuda de tipos.
- **Si una decisión de producto no está resuelta, preguntar en vez de inventar.**
- El usuario pide **explicar el trabajo antes de construirlo** y un **resumen al terminarlo**: qué se construyó, qué archivos, en qué estado queda la app.
- **No fusionar ningún PR sin confirmación explícita.**
- **No afirmar que algo se probó si no se probó.** Ya pasó una vez que un mensaje de commit afirmaba una verificación que no se había hecho; se corrigió haciendo la prueba de verdad antes de dejar el commit.
