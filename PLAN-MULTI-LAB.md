# Plan — Segundo laboratorio (multi-laboratorio)

> **Estado:** aprobado el 2026-09-04. Fase 1 en curso (rama `feat/multi-lab-esquema`).
> Documento de contrato, como [PLAN-MVP.md](PLAN-MVP.md): **donde difiera del código, manda el código.**
> Las decisiones y sus porqués, una vez implementados, se consolidan en [CLAUDE.md](CLAUDE.md).

## Contexto

El **Laboratorio de Redes e Infraestructura** de la misma universidad pidió integrarse al aplicativo. Hoy la app sirve a un único laboratorio (Analítica de Datos e IA), con una sola contraseña de administrador, una sola cuenta de correo remitente y una landing que *es* el calendario de ese laboratorio.

El objetivo es que la app aloje **N laboratorios**, cada uno con su calendario aislado, su administrador, su remitente de correo y su identidad en el pie de página, entrando todos por un portal común al que apunta el QR.

**Decisiones ya tomadas por el usuario** (no se re-discuten en este plan):

1. **Cada laboratorio es una fila de `Room`.** No se crea un modelo `Lab`.
2. **Autenticación propia** usuario + contraseña, con CRUD de administradores, extendiendo el JWT de `jose` que ya existe. Sin NextAuth ni Google.
3. **Credenciales SMTP en variables de entorno** por laboratorio. En la base solo datos no secretos.
4. **Entrega por fases, un PR por fase.**

Una ventaja real de la decisión 1: las plantillas de correo ya reciben `roomName`, y con este modelo **`room.name` ya *es* el nombre del laboratorio**. Buena parte de la parametrización del correo sale gratis.

---

## Lo que ya está listo y no hay que tocar

Verificado en la exploración. Reutilizar, no reescribir:

- `getActiveRooms()` ([src/lib/rooms.ts:21-35](src/lib/rooms.ts#L21-L35)) y `GET /api/rooms` ya devuelven N salas.
- Las consultas de **solapamiento y bloqueos ya filtran por sala**: [api/reservations/route.ts:111-129](src/app/api/reservations/route.ts#L111-L129) y [api/availability/route.ts:47](src/app/api/availability/route.ts#L47),[57](src/app/api/availability/route.ts#L57). El aislamiento de calendarios **ya existe a nivel de consulta**.
- `src/lib/availability.ts` es puro y agnóstico de sala; no cambia.
- El filtro `?roomId=` de la bandeja y el selector de sala de `TimeBlockForm` ya existen.
- `Reservation.roomId` ya es obligatorio y tiene índice `[roomId, startsAt]`.
- `lib/api/http.ts` (`errorResponse`, `validationErrorResponse`) es el formato de error de toda la API.

---

## ⚠️ Las tres trampas que hay que ver antes de escribir nada

**1. Insertar la fila del laboratorio nuevo puede cambiar la landing de producción en silencio.**
`getActiveRoom()` es `rooms[0]` sobre `orderBy: { slug: "asc" }` ([rooms.ts:43-46](src/lib/rooms.ts#L43-L46)). El slug actual es `sala-principal`. Cualquier slug nuevo que ordene antes (`analitica-…`, `redes-…`) **convierte la portada pública en el laboratorio equivocado en cuanto se inserta la fila**, sin desplegar código y sin error. Por eso el laboratorio nuevo entra con `isActive: false` y solo se activa en la Fase 2.

**2. `prisma/seed.ts` borra salas activamente.** La línea 69 hace `deleteMany({ where: { slug: "sala-reuniones" } })`, y las líneas 63-64 vacían `Reservation` y `TimeBlock` **completas** — ahora de los dos laboratorios. Hay que quitar el `deleteMany` de la sala y revisar el guard antes de que exista un segundo lab con datos reales.

**3. RLS no puede ser el mecanismo de aislamiento.** Las tablas tienen RLS sin políticas a propósito (cierra el canal REST de Supabase), pero Prisma conecta como `postgres`, que la ignora. **El aislamiento por laboratorio vive en la capa de aplicación, en el `where` de cada handler.** Aun así, toda tabla nueva necesita su `ENABLE ROW LEVEL SECURITY` propio en la migración — `AdminUser` guarda hashes de contraseña y sin eso queda expuesta por la API REST con la llave `anon`.

---

## Fase 1 — Esquema, laboratorio nuevo y backfill

**PR: `feat/multi-lab-esquema`.** No cambia nada visible. Desplegable sola.

### `Room` gana campos de identidad y correo

| Campo | Tipo | Para qué |
|---|---|---|
| `mailKey` | `String @unique` | Sufijo con el que se resuelven las variables SMTP (`ANALITICA`, `REDES`) |
| `mailFromName` | `String?` | Nombre visible del remitente |
| `contactEmail` | `String?` | El `mailto:` del pie de página |
| `shortName` | `String?` | Nombre corto para cabeceras y tarjetas del portal |

**`mailKey` va aparte del `slug` a propósito.** El `slug` pasa a ser parte de la URL pública, así que es cosmético y algún día alguien lo cambiará; si las variables de entorno colgaran de él, ese cambio dejaría al laboratorio **sin SMTP configurado en silencio** — el mailer caería en modo `LOGGED` y los correos dejarían de salir sin un solo error. Misma familia de fallo que las trampas ya documentadas en `CLAUDE.md`.

### Tabla nueva `AdminUser`

```
id            String   @id @default(cuid())
email         String   @unique      // login
name          String
passwordHash  String
role          AdminRole             // enum: SUPER_ADMIN | LAB_ADMIN
roomId        String?               // null solo para SUPER_ADMIN
room          Room?    @relation(...)
isActive      Boolean  @default(true)
lastLoginAt   DateTime?
createdAt / updatedAt

@@index([roomId])   // Postgres NO indexa las FK solo
```

**Hash con `scrypt` de `node:crypto`**, sal por usuario y comparación con `timingSafeEqual`. Cero dependencias nuevas: `bcrypt` es binario nativo (riesgo en el build de Vercel) y `bcryptjs` sería una dependencia más contra un stack deliberadamente fijado.

### `EmailLog` gana trazabilidad

- `roomId String?` + FK + `@@index([roomId])` — hoy `/admin/correos` **no puede** filtrar por laboratorio porque el dato no existe.
- `fromAddress String?` — hoy el remitente de un correo enviado es irrecuperable.

### Migración y backfill

Todo **aditivo**: columnas nuevas nullable o con default, tabla nueva. Eso permite aplicar la migración *antes* de desplegar el código sin romper el que está corriendo.

1. `ALTER TABLE` de `Room` y `EmailLog`; `CREATE TABLE "AdminUser"`; enum `AdminRole`.
2. `ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;` (obligatorio, ver trampa 3).
3. Índices de FK: `AdminUser(roomId)`, `EmailLog(roomId)`.
4. Backfill de la sala existente: `mailKey = 'ANALITICA'`, `mailFromName`, `contactEmail = 'lab.analitica@amigo.edu.co'`.
5. Backfill de `EmailLog.roomId` con `UPDATE … FROM "Reservation"` por `reservationId` (no hay FK, pero el dato está).
6. Primer `SUPER_ADMIN` sembrado desde variables de entorno, reutilizando el `ADMIN_PASSWORD` actual hasheado.
7. Fila del laboratorio nuevo **con `isActive: false`**.

Las restricciones que se añadan van en bloques `DO $$ … $$` comprobando `pg_constraint`: Postgres no admite `ADD CONSTRAINT IF NOT EXISTS` y la migración fallaría al reaplicarse.

### Ficheros

`prisma/schema.prisma`, migración nueva bajo `prisma/migrations/`, `prisma/seed.ts` (quitar el `deleteMany` de sala; sembrar los dos labs), `src/lib/rooms.ts` (añadir `getRoomBySlug()`; marcar `getActiveRoom()` como el punto de acoplamiento que la Fase 2 retira).

---

## Fase 2 — Portal público y rutas por laboratorio

**PR: `feat/portal-laboratorios`.** Aquí el laboratorio nuevo pasa a `isActive: true`.

### Rutas

| Ruta | Qué es |
|---|---|
| `/` | **Portal**: tarjetas de los laboratorios activos con descripción y enlace. Ya no tiene calendario |
| `/laboratorio/[slug]` | Calendario y disponibilidad de ese laboratorio (lo que hoy es `/`) |
| `/laboratorio/[slug]/reservar` | Wizard de ese laboratorio (lo que hoy es `/reservar`) |
| `/reservar` | **Redirección** al portal, para no romper enlaces guardados |
| `/reserva` y `/reserva/[codigo]` | Sin cambio de ruta: el código ya identifica la reserva |

El prefijo `/laboratorio/` evita colisionar con `/reservar`, `/reserva` y `/admin`, y mantiene el laboratorio en la URL durante todo el flujo — que es justo lo que `Footer` y `Header` necesitan para contextualizarse.

### Cambios concretos

- **`/` reescrita**: `getActiveRooms()` en Server Component con `force-dynamic` (el CI construye con credenciales falsas). Sin selector de sala: tarjetas, una por laboratorio.
- **`/laboratorio/[slug]`**: `getRoomBySlug()`, `notFound()` si no existe o está inactivo. Reutiliza `RoomAvailability` → `RoomCalendar` **sin duplicar el componente**: las tres trampas de FullCalendar viajan con él.
- **Deep link del calendario**: [RoomCalendar.tsx:317](src/components/calendar/RoomCalendar.tsx#L317) pasa de `/reservar?startsAt=` a `/laboratorio/${room.slug}/reservar?startsAt=`. El `slug` ya viaja en el tipo `ActiveRoom`, no hay que ampliar nada.
- **`Footer` y `Header`** ganan prop opcional `laboratorio?: ActiveRoom | null` (props en español). Sin él, información institucional: es lo correcto en el portal y en `/admin`. En `/reserva/[codigo]` el laboratorio sale de la reserva consultada.
  ⚠️ El crédito de la **Unidad de Estrategia del Dato y Analítica** ([Footer.tsx:40](src/components/brand/Footer.tsx#L40)) es de la unidad que construyó la herramienta, **no** del laboratorio: se queda fijo en los dos. Es la línea que `CLAUDE.md` advierte de no unificar.
- **`layout.tsx`**: el `title`/`description`/`openGraph` global pasa a hablar del portal; cada `/laboratorio/[slug]` exporta su propio `generateMetadata`.
- **QR** ([qr/page.tsx](src/app/admin/(protected)/qr/page.tsx)): ya codifica `NEXT_PUBLIC_APP_URL` a secas, así que **el QR impreso sigue siendo válido** — solo hay que quitar el texto "Laboratorio de Analítica…" de la línea 72 y dejarlo genérico.
- **`getActiveRoom()` se elimina** junto con sus tres llamantes y la copia en cliente de [calendario/page.tsx:46-47](src/app/admin/(protected)/calendario/page.tsx#L46-L47).

### Diseño del portal

Cargar la skill **`frontend-design`** antes de maquetar. Restricciones de `identidad-visual-ucla-ui-ux.md` que aplican: naranja señala **una sola cosa por vista**, texto pequeño con los tokens `-texto` (`--azul-texto`, `--naranja-texto`), ningún hex suelto, y `Field` para cualquier control. Auditar con axe-core sobre el build de producción, no en `dev`.

---

## Fase 3 — Autenticación multiusuario y aislamiento

**PR: `feat/admins-por-laboratorio`.** Es la fase con más superficie de riesgo.

### `lib/auth.ts`

Payload del JWT: `{ sub: userId, role, roomId }` en lugar de `{ role: "admin" }`.

`verifyAdminToken()` deja de devolver `boolean` y devuelve **el payload o `null`** — hoy lo descarta ([auth.ts:34-42](src/lib/auth.ts#L34-L42)). Sigue siendo Edge-safe para `middleware.ts`.

`getAdminSession()` devuelve `AdminSession | null` y, además de verificar la firma, **lee la fila del usuario** (`findUnique` por PK, indexado) para comprobar `isActive` y el `roomId` **actual**.

> **Por qué esa consulta extra:** si la sesión confiara solo en el JWT, desactivar a un administrador o cambiarlo de laboratorio tardaría **hasta 8 horas** en surtir efecto. Es una consulta por PK; **secuencial, nunca dentro de un `Promise.all`** — `connection_limit=1`.

⚠️ Se preserva el `await import("next/headers")` **dinámico** dentro del cuerpo: un import estático caería en el grafo del bundle de Edge y rompería el middleware.

⚠️ Al cambiar la forma del token, **las sesiones abiertas dejan de ser válidas**: el administrador actual tendrá que volver a entrar una vez. Esperado.

### Login

`api/admin/login/route.ts` pasa de comparar `password !== process.env.ADMIN_PASSWORD` en texto plano a buscar el usuario por correo y verificar el hash con comparación de tiempo constante. Mismo mensaje de error para "usuario no existe" y "contraseña incorrecta" — la misma razón por la que el endpoint de autocancelación no distingue código de documento.

### Alcance por laboratorio

Helper único en `lib/auth.ts`:

```ts
alcanceDeSala(sesion) → {} | { roomId: sesion.roomId }
```

`SUPER_ADMIN` → `{}`. `LAB_ADMIN` → su sala. **El alcance se intersecta con el filtro que pide el cliente y siempre gana el alcance**: un `LAB_ADMIN` que mande `?roomId=` de otro laboratorio no debe ver nada.

Los ocho handlers de `/api/admin/**` y qué les pasa:

| Handler | Cambio |
|---|---|
| `reservations/route.ts` GET | `where` con el alcance; el `?roomId=` del cliente se intersecta |
| `reservations/[id]/route.ts` PATCH | `findUnique({where:{id}})` → `findFirst({where:{id, ...alcance}})`; fuera de alcance responde **404**, no 403 |
| `time-blocks/route.ts` GET | `where` con el alcance |
| `time-blocks/route.ts` POST | **Un `LAB_ADMIN` no puede crear un bloqueo global** (`roomId: null` afecta a todas las salas). Solo `SUPER_ADMIN` |
| `time-blocks/[id]/route.ts` DELETE | Comprobar alcance antes de borrar; hoy borra por `id` a secas |
| `email-logs/route.ts` GET | `where` con el alcance — posible ya con `EmailLog.roomId` de la Fase 1 |
| `email-logs/[id]/retry` | Alcance vía el `roomId` del log |
| `stats/route.ts` GET | `where` con el alcance. **No ampliar el `select CAMPOS`**: el filtro va en el `where` y no necesita exponer nada nuevo |

En la UI: la opción **"Todas las salas"** de [TimeBlockForm.tsx:67](src/components/admin/TimeBlockForm.tsx#L67) solo se pinta para `SUPER_ADMIN`, y los filtros de sala desaparecen para quien solo tiene una. El contador de pendientes de `AdminNav` queda acotado automáticamente al acotarse su `GET`.

### CRUD de administradores

`/admin/usuarios` + `/api/admin/users/**`, **solo `SUPER_ADMIN`**, comprobado en las dos capas: el `middleware.ts` para la página (ya lee el token) y `getAdminSession()` dentro de cada handler — el middleware solo protege páginas.

Esquema Zod compartido en `lib/validation/adminUser.ts`; el servidor revalida siempre. Reglas: no puedes desactivarte ni degradarte a ti mismo (evita quedarse sin ningún super admin), y un `LAB_ADMIN` requiere `roomId`.

---

## Fase 4 — Correo y marca dinámicos

**PR: `feat/correo-por-laboratorio`.**

### Resolución del buzón

Nuevo `src/lib/mail/buzones.ts`:

```ts
resolverBuzon(mailKey) → { host, port, secure, user, pass, from, avisosA } | null
```

Lee `SMTP_<KEY>_HOST | _PORT | _SECURE | _USER | _PASSWORD`, `MAIL_FROM_<KEY>` y `MAIL_TO_ADMIN_<KEY>`, **con reserva a las variables actuales sin prefijo**. Así la Fase 4 se despliega sin tocar las variables de Analítica y un despliegue de un solo buzón sigue funcionando.

### `mailer.ts`

- `EnviarCorreoInput` gana `roomId` y `mailKey`. Hoy la cadena `Room → correo` **se corta en la frontera `templates.ts` / `mailer.ts`**: las plantillas reciben `roomName` pero el mailer nunca ve la sala.
- `crearTransporte()` pasa a recibir el buzón resuelto en vez de leer `process.env` directamente. Ya se llama por envío, así que no hay singleton que invalidar.
- `smtpConfigurado()` se evalúa **por buzón**: un laboratorio sin credenciales cae en `LOGGED` sin arrastrar al otro.
- `enviarCorreoAlLaboratorio()` toma el destino de `avisosA` del buzón, no de la variable global.
- Cada `EmailLog.create` guarda `roomId` y `fromAddress`.
- **`reintentarCorreo()` re-resuelve el buzón desde el `roomId` del log**, no del entorno global. Hoy relee `MAIL_FROM` en caliente ([mailer.ts:116](src/lib/mail/mailer.ts#L116)), así que un reintento puede salir con un remitente distinto al original sin que quede constancia. Con dos laboratorios eso sería enviar desde el buzón equivocado.

### `templates.ts`

- El nombre del laboratorio de la cabecera ([línea 68](src/lib/mail/templates.ts#L68), presente en **los seis correos**) y el título del evento de Google Calendar ([línea 141](src/lib/mail/templates.ts#L141)) pasan a parámetro. `TemplateReservation` ya trae `roomName`, que con este modelo **es** el nombre del laboratorio.
- ⚠️ `fechaParaGoogleCalendar` sigue usando el **instante UTC real**; no pasa por `toBogotaWallClockIso()`, que es exclusivo del límite con FullCalendar.
- `escapeHtml` se mantiene en todo dato de origen externo: sigue habiendo doble capa (escapado en origen + `<iframe sandbox="">` en `/admin/correos`).

### Arreglo de paso

[api/admin/reservations/[id]/route.ts:119-124](src/app/api/admin/reservations/[id]/route.ts#L119-L124) es **el único handler de correo sin `try/catch`** alrededor del envío. El `EmailLog.create` del `catch` interno del mailer puede fallar y convertir un `200` con la reserva ya transicionada en un `500`. Se envuelve, como los otros tres.

---

## Reglas de negocio que cambian de significado

| Regla | Hoy | Decisión |
|---|---|---|
| `maxPendingPerEmail` ([reservations/route.ts:94-103](src/app/api/reservations/route.ts#L94-L103)) | Cuenta pendientes de **todas** las salas | **Pasa a por laboratorio.** El tope existe para que nadie acapare la cola de revisión *de un laboratorio*; bloquear en Redes a quien tiene 3 pendientes en Analítica sería un efecto colateral, no la regla |
| Índice de ocupación ([stats.ts:213-217](src/lib/stats.ts#L213-L217)) | `horasReservadas / horasHabiles` | **Roto con dos labs**: sumaría horas de ambos contra el horario de *un* calendario y **podría superar 1**. Las estadísticas pasan a exigir siempre alcance de un laboratorio |
| `expirarReservasVencidas()` | `updateMany` global | **Se queda global, y es correcto**: vencer no depende del laboratorio. Merece un comentario para que nadie lo "arregle" |
| Prefijo `UEDA` ([reservation-code.ts:4](src/lib/reservation-code.ts#L4)) | Fijo | **Se queda.** Es la *Unidad* que construyó la herramienta, no el laboratorio. `code` es único global y ya hay reintento ante colisión; cambiarlo invalidaría todos los códigos impresos y enviados |
| `TimeBlock.roomId = null` | Bloqueo global | Los bloqueos globales existentes **se aplicarán al laboratorio nuevo automáticamente**. Hay que revisar los que haya en producción antes de activar Redes |
| Horario de atención | Global en `config/booking.ts`, y **duplicado hardcodeado** en [RoomCalendar.tsx:447-457](src/components/calendar/RoomCalendar.tsx#L447-L457) | **Asumo mismo horario para los dos laboratorios.** Si Redes abre distinto, es una columna aditiva en `Room` más deshacer ese hardcodeo — no bloquea la Fase 1 |

---

## Orden de despliegue y riesgos

1. **Migración antes que código.** Todo lo de la Fase 1 es aditivo (columnas nullable, tabla nueva), así que el código viejo sigue funcionando con el esquema nuevo. `npx prisma migrate deploy` con `DIRECT_URL` (puerto 5432; PgBouncer en modo transacción no soporta DDL).
2. **El laboratorio nuevo entra inactivo** y se activa en la Fase 2 (ver trampa 1).
3. **Confirmar a qué base apunta el `.env` antes de cualquier escritura**: `grep -oE 'postgres\.[a-z0-9]{20}' .env | head -1`. La app está en uso — no resembrar producción.
4. **Tras fusionar a `main`, comprobar producción con una petición real.** Ya pasó una vez que Vercel no desplegó un merge y nada avisó.
5. La Fase 3 **cierra la sesión del administrador actual** una vez, al cambiar la forma del token.
6. `npm run build` limpio al cerrar cada fase. Ningún PR se fusiona sin confirmación explícita.

---

## Verificación

Por criterios de aceptación, que es el método de este proyecto — Vitest solo cubre funciones puras.

**Aislamiento de calendarios (Fase 2):** crear una reserva en Redes a las 09:00 y comprobar con `curl` que `GET /api/availability?roomId=<Analítica>` **no** la trae, y que la franja sigue libre en el calendario de Analítica.

**Aislamiento de administradores (Fase 3), con `curl` y la cookie de un `LAB_ADMIN` de Redes:**
- `GET /api/admin/reservations` → solo reservas de Redes.
- `GET /api/admin/reservations?roomId=<Analítica>` → **vacío**, no las de Analítica.
- `PATCH /api/admin/reservations/<id de Analítica>` → **404**.
- `DELETE /api/admin/time-blocks/<id de Analítica>` → **404**.
- `POST /api/admin/time-blocks` con `roomId: null` → **403**.
- `GET /api/admin/email-logs` y `GET /api/admin/stats` → solo Redes.
- `GET /admin/usuarios` → redirige a `/admin`.

**Correo (Fase 4):** reservar en cada laboratorio con SMTP configurado y comprobar en `/admin/correos` que `fromAddress` y `roomId` son los del laboratorio correcto; reintentar un log de Redes y verificar que **no** sale por el buzón de Analítica.

**Transversal:** `npm run check:datetime` al cerrar cualquier fase que toque fechas; `npx prisma studio` para verificar backfill; `npm test`, `npm run lint`, `npm run typecheck` y `npm run build` limpios; axe-core sobre el build de producción para el portal nuevo.

**Tests nuevos en Vitest** solo donde haya función pura: la resolución de buzón por `mailKey` (`lib/mail/buzones.ts`) y `alcanceDeSala()` califican — se ejercitan con objetos literales, sin Prisma ni petición.

---

## Documentación a actualizar al cerrar

`CLAUDE.md` (deja de haber "una sola sala"; el bloque de decisiones de producto, el de autenticación y el de correo cambian), `README.md` (variables de entorno nuevas), `.env.example` (buzones por laboratorio), y `BACKLOG.md` si algo queda fuera de alcance.
