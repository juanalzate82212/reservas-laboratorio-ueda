# Especificación — Reservas de Laboratorio UEDA

> **Esto no es el estado del proyecto ni una lista de tareas.** Es la
> especificación numerada a la que apuntan los comentarios del código: cuando
> `booking.ts` dice *"§5 del plan"* o `Badge.tsx` dice *"§8 del plan"*, se
> refieren a este archivo.
>
> - **Qué es el proyecto, cómo está montado y qué trampas tiene** → [CLAUDE.md](CLAUDE.md)
> - **Qué falta por hacer** → [BACKLOG.md](BACKLOG.md)
> - **Cómo instalarlo y desplegarlo** → [README.md](README.md)
> - **Colores, tipografía y voz** → [identidad-visual-ucla-ui-ux.md](identidad-visual-ucla-ui-ux.md)

Nació como plan de desarrollo de las diez fases del MVP. **Las diez están
completas y la aplicación está en producción**, así que todo lo que era
calendario de trabajo —fases, criterios de aceptación, riesgos abiertos, pasos
de despliegue— se retiró de aquí: o ya se cumplió, o vive en los documentos de
arriba. Lo que queda son las seis secciones que el código sigue citando.

⚠️ **Donde esto y el código difieran, manda el código.** Varias decisiones
posteriores cambiaron el diseño original; están anotadas en su sitio, pero el
porqué de cada una está en `CLAUDE.md`. Esta es la referencia del contrato, no
un espejo de la implementación.

## Índice

| § | Contenido | Lo cita |
|---|-----------|---------|
| 2.8 | Autenticación del admin | `lib/auth.ts`, `middleware.ts` |
| 4 | Modelo de datos | `prisma/schema.prisma` |
| 5 | Reglas de negocio y festivos | `config/booking.ts`, `config/holidays.ts`, `lib/validation/`, `RoomCalendar` |
| 6 | Contratos de API y transiciones | `lib/api/http.ts`, `api/admin/reservations/[id]`, `ReservationActions` |
| 7 | Correos | `lib/mail/mailer.ts`, `lib/mail/templates.ts` |
| 8 | Colores del calendario y refuerzo no cromático | `Badge.tsx`, `AvailabilityLegend.tsx`, `api/admin/time-blocks` |

---

### 2.8 Autenticación del admin

**Decisión: no usar NextAuth.** Para un solo administrador es sobredimensionado.

1. `POST /api/admin/login` compara la contraseña recibida con `ADMIN_PASSWORD`.
2. Si coincide, firma un JWT con `jose` usando `AUTH_SECRET` y lo setea en una cookie `admin_session` — `httpOnly`, `secure` en producción, `sameSite: "lax"`, expiración 8 h.
3. `middleware.ts` protege `/admin/**` (excepto `/admin/login`).
4. **Cada handler de `/api/admin/**` verifica la cookie por su cuenta** — el middleware no basta como única defensa.

---


---

## 4. Modelo de datos

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler :6543 — runtime
  directUrl = env("DIRECT_URL")     // directa :5432 — migraciones
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  REJECTED
  CANCELLED
  EXPIRED    // ← añadido tras el despliegue. Ver la nota bajo la tabla de estados.
}

enum TimeBlockKind {
  BLOCKED
  WARNING
}

// Los `value` de src/config/reservationOptions.ts deben coincidir exactamente
// con estos nombres (ver revisión post-Fase 4 más abajo).
enum AcademicProgram {
  INGENIERIA_SISTEMAS
  INGENIERIA_CIVIL
  ARQUITECTURA
  TECNOLOGIA_DESARROLLO_SOFTWARE
  ESPECIALIZACION_BIG_DATA_BI
  INGENIERIA_SISTEMAS_APARTADO
}

enum ActivityType {
  CLASE_PRACTICA
  TALLER
  EVALUACION
  PROYECTO_AULA
  SEMILLERO_INVESTIGACION
  OTRO
}

model Room {
  id            String        @id @default(cuid())
  slug          String        @unique          // "sala-principal" | "sala-reuniones"
  name          String
  description   String?
  capacity      Int
  hasComputers  Boolean       @default(true)
  colorToken    String        @default("azul") // "azul" | "naranja"
  isActive      Boolean       @default(true)
  reservations  Reservation[]
  timeBlocks    TimeBlock[]
  createdAt     DateTime      @default(now())
}

model Reservation {
  id              String            @id @default(cuid())
  code            String            @unique      // código corto legible: "UEDA-7F3K2"
  roomId          String
  room            Room              @relation(fields: [roomId], references: [id])

  startsAt        DateTime                       // UTC
  endsAt          DateTime                       // UTC

  // Datos del solicitante
  requesterName   String
  requesterRole   String                         // cargo
  requesterDocId  String                         // número de documento
  requesterEmail  String                         // debe terminar en @amigo.edu.co

  academicProgram        AcademicProgram         // programa académico, lista cerrada
  activityType            ActivityType           // tipo de actividad, lista cerrada + "OTRO"
  activityTypeOther       String?                // solo cuando activityType = OTRO
  attendees                Int                   // estimado, obligatorio
  responsibilityAccepted   Boolean  @default(false) // cuadro de responsabilidad aceptado

  status          ReservationStatus @default(PENDING)
  adminNote       String?                        // razón de rechazo/cancelación
  decidedAt       DateTime?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([roomId, startsAt])
  @@index([status])
}

model TimeBlock {
  id        String        @id @default(cuid())
  roomId    String?                              // null = aplica a TODAS las salas
  room      Room?         @relation(fields: [roomId], references: [id])

  startsAt  DateTime                             // UTC
  endsAt    DateTime                             // UTC
  kind      TimeBlockKind
  reason    String                               // se muestra al usuario

  createdAt DateTime      @default(now())

  @@index([roomId, startsAt])
}

model EmailLog {
  id            String   @id @default(cuid())
  reservationId String?
  to            String
  subject       String
  body          String   @db.Text
  status        String                           // "SENT" | "FAILED" | "LOGGED"
  error         String?
  sentAt        DateTime @default(now())
}
```

**Estados de reserva:**

| Estado | Significado | Ocupa la franja | Correo al entrar |
|--------|-------------|-----------------|------------------|
| `PENDING` | Solicitud enviada, esperando revisión | **Sí** (bloqueo blando) | No |
| `CONFIRMED` | Aprobada por el admin | Sí | ✅ Confirmación |
| `REJECTED` | Rechazada por el admin | No | ✅ Rechazo con motivo |
| `CANCELLED` | La canceló el admin, o el propio solicitante | No | ✅ Notificación de cancelación |
| `EXPIRED` | Nadie la revisó y su franja ya terminó | No | No |

> **Añadido tras el despliegue.** `EXPIRED` es el único estado que **no decide una persona**, así que no hay ninguna acción de usuario donde colgarlo: se aplica **al leer**, con un `updateMany` idempotente en `lib/expiration.ts` que corre antes de las tres lecturas que importan. Se descartó una tarea programada porque Vercel Hobby solo permite una ejecución diaria, y una solicitud vencida por la mañana seguiría figurando "En revisión" hasta la madrugada. `decidedAt` se deja en `null` a propósito: eso es justo lo que significa "se venció sin que nadie la mirara". Es terminal, y de paso arregla un fallo real — el tope de `maxPendingPerEmail` cuenta solo `PENDING`, así que antes tres solicitudes vencidas bloqueaban ese correo para siempre.

**Tipos de `TimeBlock`:**

| Valor | Efecto |
|-------|--------|
| `BLOCKED` | La franja **no es reservable**. Se pinta en gris con rayado y el motivo. El API rechaza cualquier reserva que solape. |
| `WARNING` | La franja **sí es reservable**, pero se pinta en naranja `#F39200` con el motivo (típicamente "no hay préstamo de equipos de cómputo"). El aviso aparece en el paso de revisión del wizard y en el correo de confirmación. |

---


---

## 5. Reglas de negocio

Centralizadas en `src/config/booking.ts`:

```ts
export const BOOKING_CONFIG = {
  timeZone: "America/Bogota",

  // Horario de atención: DOS jornadas por día, con receso de 12:00 a 13:00.
  // Clave = día de la semana (0 = domingo). Array vacío = cerrado.
  openingHours: {
    0: [],                                                            // domingo — cerrado
    1: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
    2: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
    3: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
    4: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
    5: [{ start: "08:00", end: "12:00" }, { start: "13:00", end: "17:00" }],
    6: [],                                                            // sábado — cerrado
  },

  slotMinutes: 30,                                        // granularidad de la grilla
  allowedDurations: [30, 60, 90, 120, 150, 180, 210, 240], // minutos (30 min a 4 h)
  minAdvanceMinutes: 60,                                  // mínimo 1 h de anticipación
  maxAdvanceDays: 60,                                     // máximo 2 meses
  maxPendingPerEmail: 3,
  emailDomain: "amigo.edu.co",
} as const;
```

> **Consecuencia importante del receso:** cada jornada dura exactamente 4 h, así que una reserva de 4 h ocupa una jornada completa (8:00–12:00 o 13:00–17:00). **Una reserva nunca puede cruzar el receso de 12:00–13:00.** La grilla del calendario debe mostrar ese hueco como no disponible, visualmente distinto de una franja bloqueada por el admin.

### 5.1 Festivos

El laboratorio **no atiende festivos colombianos**. Estos no se modelan como `TimeBlock` (eso obligaría a sembrarlos y dejaría el sistema dependiendo de que alguien corriera un script): se tratan como parte del horario de atención, en un solo lugar.

```ts
// src/config/holidays.ts
// Festivos de Colombia (Ley 51 de 1983 — "Ley Emiliani": varios se trasladan al lunes siguiente).
// Fechas en hora local de Bogotá, formato YYYY-MM-DD.
export const HOLIDAYS_CO: Record<number, string[]> = {
  2026: [
    "2026-01-01", // Año Nuevo
    "2026-01-12", // Reyes Magos (trasladado)
    "2026-03-23", // San José (trasladado)
    "2026-04-02", // Jueves Santo
    "2026-04-03", // Viernes Santo
    "2026-05-01", // Día del Trabajo
    "2026-05-18", // Ascensión (trasladado)
    "2026-06-08", // Corpus Christi (trasladado)
    "2026-06-15", // Sagrado Corazón (trasladado)
    "2026-06-29", // San Pedro y San Pablo
    "2026-07-13", // Virgen de Chiquinquirá (9 jul → lunes) — Ley 2578 de 2026
    "2026-07-20", // Independencia
    "2026-08-07", // Batalla de Boyacá
    "2026-08-17", // Asunción (trasladado)
    "2026-10-12", // Día de la Raza
    "2026-11-02", // Todos los Santos (trasladado)
    "2026-11-16", // Independencia de Cartagena (trasladado)
    "2026-12-08", // Inmaculada Concepción
    "2026-12-25", // Navidad
  ],
  // 2027: [...]  ← añadir antes de que termine 2026
};
```

**Implementación:** `lib/datetime.ts` expone `isHoliday(date)`, y **`getOpeningRangesFor(date)` devuelve `[]` cuando el día es festivo**. Con eso, todo lo que ya depende del horario de atención —generación de slots, validación del servidor, pintado del calendario— maneja los festivos automáticamente, sin lógica adicional en ninguna otra capa.

> ⚠️ **Dos cosas que el agente debe hacer, no asumir:**
> 1. **Verificar la lista de 2026 contra el calendario oficial** antes de darla por buena. Las fechas de arriba están calculadas (Domingo de Pascua 2026 = 5 de abril + traslados de la Ley Emiliani), no copiadas de una fuente oficial.
> 2. **Si el año en curso no está en `HOLIDAYS_CO`, registrar un `console.warn` visible al arrancar**, y mostrar un aviso en el panel de administrador. Un fallo silencioso aquí significa aceptar reservas en días festivos sin que nadie se entere hasta que alguien llegue a un laboratorio cerrado.
>
> El administrador siempre puede cerrar un día puntual (jornada institucional, mantenimiento, semana de receso) creando un `TimeBlock` de tipo `BLOCKED`. Los festivos de ley van en el archivo; lo excepcional va por el panel.

**Validaciones de `POST /api/reservations`** (todas en el servidor, sin excepción):

1. Todos los campos obligatorios presentes y no vacíos.
2. `requesterEmail` termina exactamente en `@amigo.edu.co` (comparación en minúsculas). Error: *"Usa tu correo institucional (@amigo.edu.co) para solicitar una reserva."*
3. `requesterDocId`: solo dígitos, entre 6 y 12 caracteres.
4. `requesterName`: mínimo 5 caracteres, al menos dos palabras.
5. La sala existe y está activa.
6. `startsAt < endsAt`; la duración está en `allowedDurations`.
7. `startsAt` alineado a la granularidad de 30 min.
8. **`startsAt` y `endsAt` caen completos dentro de UNA MISMA jornada** del día correspondiente. Una reserva 11:00–14:00 se rechaza aunque ambos extremos estén en horario de atención. El día no puede ser sábado, domingo ni festivo (§5.1) — esto queda cubierto por `getOpeningRangesFor()` devolviendo `[]`.
9. `startsAt >= ahora + minAdvanceMinutes` y `startsAt <= ahora + maxAdvanceDays`.
10. No solapa con ninguna reserva `PENDING` o `CONFIRMED` de la misma sala.
11. No solapa con ningún `TimeBlock` de tipo `BLOCKED` (de esa sala o global).
12. Máximo `maxPendingPerEmail` solicitudes `PENDING` simultáneas por correo.
13. **`attendees` no supera el aforo de la sala.** Añadida tras el despliegue: al probar la app se aceptaban 100 y hasta 183 asistentes en una sala de 25. El tope **no** vive en `BOOKING_CONFIG` sino en `Room.capacity`, porque es un dato de la sala y no una regla global; `buildCreateReservationSchema({ maxAttendees })` inyecta ese valor y el handler lo revalida contra la fila real (`route.ts`, tras leer la sala).

> **Revisión post-Fase 4 (pedida por el usuario antes de la Fase 6):** el formulario del wizard estaba incompleto frente a lo que administración necesita para revisar una solicitud. Se agregaron cuatro campos, los cuatro obligatorios (cubiertos por la regla 1): `academicProgram` (lista cerrada, `AcademicProgram`), `activityType` (lista cerrada + `OTRO` con detalle abierto en `activityTypeOther`, obligatorio solo si se elige `OTRO`), y `responsibilityAccepted` (checkbox de aceptación del uso responsable del espacio, debe ser `true`). De paso, `attendees` pasó de opcional a obligatorio y `purpose` (motivo libre) se eliminó del modelo — lo reemplaza `activityType`, que es más útil para el admin al decidir. Las opciones de ambas listas viven en `src/config/reservationOptions.ts`, fuente única para el `<select>`, el Zod compartido y el paso de revisión.

**Condición de solapamiento** (usar exactamente esta — evita el error clásico de bordes):

```ts
// A y B se solapan si:  A.startsAt < B.endsAt  &&  B.startsAt < A.endsAt
// Una reserva 09:00–10:00 y otra 10:00–11:00 NO se solapan.
```

**Concurrencia:** la verificación de solapamiento y la creación van dentro de una `prisma.$transaction`. Con PostgreSQL esto es fiable; para blindarlo del todo se puede añadir un `EXCLUDE` constraint con `btree_gist` sobre el rango, pero queda fuera del MVP.

---


---

## 6. Contratos de API

Todas las mutaciones con **Route Handlers** (no Server Actions), para mantener un solo patrón y poder probar con `curl`.

Formato de error uniforme:
```json
{ "error": { "code": "SLOT_UNAVAILABLE", "message": "Esa franja ya está reservada." } }
```

### Públicas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/rooms` | Salas activas. |
| `GET` | `/api/availability?roomId=&from=&to=` | Para el rango: reservas ocupadas (**anonimizadas**: solo `startsAt`, `endsAt`, `status`; nunca nombre ni correo), `timeBlocks`, y `closedDays` (fines de semana y festivos, con su motivo, para que el calendario los etiquete). `from`/`to` en ISO 8601. |
| `POST` | `/api/reservations` | Crea la solicitud. Devuelve `{ code }`. |
| `GET` | `/api/reservations/[code]` | Consulta pública del estado por código (no expone documento ni correo completo). |
| `POST` | `/api/reservations/[code]/cancel` | **Añadida tras el despliegue.** El propio solicitante cancela, con `{ requesterDocId }` como llave junto al código. Sin sesión: son dos datos que solo junta quien reservó. |

### Admin (requieren cookie `admin_session`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/login` | `{ password }` → setea cookie. |
| `POST` | `/api/admin/logout` | Borra cookie. |
| `GET` | `/api/admin/reservations?status=&roomId=` | Bandeja con datos del solicitante. |
| `PATCH` | `/api/admin/reservations/[id]` | `{ action: "CONFIRM" \| "REJECT" \| "CANCEL" }`. Cambia estado **y dispara el correo** (a partir de la Fase 7). ~~`REJECT` y `CANCEL` exigen `adminNote`~~ — ver revisión post-Fase-4/pre-Fase-6 más abajo. |
| `GET` | `/api/admin/time-blocks` | Lista de franjas. |
| `POST` | `/api/admin/time-blocks` | Crea una franja. Si es `BLOCKED` y solapa reservas existentes, responde `409` con la lista de conflictos. |
| `DELETE` | `/api/admin/time-blocks/[id]` | Elimina la franja. |

**Transiciones permitidas** (validar en el servidor, `409` si no):
```
PENDING   → CONFIRMED | REJECTED | CANCELLED | EXPIRED
CONFIRMED → CANCELLED
REJECTED  → (final)
CANCELLED → (final)
EXPIRED   → (final)
```

> **Actualizado tras el despliegue.** Dos añadidos sobre el original: `PENDING → CANCELLED` (el solicitante puede retirar su propia solicitud antes de que la revisen) y `PENDING → EXPIRED`, que no lo dispara nadie. Que `EXPIRED` sea terminal no necesitó código extra: `ALLOWED_FROM` en el `PATCH` solo admite origen `PENDING` o `CONFIRMED`, así que las tres acciones del admin sobre una vencida ya devuelven `409 INVALID_TRANSITION`.
>
> La cancelación del solicitante usa **compare-and-set** —el estado va en el `WHERE` del `updateMany`, no solo en una comprobación previa— para que no pise una decisión que el admin acabe de tomar.

> **Revisión pre-Fase 6:** el plan original exigía `adminNote` (motivo) al rechazar o cancelar. El usuario pidió explícitamente lo contrario antes de construir la Fase 6: esas acciones solo piden confirmación en la UI ("¿Estás seguro de...?"), sin capturar un motivo. `adminNote` sigue existiendo en el modelo (nullable) — la Fase 6 no lo escribe nunca, pero queda disponible por si una fase futura decide retomar la captura de motivo. Consecuencia para la Fase 7: el correo de rechazo no podrá incluir una razón específica, porque no se recoge.

---


---

## 7. Correos

~~Tres~~ **Seis** plantillas en `lib/mail/templates.ts`, HTML con **estilos inline** (los clientes de correo no soportan Tailwind ni hojas externas). Diseño: cabecera azul `#007B99` con el logo en blanco, cuerpo blanco, datos en tabla, pie con la frase institucional.

**Al solicitante:**

| Disparador | Asunto | Contenido clave |
|------------|--------|-----------------|
| `CONFIRM` | `Reserva confirmada — {Sala}, {fecha} {hora}` | Sala, fecha, hora inicio–fin, código, nombre. **Si la franja solapa un `TimeBlock` de tipo `WARNING`, incluir el aviso destacado** (ej. "En este horario no hay préstamo de equipos de cómputo"). **Añadido tras el despliegue:** botón "Añadir a Google Calendar". |
| `REJECT` | `Solicitud de reserva no aprobada — {Sala}, {fecha}` | Datos de la solicitud + `adminNote` como motivo (si existe) + invitación a solicitar otro horario. |
| `CANCEL` | `Reserva cancelada — {Sala}, {fecha} {hora}` | Datos + `adminNote` (si existe) + disculpa breve, en la voz de marca (§9 del documento de identidad: sin dramatismo, explicar y ofrecer salida). |
| `selfCancel` | `Cancelaste tu reserva — {Sala}, {fecha} {hora}` | **Añadida tras el despliegue.** Acuse de la cancelación que hizo el propio solicitante. Es plantilla aparte y no reutiliza `CANCEL` a propósito: la redacción de esa ("lamentamos informarte") es la de una cancelación que se sufre, no una que se decide. |

**Al laboratorio** (`MAIL_TO_ADMIN`, añadidos tras el despliegue):

| Disparador | Asunto | Para qué |
|------------|--------|----------|
| Solicitud nueva | `Nueva solicitud por revisar — {fecha} {hora}` | Que nadie tenga que entrar al panel a mirar si llegó algo. |
| Cancela el solicitante | `Reserva cancelada por el solicitante — {fecha} {hora}` | La franja se liberó sin que el admin hiciera nada; conviene enterarse. |

> **El acuse de autocancelación es parte de la seguridad, no cortesía.** El número de documento no es un secreto, así que si alguien cancelara una reserva ajena, el dueño se entera en el momento.
>
> ⚠️ **El enlace de Google Calendar usa el instante UTC real** (`fechaParaGoogleCalendar()`), **no** `toBogotaWallClockIso()`. Ese truco es exclusivo del límite con FullCalendar; aquí metería 5 h de desfase en el calendario de quien pulse el botón.

> **Nota (Fase 7, consecuencia de la revisión pre-Fase 6):** como `adminNote` ya no se captura en ningún punto del flujo (§6), `REJECT`/`CANCEL` casi nunca tendrán motivo que mostrar — la plantilla lo incluye solo si el campo tiene valor (relevante para las tres filas de la semilla que lo traían de antes de ese cambio). El correo explica que la solicitud no fue aprobada / fue cancelada e invita a solicitar otro horario, sin citar una razón específica.

**Requisitos de implementación:**
- El envío **nunca hace fallar la transición de estado**. Orden: actualizar la reserva → intentar enviar → registrar en `EmailLog` (`SENT` / `FAILED` / `LOGGED`). Si el correo falla, la respuesta es `200` con `{ emailStatus: "FAILED" }` y el panel muestra un botón "Reintentar envío".
- Sin `SMTP_HOST` **o sin `SMTP_PASSWORD`**: escribir en consola + `EmailLog` con estado `LOGGED` — `lib/mail/mailer.ts` revisa ambas variables, no solo el host, porque en la práctica el host se configura antes de tramitar la contraseña de aplicación.
- `app/admin/correos/page.tsx` lista `EmailLog` con vista previa del HTML (en un `<iframe sandbox="">`, no `dangerouslySetInnerHTML` — ver nota de seguridad en CLAUDE.md) — es la evidencia visible de que los correos se generan.

> ⚠️ **Nodemailer no funciona en Edge Runtime.** Los handlers que envían correo deben declarar `export const runtime = "nodejs"` explícitamente.

---


---

## 8. Código de colores del calendario

> Las reglas generales de marca —tokens, jerarquía del color, tipografía, gesto
> gráfico, voz de redacción— viven en
> [`identidad-visual-ucla-ui-ux.md`](identidad-visual-ucla-ui-ux.md), y cómo se
> aplican aquí está en `CLAUDE.md`. Lo único que se conserva en esta sección es
> la tabla, porque `Badge.tsx`, `AvailabilityLegend.tsx` y el chequeo de
> conflictos de `api/admin/time-blocks` la citan por número.

Leyenda siempre visible. **Cada estado lleva refuerzo no cromático además del
color**, por daltonismo: quien no distinga el azul del gris tiene que poder
operar igual.

⚠️ Los hex de esta tabla son los de **fondo**. Para el mismo color *como texto*
hay tokens aparte (`--azul-texto`, `--naranja-texto`): los de marca no llegan a
WCAG AA en texto pequeño. Ver "Accesibilidad" en `CLAUDE.md`.

| Estado de la franja | Color | Refuerzo no cromático |
|---------------------|-------|-----------------------|
| Disponible | Blanco / `#F5F5F5` | — |
| Reservada (confirmada) | Azul `#007B99` | Etiqueta "Reservado" |
| En revisión (pendiente) | Azul 200 `#99CBD6` | Borde punteado + "En revisión" |
| Advertencia (sin equipos) | Naranja `#F39200` | Icono de alerta + motivo |
| Bloqueada por el admin | Gris `#848585` | Rayado diagonal + "No disponible" |
| Fuera de horario / receso | `#F5F5F5` atenuado | Sin interacción, sin etiqueta |
| Festivo / fin de semana | `#F5F5F5` atenuado | Etiqueta en la cabecera del día: "Festivo" o "Cerrado" |

---

