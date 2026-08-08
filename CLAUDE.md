# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

Este archivo es la **fuente de verdad del estado actual y de las decisiones tomadas**. El plan original ([PLAN-MVP.md](PLAN-MVP.md)) es el contrato de alcance y reglas de negocio, pero donde ambos difieran, manda este archivo: recoge lo que realmente se construyó.

---

## Qué es esto

Sistema de reserva del **Laboratorio de Analítica de Datos e Inteligencia Artificial** de la Universidad Católica Luis Amigó. El público llega por un código QR → ve la disponibilidad en un calendario → solicita una franja. Un único administrador (una contraseña, sin sistema de usuarios) aprueba, rechaza o cancela solicitudes y gestiona bloqueos de horario. Todo el texto visible va en español.

**Hay una sola sala reservable: "Sala Principal".** Ver "Decisiones de producto" más abajo.

**En producción:** https://reservas-laboratorio-ueda.vercel.app

### Los dos nombres, que no son lo mismo

Se confundieron una vez y costó dos rondas de correcciones:

- **Laboratorio de Analítica de Datos e Inteligencia Artificial** = el espacio físico que se reserva. Aparece en toda la app (páginas, correos, metadata, QR).
- **Unidad de Estrategia del Dato y Analítica** = la unidad organizativa que administra el espacio y desarrolló esta aplicación. Aparece **una sola vez**: en el crédito de desarrollo del pie de página (`Footer.tsx`).

Regla mnemotécnica: **laboratorio = el lugar; Unidad = quién construyó la herramienta.**

---

## Estado actual

| Fase | Estado |
|------|--------|
| 0 — Infraestructura y andamiaje | ✅ Completa |
| 1 — Modelo de datos y semilla | ✅ Completa |
| 2 — API de lectura | ✅ Completa |
| 3 — Landing pública con calendario | ✅ Completa |
| 4 — Flujo de solicitud de reserva | ✅ Completa |
| 5 — Autenticación y shell del admin | ✅ Completa |
| 6 — Bandeja de solicitudes | ✅ Completa |
| 7 — Correos automáticos | ✅ Completa (SMTP real verificado) |
| 8 — Gestión de franjas | ✅ Completa |
| 9 — Despliegue en Vercel | ✅ Completa (en producción, verificada) |
| 10 — QR, pulido y cierre | 🟡 Parcial |

De la Fase 10 están hechos el QR imprimible (`/admin/qr`), el `title`/`description` del layout raíz, el `README.md` y el `npm run build` limpio. El punto 8 (dataset de demostración) quedó **anulado a propósito** — ver "Datos" más abajo.

> **[BACKLOG.md](BACKLOG.md) es la única lista de lo que falta**, tanto de la Fase 10 como de los ajustes pedidos después del despliegue. **No repetir ese estado aquí**: eran dos listas con numeraciones distintas y se desincronizan. Este archivo guarda las *decisiones y sus porqués*; el backlog guarda las *tareas abiertas*.

**Verificación de que la app funciona en producción** (hecha con peticiones reales, no solo comprobando que cargue): landing, `/reservar` y `/admin/login` responden `200`; `/admin` y `/admin/qr` sin sesión redirigen (`307`); `POST /api/admin/login` devuelve una cookie de sesión que efectivamente autoriza `GET /admin`, `GET /admin/qr` y `GET /api/admin/reservations`.

---

## ⚠️ Datos: hay UNA sola base de datos

**Local y producción apuntan al mismo proyecto de Supabase.** No existe una base de desarrollo separada. El `.env` local y las variables de entorno de Vercel llevan la misma cadena de conexión.

Consecuencias que hay que tener presentes siempre:

1. **Cualquier escritura desde la máquina local afecta producción.** No hay red de seguridad.
2. **`npx prisma db seed` BORRA `Reservation` y `TimeBlock` completos** antes de recrear datos de demo. Ejecutarlo "para probar en local" destruiría datos reales.
3. **El guard de `prisma/seed.ts` NO protege contra esto.** Comprueba `process.env.NODE_ENV === "production"`, que en una terminal local vale `"development"` o nada — aunque `DATABASE_URL` apunte a la base real. El guard solo evitaría correr la semilla *dentro* de un entorno de producción, no *contra* la base de producción.

**Antes de ejecutar cualquier cosa que escriba en la base, mirar primero qué hay.** Ya hubo un incidente cercano: se detectaron filas de `EmailLog` desconocidas que resultaron ser pruebas que el usuario estaba haciendo en paralelo contra la app en vivo.

**Estado de los datos hoy:** el usuario borró los datos de demo a propósito para dejar la app lista para uso real. Queda 1 reserva `PENDING` suya, de prueba. Por eso el punto 8 de la Fase 10 ("dataset de demostración poblado") quedó anulado: contradice lo que el usuario quiere. **No resembrar sin pedirlo.**

---

## Documentos que gobiernan el trabajo

Ambos son de cumplimiento obligatorio y tienen prioridad sobre criterios propios:

- **[PLAN-MVP.md](PLAN-MVP.md)** — alcance, stack con versiones exactas, modelo de datos, reglas de negocio, contratos de API y las 10 fases con sus criterios de aceptación. **Leer antes de escribir código.** Está anotado con tachados donde una decisión posterior lo cambió.
- **[identidad-visual-ucla-ui-ux.md](identidad-visual-ucla-ui-ux.md)** — tokens de color/tipografía/espaciado, reglas de logo, mapeo a componentes y voz de redacción.

Regla operativa: no implementar nada listado como fuera de alcance (§1.2 del plan). Si aparece la tentación, anotarla en `BACKLOG.md` y seguir.

---

## Comandos

```bash
npm run dev                  # desarrollo
npm run build                # debe pasar limpio al cerrar cada fase
npm run lint
npm run typecheck
npm run check:datetime       # casos límite de fecha/hora (no está en CI)

npx prisma migrate dev       # crear y aplicar migración en desarrollo
npx prisma migrate deploy    # aplicar migraciones ya creadas
npx prisma generate          # regenerar cliente tras cambiar el schema
npx prisma studio            # inspector de BD — el verificador principal del MVP
npx prisma db seed           # ⚠️ DESTRUCTIVO: ver la sección de Datos
```

**No hay framework de tests.** La verificación es por criterios de aceptación por fase: `prisma studio`, `curl` contra los Route Handlers, y `scripts/check-datetime.ts` para la capa horaria. Para bugs de interfaz, Playwright instalado temporalmente (`npm install --no-save playwright`) ha sido efectivo — revertir `package-lock.json` después.

**Antes de cerrar una fase, correr también `npm run check:datetime`** — el CI no lo incluye porque no necesita base de datos, pero es la red de seguridad de la capa horaria.

---

## Git y GitHub

- `main` = producción. Cada push despliega a Vercel automáticamente.
- `develop` = rama por defecto e integración. Es donde apuntan los PR de trabajo.
- Cada unidad de trabajo va en su rama: `feat/fase-N-*`, `fix/*`, `chore/*`.
- Los rulesets bloquean push directo, force-push y borrado en `main` y `develop`.
- [ci.yml](.github/workflows/ci.yml) corre lint + typecheck + build; es el status check obligatorio. Los PR muestran además un check "Vercel" (despliegue de vista previa).

**Nunca fusionar un PR sin confirmación explícita del usuario.** Es una instrucción permanente suya, repetida en varias sesiones.

`gh pr checks <n>` a veces reporta "pending" cuando el job ya terminó; `gh run view --job=<id>` da una lectura más fiable.

---

## Decisiones de producto (desviaciones del plan original)

Todas pedidas explícitamente por el usuario después de escrito el plan. `PLAN-MVP.md` está anotado con tachados en los puntos afectados.

### Solo Sala Principal — se retiró Sala de Reuniones

Decisión de negocio, no limitación técnica. Alcance de lo que cambió:

- **El modelo `Room` NO se tocó.** Sigue siendo genérico, por si algún día se reactiva una segunda sala. Esto fue la recomendación explícita al usuario, y la razón de que esto fuera un cambio de UI + datos y no una migración.
- `prisma/seed.ts` ya no crea `sala-reuniones` y borra la fila si existe (tras vaciar `Reservation`/`TimeBlock`, para no violar la FK).
- `lib/rooms.ts` ganó `getActiveRoom()` (`rooms[0] ?? null`) junto al `getActiveRooms()` existente, que no cambió.
- **Wizard sin selector de sala:** `StepRoom.tsx` se eliminó; su selector de día se movió a `StepDateTime.tsx`. `ReservationWizard` recibe `room: ActiveRoom` (antes `rooms: ActiveRoom[]`) y fija `roomId` sin intervención del usuario. El Paso 1 se llama "Horario" (antes "Espacio y horario") y muestra el nombre de la sala en una tarjeta de solo lectura.
- **Landing sin grid:** `CalendarGrid.tsx` (2 columnas + plegado por sala) se eliminó, reemplazado por `RoomAvailability.tsx` — un wrapper mínimo cuyo único propósito es permitir `next/dynamic(..., { ssr: false })` desde un Server Component. El calendario va directo, a todo el ancho.
- **`TimeBlockForm.tsx` NO se tocó:** su dropdown de sala ya era genérico sobre `getActiveRooms()`; con una sola sala activa queda con dos opciones con sentido ("Todas las salas" / "Sala Principal").

### Rechazar y cancelar no piden motivo

El plan (§6) exigía `adminNote` obligatorio con un diálogo que forzaba a escribir el motivo. El usuario pidió lo contrario **antes** de construir la Fase 6: ambas acciones solo piden confirmación ("¿Estás seguro de…?").

- `PATCH /api/admin/reservations/[id]` no exige `adminNote` en ningún caso.
- El campo sigue en el modelo (nullable) por si se retoma; `ReservationDetail` lo muestra si tiene valor.
- **Consecuencia:** el correo de rechazo no puede citar una razón específica, porque ya no se recoge en ningún punto del flujo.

### El formulario ganó campos que el plan no contemplaba

Tras probar el wizard en el navegador, el usuario pidió:

- **`academicProgram`** (lista cerrada de 6 valores) y **`activityType`** (lista cerrada de 6, incluyendo `OTRO` con detalle libre en `activityTypeOther`), ambos obligatorios.
- **`responsibilityAccepted`** — checkbox que debe ser `true`, sobre el uso adecuado del laboratorio y los equipos.
- `attendees` pasó de opcional a obligatorio.
- El campo libre `purpose` se **eliminó** del modelo: lo reemplaza `activityType`, más útil para que el admin decida sin leer texto libre.

**El cargo es la excepción del archivo de opciones.** `REQUESTER_ROLES` existe igual que las otras dos listas, pero `Reservation.requesterRole` sigue siendo **`String`, no un enum de Prisma**. Es deliberado: el campo nació como texto libre y las filas anteriores guardan valores que no traducen a la lista ("Analista de Datos", y otros de prueba). Migrar obligaría a inventarles un mapeo o a perderlos, y no compraría nada — la única escritura pasa por Zod, que valida contra esa misma lista, y el canal REST de Supabase está cerrado por RLS. Por eso `labelForRequesterRole()` devuelve el valor crudo si no lo reconoce: así las reservas antiguas siguen legibles. Su "Otro", a diferencia del de `activityType`, **no** pide detalle.

⚠️ **Los `value` de `src/config/reservationOptions.ts` deben coincidir exactamente con los enums `AcademicProgram`/`ActivityType` de `prisma/schema.prisma`.** Están comentados cruzadamente en ambos archivos. Ese archivo es la única fuente: lo consumen el `<select>` de `StepRequester.tsx`, el `z.enum` de `lib/validation/reservation.ts` (que deriva la tupla del mismo array) y las etiquetas de `StepReview.tsx`.

### Marca y UI

- **Logo oficial** (riesgo R3 del plan, resuelto): el usuario entregó un PNG (nunca hubo SVG). `logo-uclam.png`, 427×118, **sin canal alfa** — confirmado inspeccionando los chunks del archivo, no asumido: sin `tRNS`, el fondo blanco está horneado. Por eso, sobre superficies azules (`variante="blanco"`) se envuelve en una tarjeta blanca (`bg-white px-2 py-1 shadow-card`): así el recorte se lee como decisión de diseño y no como un accidente de exportación.
- **Navbar público igual al del admin:** `Header.tsx` tiene `variante="azul"` por defecto (antes `"blanco"`). Bastó cambiar el default porque los tres call sites públicos usan `<Header />` sin prop.
- **Footer:** columna derecha con nombre del laboratorio → correo `mailto:` → link a la universidad, más una franja centrada con el año (`new Date().getFullYear()`) y el crédito a la Unidad.
- **Grid del calendario más oscuro:** token `--borde-calendario: #c7c7c7` en `globals.css`. Va **solo** ahí, no en `tailwind.config.ts`, porque es exclusivo de `--fc-border-color` y ningún componente lo usa como utilidad — no aplica la regla de espejar ambos archivos.

### QR imprimible (`/admin/qr`)

`QRCodeSVG` de `qrcode.react` apuntando a `NEXT_PUBLIC_APP_URL`, con el logo arriba, el texto "Escanea para reservar" y formato de impresión (`print:` de Tailwind oculta la barra del panel y el botón; `@page { size: letter; margin: 1in; }` en `globals.css`).

**Decisión de diseño:** se probó incrustar el logo *dentro* del QR (`imageSettings`), pero a 40×40 px dentro de un código de 280 px se veía borroso y era redundante con el logo que ya está encima de la tarjeta. Se quitó, y con eso el nivel de corrección de errores pudo bajar de `H` a `M` (ya no hace falta tolerar algo tapando el código).

---

## Arquitectura: lo que hay que entender de varios archivos a la vez

**Configuración como fuente única de reglas.** `src/config/booking.ts` (`BOOKING_CONFIG`) y `src/config/holidays.ts` (`HOLIDAYS_CO`) concentran horarios, granularidad, duraciones, límites y festivos. Ninguna regla de negocio se hardcodea en componentes ni handlers.

**El horario de atención absorbe los festivos.** `lib/datetime.ts` expone `getOpeningRangesFor(date)`, que devuelve `[]` para sábados, domingos y festivos. Todo lo demás —generación de slots, validación del servidor, pintado del calendario— consume esa función, así que cerrar un día no requiere lógica extra en ninguna capa. Los cierres excepcionales (mantenimiento, jornadas institucionales) no van aquí: los crea el admin como `TimeBlock` de tipo `BLOCKED`.

**Dos jornadas por día con receso 12:00–13:00.** Una reserva nunca puede cruzarlo: `fitsInSingleRange(start, end)` rechaza 11:00–14:00 aunque ambos extremos estén en horario.

**Zod compartido cliente/servidor.** Los esquemas de `lib/validation/` son la única definición de las reglas de campo; el cliente los usa vía `@hookform/resolvers`, el servidor los revalida siempre. El servidor no confía en el cliente ni cuando el formulario ya validó.

**Qué vive en Zod y qué en el Route Handler.** `lib/validation/reservation.ts` cubre lo que es función pura de los campos (formato, dominio del correo, duración, alineación a la grilla, receso, anticipación), reutilizando `lib/datetime.ts` en vez de reimplementar aritmética. Lo que necesita la base de datos —sala activa, solapamiento, bloqueos, límite de pendientes por correo— vive en `POST /api/reservations`, **dentro de la misma `prisma.$transaction` que crea el registro**: el §5 del plan exige que la comprobación de choque y la creación no vayan separadas.

**Disponibilidad.** `lib/availability.ts` implementa el solapamiento con exactamente `A.startsAt < B.endsAt && B.startsAt < A.endsAt` (09:00–10:00 y 10:00–11:00 **no** solapan). Las reservas `PENDING` **ocupan la franja** igual que las `CONFIRMED`.

**`EXPIRED` se aplica al leer, no con una tarea programada.** Una solicitud que nadie revisó y cuya franja ya terminó pasa a `EXPIRED`. Es el único estado que **no** decide el administrador, así que no hay ninguna acción de usuario donde colgarlo: `lib/expiration.ts` hace un `updateMany` idempotente (`status = PENDING AND endsAt < now()`) que se llama **antes** de las tres lecturas que importan — `GET /api/admin/reservations` (de donde cuelga también el contador del nav), `getPublicReservationByCode()` y el conteo de pendientes de `POST /api/reservations`.

Se descartó Vercel Cron porque **en plan Hobby solo permite una ejecución al día**: una solicitud vencida por la mañana seguiría mostrándose "En revisión" hasta la madrugada. Aplicándolo al leer, lo que se ve nunca está desfasado. `decidedAt` se deja en `null` a propósito — `EXPIRED` con `decidedAt` nulo significa exactamente "se venció sin que nadie la mirara".

**Es terminal:** `ALLOWED_FROM` en `PATCH /api/admin/reservations/[id]` solo admite origen `PENDING` o `CONFIRMED`, así que las tres acciones sobre una vencida devuelven `409 INVALID_TRANSITION` sin necesidad de código extra. Y **arregla un bug real**: el tope de `maxPendingPerEmail` filtra por `status: "PENDING"`, así que antes tres solicitudes vencidas sin revisar bloqueaban ese correo de forma permanente.

⚠️ `lib/availability.ts` declara su **propio** union `ReservationStatus` en vez de importar el de Prisma (para servir igual en cliente y servidor, y poder probarse con literales). No puede desincronizarse en silencio —los handlers pasan resultados de Prisma a `findConflicts()`, así que un estado nuevo que falte allí rompe la compilación— pero al añadir uno hay que tocar los dos sitios.

**Mutaciones = Route Handlers, no Server Actions.** Un solo patrón, para poder probar con `curl`. Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`.

**El correo nunca bloquea la transición de estado.** Orden en `PATCH /api/admin/reservations/[id]`: actualizar BD → intentar enviar → registrar en `EmailLog` (`SENT`/`FAILED`/`LOGGED`). Si el envío falla, la respuesta sigue siendo `200` con `{ emailStatus: "FAILED" }`. Igual en `POST /api/reservations/[code]/cancel`.

**Cancelación por el propio solicitante.** `POST /api/reservations/[code]/cancel` no lleva sesión: la llave son **código + número de documento**, dos datos que solo junta quien reservó. Detalles que importan:

- **El error es el mismo para "ese código no existe" y "ese documento no coincide".** Si fueran distintos, el endpoint diría si un código existe y volvería recorrible el espacio de códigos.
- **El acuse por correo al solicitante es parte de la seguridad**, no cortesía: el documento no es un secreto, así que si alguien cancelara sin permiso, el dueño se entera al momento. Usa `selfCancelTemplate` y **no** `cancelTemplate` — la redacción de esa última ("lamentamos informarte") es la de una cancelación que se sufre, no una que se decide.
- **Compare-and-set**: el estado va en el `WHERE` del `updateMany`, no solo en la comprobación previa. Si el admin decide entre una cosa y la otra, no se pisa su decisión.
- Se puede cancelar hasta que la reserva **empieza** (`startsAt > now`), estando `PENDING` o `CONFIRMED`. `EXPIRED` no, por terminal. La franja se libera sola: `CANCELLED` no está en `ESTADOS_QUE_OCUPAN`.
- No se distingue en la BD quién canceló (admin o solicitante); ambos dejan `CANCELLED` con `decidedAt`. Si algún día hace falta, es un campo nuevo.

**`MAIL_TO_ADMIN` para los avisos internos** (solicitud nueva, y cancelación hecha por el solicitante). Hoy vale lo mismo que `SMTP_USER` —el laboratorio se avisa a sí mismo— pero sigue siendo variable aparte a propósito: el día que los avisos deban ir a otra persona se cambia eso y no el remitente de todos los correos. `enviarCorreoAlLaboratorio()` devuelve `null` y avisa por consola si no está configurada, en vez de inventar un destinatario.

⚠️ **Las llamadas a correo van envueltas en `try/catch` en los handlers, además del que ya tiene el mailer.** `enviarCorreo()` atrapa los fallos de *envío* y los registra como `FAILED`, pero el `EmailLog.create` de su propio `catch` puede fallar y esa excepción sí escaparía — convirtiendo un `201`/`200` en `500` con la reserva ya escrita. En `POST /api/reservations` eso sería peor que ruido: el solicitante creería que no se envió y al reintentar chocaría con su propia franja.

**El enlace de Google Calendar del correo de confirmación usa el instante UTC real** (`fechaParaGoogleCalendar()` en `templates.ts`). **No** pasa por `toBogotaWallClockIso()`: ese truco es exclusivo del límite con FullCalendar y aquí metería 5 h de desfase en el calendario de quien pulse el botón. El separador `/` de `dates` va sin codificar, como en la documentación de Google; el resto de valores sí se codifican para URL y el enlace entero se escapa para el `href`.

**El formulario de `/reserva` funciona sin JavaScript**, y no por purismo: entre que la página pinta y que React hidrata hay una ventana en la que el `onSubmit` no está enlazado, y pulsar el botón hacía un envío nativo que recargaba la misma página **sin ir a ninguna parte** (detectado con Playwright, no por lectura). El `<form>` es un `GET` real hacia `/reserva`, que resuelve `?codigo=` en el servidor y redirige; el handler de cliente queda como mejora para ahorrarse el viaje.

**Dos patrones de datos distintos, a propósito.** `app/page.tsx` (landing) consulta Prisma directo: es Server Component y no necesita refrescarse tras una mutación. `app/admin/(protected)/page.tsx` (bandeja) es Client Component y llama a `GET /api/admin/reservations` desde el navegador, porque necesita revalidar tras cada `PATCH`, mantener filtros interactivos y mostrar toasts.

**Comunicación entre hermanos sin store global.** El contador de pendientes vive en `AdminNav` (dentro del layout), pero quien dispara los cambios es la página de la bandeja — hermanos en el árbol. En vez de Context o un store para un solo valor derivado, se usa un evento de `window` (`ADMIN_RESERVATIONS_CHANGED_EVENT` en `components/admin/adminEvents.ts`): la bandeja lo dispara tras cada `PATCH` exitoso, `AdminNav` lo escucha y vuelve a pedir el conteo.

### Autenticación del admin

JWT firmado con `jose` en cookie `admin_session` (httpOnly, 8 h). Sin NextAuth.

**El middleware no es la única defensa (regla explícita del plan):** `middleware.ts` solo protege *páginas*. Cada handler de `/api/admin/**` debe llamar a `getAdminSession()` por su cuenta.

**Dos runtimes, un solo `lib/auth.ts`.** `middleware.ts` corre en **Edge** y solo puede importar `signAdminToken`/`verifyAdminToken`/`ADMIN_SESSION_COOKIE`; nunca `getAdminSession()`, que depende de `next/headers` (Node). Para que ambos convivan en el mismo archivo sin que el bundler de Edge arrastre un import de Node, `getAdminSession()` importa `next/headers` de forma **dinámica** (`await import("next/headers")`) dentro de su propio cuerpo — así no puede quedar atrapado en el grafo estático del bundle del middleware, sea cual sea el comportamiento real de tree-shaking.

**Route group `(protected)`.** `app/admin/(protected)/` agrupa las páginas que llevan el shell autenticado (cabecera azul, `AdminNav`, botón "Salir"). `app/admin/login/page.tsx` queda **fuera** del grupo. Los paréntesis no aparecen en la URL: `/admin`, `/admin/franjas`, `/admin/correos`, `/admin/qr` siguen siendo las mismas rutas.

> Esto arregló un bug real que existía desde la Fase 5: `/admin/login` heredaba el layout autenticado y mostraba el nav y el botón de cerrar sesión **antes de que hubiera sesión**, con un `<main>` anidado dentro de otro (HTML inválido). Next.js App Router aplica un layout a *todas* las rutas anidadas, sin excepción automática para páginas públicas.

### Correos

**El HTML se escapa en origen Y se previsualiza en un `<iframe sandbox="">` — doble capa.** `requesterName`, `activityTypeOther` y `adminNote` los escribió alguien externo por el formulario público, y ese HTML no solo se manda por correo: se guarda tal cual en `EmailLog.body` y se vuelve a renderizar en `/admin/correos`, dentro de la sesión autenticada del admin. `lib/mail/templates.ts` escapa (`&<>"'`) todo valor interpolado; `EmailLogRow.tsx` además lo renderiza dentro de un `<iframe sandbox="">` sin ningún token (ni scripts, ni forms, ni same-origin) en vez de usar `dangerouslySetInnerHTML`.

**`lib/mail/mailer.ts` comprueba `SMTP_HOST` Y `SMTP_PASSWORD`**, no solo el host, para decidir el fallback a consola + `EmailLog` con estado `LOGGED`. El plan solo mencionaba el host; en la práctica el usuario ya tenía host/puerto/usuario configurados antes de tramitar la contraseña de aplicación, así que revisar solo el host habría intentado una conexión real sin credenciales y fallado con `FAILED` en vez de degradar limpiamente.

**Verificado contra Gmail real**, no solo simulado: los tres estados de `EmailLog` (`SENT`, `LOGGED` con contraseña vacía, `FAILED` con contraseña incorrecta — Gmail devolvió `535-5.7.8`, capturado en `EmailLog.error`, y la reserva quedó igual `CONFIRMED`), más `POST /api/admin/email-logs/[id]/retry` sobre un registro `LOGGED`, que pasó a `SENT`.

### Franjas de admin (`TimeBlock`)

**El formulario pide fecha de inicio y fecha de fin por separado, no un solo día.** A diferencia del wizard público (una reserva siempre cabe en un día, por `fitsInSingleRange`), una franja de admin puede abarcar varios días (ej. "semana de receso"). Por eso `TimeBlockForm.tsx` no reutiliza las reglas de grilla — solo valida que `endsAt` sea posterior a `startsAt`. Consecuencia: `TimeBlockCard.tsx` no puede usar `formatRange()` (asume un solo día) y cae a `formatBlockRange()` local cuando el rango cruza medianoche.

**El chequeo de conflicto distingue franja por sala de franja global:** si `roomId` tiene valor, la búsqueda de reservas en conflicto se filtra a esa sala; si es `null` ("todas las salas"), no se filtra — una franja global choca con una reserva de *cualquier* sala. Solo `BLOCKED` dispara el chequeo: `WARNING` es reservable por definición, así que no puede chocar con nada.

---

## FullCalendar: tres trampas que costaron análisis

### 1. El truco de zona horaria

`RoomCalendar` configura FullCalendar con `timeZone="UTC"` y le pasa cadenas ISO **sin sufijo de zona** que ya representan hora de Bogotá (`toBogotaWallClockIso()` en `lib/datetime.ts`). Así el calendario se ve igual sin importar la zona horaria del navegador — la alternativa (`timeZone="local"` con instantes UTC reales) delegaría la corrección en el dispositivo del visitante.

Contrapartida: los `Date` que FullCalendar construye internamente (`datesSet`, `dayHeaderClassNames`) traen los campos de Bogotá metidos en los *getters* UTC. `src/lib/fullcalendar.ts` (`fullCalendarDateToInstant`, `fullCalendarDayKey`) deshace el truco para recuperar el instante real. **No usar esas funciones fuera del límite con FullCalendar** — son un adaptador de un solo sentido, no utilidades de fecha.

Por lo mismo, el prop `now` se sobrescribe (`now={() => toBogotaWallClockIso(new Date())}`): sin eso, el indicador de hora actual usaría la hora real del sistema, desalineada 5 h de la grilla.

### 2. AVISO va de fondo, no en primer plano

El calendario es clicable (`dateClick`/`eventClick` de `@fullcalendar/interaction`) y abre `/reservar?startsAt=` al tocar una franja libre. Por eso los `TimeBlock` de tipo `WARNING` —que **sí** son reservables— se renderizan como evento de **fondo** (`display: "background"`): un evento de fondo no intercepta el clic, así que `dateClick` sigue disparando con la media hora exacta que se tocó. Si `AVISO` fuera de primer plano, `eventClick` solo entregaría el rango completo del `TimeBlock`, que puede durar horas.

⚠️ Un evento de fondo **no tiene** el wrapper `.fc-event-main` que sí tienen los de primer plano: el contenido de `eventContent` se inserta directo en `.fc-bg-event`. El tinte de color va en `background-color` con alpha, **nunca** en `opacity` — `opacity` en ese nodo atenuaría también el icono y el texto, que viven ahí mismo. Verificado leyendo `@fullcalendar/core/internal-common.js`, no asumido por la documentación.

⚠️ `renderEventContent` necesita un guard (`if (!tipo) return null`). Los eventos de festivo no llevan `extendedProps.tipo`; el código original hacía un *cast* (`as EventoTipo`) en vez de comprobar, así que `ICONOS[undefined]` daba `undefined` y `<Icono />` con un tipo de componente `undefined` hacía **truena React** en cualquier semana con festivo. TypeScript no lo vio porque el `as` se lo ocultaba.

### 3. El bucle infinito de `datesSet` (bug real, tres síntomas)

Reproducido en un navegador real con Playwright, tras dos diagnósticos previos equivocados.

**Causa raíz:** cada `setState` de `RoomCalendar` hace que `<FullCalendar>` reciba props nuevas. El wrapper de `@fullcalendar/react` llama `calendar.resetOptions(this.props)` en **cada** `componentDidUpdate`, pasando un objeto de opciones recién creado por React en cada render — nunca el mismo por referencia. La memoización interna de `@fullcalendar/core` para el generador de rango de fechas compara **por referencia** contra ese objeto, así que falla siempre, reconstruye el `dateProfile` desde cero y dispara `datesSet` de nuevo **para el mismo rango visible**, sin que el usuario haya navegado. Eso relanza el fetch → nuevo `setState` → nuevo `resetOptions()`… un ciclo que no se detiene solo. Sin el fix, `/api/availability` disparaba pares de peticiones cada ~150 ms indefinidamente; tan agresivo que `page.goto(..., { waitUntil: "networkidle" })` hacía *timeout* a los 30 s.

**Arreglo, en dos capas que se complementan:**

- `ultimoRangoRef` guarda el último rango pedido (en epoch ms). `handleDatesSet` ignora un `datesSet` cuyo rango sea idéntico, antes de crear siquiera el `AbortController`. Esto corta el ciclo en su origen.
- El `AbortController` por componente (`solicitudActualRef`) sigue haciendo falta para navegación real solapada (cambiar de semana rápido): cada pedido nuevo aborta el anterior, y el `finally` solo apaga el spinner si sigue siendo el más reciente.

⚠️ **El rango se marca al empezar la petición, pero se desmarca si esa petición falla o se aborta.** Las dos mitades importan y cada una arregla un síntoma distinto:

- *Marcar al empezar* (no al terminar) evita que un `datesSet` espurio dispare un segundo fetch mientras el primero sigue en vuelo. Sin esto, cada navegación real disparaba 2 peticiones en vez de 1.
- *Desmarcar si falla* evita que un rango quede bloqueado para siempre sin datos. En desarrollo React monta cada componente dos veces, y el `useEffect` de limpieza aborta el primer intento de carga; con el rango ya marcado, ningún `datesSet` posterior volvía a intentarlo. Ese era el síntoma "la primera carga no trae las franjas hasta que cambio de semana y vuelvo".

**Verificado con Playwright** (servidor recién arrancado, `.next` borrado): 4 cargas en frío dan siempre 6 eventos renderizados sin spinner pegado; navegar siguiente/anterior dispara exactamente 1 petición por clic; 5 s de espera después no generan tráfico adicional.

> **Nota sobre el tipo de renderizado**, revisado a pedido del usuario: `/` y `/reservar` deben seguir con `force-dynamic`. No son candidatos a ISR aunque `Room` cambie poco, porque `ci.yml` construye con credenciales de base de datos falsas e ISR exige generar la página en build time — rompería el CI por la trampa de pre-renderizado documentada abajo. El bug del spinner era 100 % del lado del cliente, post-hidratación, sin relación con SSR.

---

## Trampas que ya costaron análisis

### 1. Dos URLs de base de datos, y el pooler es intermitente

`DATABASE_URL` = pooler puerto **6543** con `?pgbouncer=true&connection_limit=N` (runtime). `DIRECT_URL` = puerto **5432**, solo para migraciones (PgBouncer en modo transacción no soporta DDL). Ambas declaradas en el bloque `datasource`. Omitirlo produce *"prepared statement already exists"* o agotamiento de conexiones, y típicamente **solo después de desplegar**.

⚠️ **El puerto 6543 falla de forma intermitente desde las herramientas de este agente** — acepta TCP pero a veces no completa el handshake de Postgres. Ha fallado y funcionado en sesiones distintas sin patrón claro; **desde la terminal del usuario funciona siempre**. Distinguir los dos errores importa: *"Can't reach database server"* es el fallo de handshake del agente; `P2024` ("Timed out fetching a new connection from the pool") solo puede ocurrir con la conexión ya establecida, y significa saturación del pool.

**Solución cuando falla:** correr con la URL directa como override **solo de terminal, nunca escrito al `.env`**:

```bash
DIRECT_URL=$(grep '^DIRECT_URL=' .env | cut -d'"' -f2) && DATABASE_URL="$DIRECT_URL" npm run dev
```

⚠️ **`connection_limit=1` prohíbe `Promise.all` de varias consultas Prisma fuera de una `$transaction`.** Cada llamada al cliente normal intenta adquirir su propia conexión; con el límite en 1, lanzarlas a la vez las hace competir en vez de esperar turno y agota el `pool_timeout` (10 s). Dentro de `prisma.$transaction(async (tx) => …)` sí es seguro, porque `tx` reutiliza la conexión ya reservada. **Fuera de una transacción, las consultas van secuenciales, sin excepción** — ya pasó una vez, real: "paralelizar para ganar velocidad" en `GET /api/availability` causó un `P2024`.

En Vercel `connection_limit=1` es lo correcto (cada invocación serverless necesita una sola conexión). En el `.env` **local únicamente** puede subirse a 5 para que varias peticiones concurrentes no hagan fila.

### 2. Un advisory lock huérfano bloquea toda migración futura

`prisma migrate dev` falló 6 veces seguidas alternando `P1002` (timeout esperando `pg_advisory_lock`) y `P1001` (servidor inalcanzable). **La causa no era la red:** un `migrate dev --create-only` anterior había abortado en un entorno no interactivo sin pasar por su flujo normal de cierre, dejando una sesión **`idle`** con `SELECT pg_advisory_lock(72707369)` todavía tomado. Postgres no libera un advisory lock hasta que la sesión que lo pidió se cierra.

**Si `migrate dev` falla con `P1002` de forma persistente, sospechar de esto antes que de la red:** buscar en `pg_stat_activity` (conectando por `DIRECT_URL`) una fila `idle` cuya `query` sea `SELECT pg_advisory_lock(...)` con el número del error, y liberarla con `pg_terminate_backend()`. **Confirmar con el usuario antes de ejecutarlo** — es una acción sobre la base de datos compartida.

### 3. El servidor corre en UTC, no en hora de Colombia

Todo se almacena en UTC y se presenta en `America/Bogota`. **Nunca `new Date("2026-08-01 08:00")` sin zona explícita.** Un desfase de 5 h aparece en la anticipación mínima y en el horario de atención, y funciona bien en local antes de fallar en producción.

### 4. Pre-renderizado silencioso en build time

**Un Route Handler `GET` o un Server Component que no lea `request`, `searchParams`, `cookies()` ni `headers()` se pre-renderiza durante `next build`.** Si consulta la base de datos, el build queda acoplado a que la BD esté disponible en ese momento — y en CI, a las credenciales falsas de `ci.yml`. Pasó dos veces en la Fase 3 (`/api/rooms/route.ts` y `app/page.tsx`). Ambos necesitan `export const dynamic = "force-dynamic";` explícito. Los que leen `request.nextUrl` (como `/api/availability`) salen dinámicos solos, pero **revisar cada página o handler nuevo que toque la base de datos** — es más fácil olvidarlo en una página que en un handler.

### 5. Row-Level Security: obligatorio en toda tabla nueva

Supabase expone automáticamente **todas** las tablas de `public` vía su API REST (PostgREST), protegidas únicamente por RLS — sin relación con si el código de la app usa esa API (esta no la usa: solo Prisma). Sin RLS, cualquiera con la URL del proyecto y la llave `anon` (pública por diseño) podía leer o borrar `Reservation` entera por ese canal: nombre, documento, correo. Supabase lo detectó y envió una alerta ("Table publicly accessible").

Corregido en `prisma/migrations/20260805041335_enable_row_level_security/` con `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` sobre `Room`, `Reservation`, `TimeBlock` y `EmailLog` (`_prisma_migrations` se dejó fuera: tabla interna, sin datos sensibles).

**Es seguro porque se verificó primero, no se asumió:** Prisma se conecta como el rol `postgres`, que tiene `rolbypassrls = true` e **ignora RLS por completo**. Habilitar RLS sin políticas (deny-all para `anon`/`authenticated`) bloquea el canal REST sin afectar a la app.

⚠️ **Toda tabla nueva necesita su propio `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` en su migración.** Prisma no lo hace por defecto ni lo deriva de `schema.prisma`. Si algún día se introduce `@supabase/supabase-js` del lado del cliente, ahí sí harán falta políticas reales, no solo deny-all.

### 6. Otras

- **Nodemailer no corre en Edge Runtime.** Los handlers que envían correo necesitan `export const runtime = "nodejs"`.
- **`"postinstall": "prisma generate"`** en `package.json`: Vercel cachea `node_modules` y sin esto el build falla con errores de tipos confusos tras cambiar el schema.
- **Supabase free pausa el proyecto tras 7 días sin actividad.** Verificar que esté despierto el día antes de cualquier demostración.
- **`NEXT_PUBLIC_APP_URL` es lo que codifica el QR.** Un valor incorrecto rompe la funcionalidad principal.
- **La lista de festivos puede cambiar por ley a mitad de año.** Las 18 fechas del plan eran correctas, pero la **Ley 2578 de 2026** creó el festivo de la Virgen de Chiquinquirá (9 jul → lunes 13 jul). Son **19**. Al añadir 2027 no basta con calcular Pascua y aplicar la Ley Emiliani: hay que comprobar si se creó alguno nuevo. `holidays.ts` emite `console.warn` si falta el año en curso.
- **`z.coerce.number()` sobre un campo opcional vacío.** Un `<input type="number">` sin valor llega como `""`, y `Number("")` da **`0`, no `NaN`** — sin un `z.preprocess` que convierta `""` a `undefined` antes de coercionar, dejar el campo en blanco falla la validación de "mayor que cero" en vez de aceptarse vacío.

---

## Capa de UI: convenciones establecidas

- **Props en español** (`variante`, `tamano`, `tono`, `cargando`, `ayuda`, `opcional`), igual que el resto del producto.
- **`cn()` de [src/lib/utils.ts](src/lib/utils.ts)** para componer clases. Usa `extendTailwindMerge` declarando nuestra escala tipográfica (`text-h1`, `text-body-l`…): sin esa extensión, tailwind-merge las clasificaría como color de texto y descartaría una de dos clases en silencio. **Si añades un tamaño a `fontSize` en `tailwind.config.ts`, añádelo también ahí.**
- **[Field](src/components/ui/Field.tsx) cablea la accesibilidad por contexto**: genera el id, lo enlaza al `<label>` y apunta `aria-describedby` a ayuda y error. `Input`, `Textarea` y `Select` lo consumen con `useFieldControl()` y comparten `controlBase` (exportado desde `Input.tsx`). Envolver siempre los controles en `Field`, así el enlace no se puede olvidar.
- **`Checkbox` es la excepción**: no usa `Field` porque su layout (caja + texto al lado) es distinto al de un control con label encima; trae su propia etiqueta, error e id.
- **`Dialog`** (sobre `@radix-ui/react-dialog`) es siempre controlado desde fuera (`open`/`onOpenChange`), sin `Trigger` propio, porque cada sitio de uso ya decide cuándo abrirlo. `ConfirmActionDialog` lo envuelve con el texto de cada acción.
- **Los tokens viven en dos sitios** que hay que mantener sincronizados: el bloque `:root` de [globals.css](src/app/globals.css) (para CSS crudo: theming de FullCalendar, plantillas de correo) y `tailwind.config.ts` (para las utilidades). Los componentes usan solo las utilidades.
- **El `<Toaster/>` de sonner ya está en el layout raíz**; para notificar, `import { toast } from "sonner"`.

---

## Identidad visual

Los tokens del §12.1 del documento de marca se copian a `globals.css` y se mapean en `tailwind.config.ts`. **Ningún hex suelto en componentes.**

Jerarquía: azul estructura · blanco respira · naranja señala **una sola cosa** por vista · gris acompaña. Un solo gesto gráfico protagonista por pantalla (arco, tilde o diagonal, no los tres). Texto sobre naranja `#F39200` siempre `#2E2E2E`, nunca blanco. Fuentes vía `next/font/google`: Montserrat (display) + Inter (cuerpo); las oficiales son comerciales y no se incrustan sin licencia. WCAG AA, foco de teclado visible, `prefers-reduced-motion`.

Copy en voz de marca: cercana, activa, sentence case; los botones dicen qué hacen ("Solicitar reserva", "Rechazar solicitud"); los errores explican qué pasó y cómo resolverlo, sin dramatismo.

Los estados del calendario llevan **refuerzo no cromático** además del color (etiqueta, borde punteado, rayado diagonal, icono) por daltonismo — ver la tabla del §8 del plan.

---

## Privacidad

`GET /api/availability` es público y **nunca** devuelve datos personales: solo `startsAt`, `endsAt` y `status`. `GET /api/reservations/[code]` tampoco expone documento ni correo completo. El `.env` nunca se commitea; sí `.env.example`.

---

## Stack: versiones fijadas a propósito

Next `14.2.35` + React `18.3.1` + Tailwind `3.4.14`, sin `^` en `package.json`. **No actualizar a Next 15/16, React 19 ni Tailwind v4**: la elección es por madurez de documentación, no por descuido. Tampoco usar `shadcn/ui` (su CLI asume Tailwind v4) ni Turbopack.

Supabase se usa **solo como PostgreSQL alojado** — nada de su SDK, Auth ni Storage. El acceso a datos es Prisma `5.22.0`.

### Desviaciones respecto al §2 del plan (todas por seguridad, verificadas contra `npm audit`)

| Paquete | Plan | Instalado | Motivo |
|---------|------|-----------|--------|
| `next` | 14.2.18 | **14.2.35** | 14.2.18 arrastra el *Authorization Bypass in Next.js Middleware*, que es exactamente el mecanismo que protege `/admin/**`. 14.2.35 es la punta de la línea `next-14`, misma API. |
| `nodemailer` | 6.9.16 | **9.0.3** | 4 advisories afectan a todo `>=6.5.0`; el parche solo existe en 9.x. La API que usamos (`createTransport` + `sendMail`) no cambió. |
| `@types/nodemailer` | 6.4.16 | **8.0.1** | Acompaña a nodemailer 9 (ninguna versión trae tipos propios). |
| `postcss` | 8.4.47 | **8.5.25** | La advisory cubre `<=8.5.17`. |
| `tsx` | — | **4.23.1** | No está en el §2, pero `prisma/seed.ts` y `scripts/check-datetime.ts` necesitan un runner de TS. |

**Postura frente a `npm audit`: nunca quedará en cero, y no hay que perseguirlo.** Lo que queda son (a) la cadena de ESLint (`brace-expansion` → `minimatch` → `glob`), dev-only, y (b) advisories de Next cuyo único "fix" es saltar a Next 16 — aplican a Server Actions, `next/image` remoto, rewrites e i18n de Pages Router, superficies que esta aplicación no tiene. **Antes de reaccionar a un audit, comprobar si la superficie afectada existe aquí.**

---

## Entorno local

Node **20.20.2** vía nvm-windows, para paridad con Vercel (`engines: 20.x`, `.nvmrc`).

Dos peculiaridades de esta máquina:

- `nvm use` **falla** porque `NVM_HOME` contiene un espacio (`C:\Users\Juan Jose\…`) y el `elevate.cmd` de nvm-windows no entrecomilla la ruta. El enlace simbólico `C:\nvm4w\nodejs` se creó a mano con `mklink /D` elevado. Para cambiar de versión hay que repetir esa operación, o reinstalar nvm en una ruta sin espacios.
- Una terminal nueva resuelve `node` sin problema. Solo hace falta intervenir si el shell heredó un entorno anterior a la instalación de nvm.

---

## Despliegue (Vercel)

Proyecto `reservas-laboratorio-ueda` en la cuenta `juanalzate82212`, conectado al repo de GitHub. **Production Branch = `main`**: cada push despliega a producción automáticamente; los PR generan despliegues de vista previa.

Las 11 variables de entorno del §12 del plan están cargadas en Production y Preview (22 entradas). `DATABASE_URL` en Vercel usa `connection_limit=1`.

Trampas encontradas durante el despliegue, por si hay que repetirlo:

- ⚠️ **El primer `vercel deploy` de un proyecto se asigna a producción SIEMPRE**, aunque no se pase `--prod`. Pasó de verdad: se corrió sin la bandera solo para inspeccionar el log de build y publicó el contenido local directo a la URL pública. Para inspeccionar un build sin riesgo, desplegar desde una rama que no sea la Production Branch.
- **Vercel toma la rama por defecto del repo como Production Branch.** Como aquí es `develop`, quedó mal por defecto y hubo que corregirlo a `main` a mano en Settings → Git: la CLI no expone esa opción.
- **`vercel git connect` falla si la GitHub App de Vercel no tiene acceso al repo.** Es un paso que solo el usuario puede resolver desde el navegador; después funciona al reintentar.
- **`vercel env add --value` se cuelga indefinidamente con valores que contienen `<` o `>`** (le pasó a `MAIL_FROM`, con formato `Nombre <correo>`). Pasar el valor por stdin en su lugar: `cat archivo | vercel env add NOMBRE production -y`.
- **No hay dropdown de versión de Node en el dashboard.** Vercel respeta `engines.node` de `package.json` directamente (confirmado en el log de build real).

⚠️ **Node 20.x queda obsoleto en Vercel el 2026-10-01** — los despliegues fallarán a partir de esa fecha. Hay que subir el pin a 22.x o 24.x (`package.json` `engines` + `.nvmrc`) antes, y volver a verificar la paridad local descrita arriba.

---

## Disciplina de trabajo

- Las fases del §9 del plan terminan cada una en un estado ejecutable. No empezar la siguiente sin cumplir los criterios de aceptación.
- **`npm run build` debe pasar limpio al cerrar cada fase** — no acumular deuda de tipos.
- **Si una decisión de producto no está resuelta en el plan, preguntar en vez de inventar.**
- El usuario pide **explicar cada fase antes de construirla** y un **resumen al terminarla** (qué se construyó, qué archivos, en qué estado queda la app).
- **No fusionar ningún PR sin confirmación explícita.**
- No afirmar que algo se probó si no se probó. Ya pasó una vez que un mensaje de commit afirmaba una verificación que no se había hecho; se corrigió haciendo la prueba de verdad antes de dejar el commit.
