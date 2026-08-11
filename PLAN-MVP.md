# Plan de desarrollo — MVP Reservas de Laboratorio UEDA

> **Documento de trabajo para el agente de codificación.** Define qué se construye, con qué tecnologías (y versiones exactas), en qué orden, y con qué criterios de aceptación por fase. La identidad visual está en [`identidad-visual-ucla-ui-ux.md`](identidad-visual-ucla-ui-ux.md) y es **de cumplimiento obligatorio**: todo color, tipografía y espaciado sale de esos tokens.

---

## ⚠️ Cómo leer este documento hoy

**Estado: Fases 0–9 completas. La aplicación está en producción** (https://reservas-laboratorio-ueda.vercel.app). La Fase 10 está parcialmente hecha.

Este sigue siendo el **contrato de alcance, modelo de datos, reglas de negocio y contratos de API** — sigue vigente y hay que respetarlo. Pero fue escrito *antes* de construir, y varias decisiones posteriores lo modificaron. Donde eso pasó, el texto está ~~tachado~~ con una nota al lado.

**Para saber el estado actual y por qué las cosas son como son, la fuente de verdad es [`CLAUDE.md`](CLAUDE.md)**, no este archivo. Ahí están las decisiones de producto tomadas sobre la marcha, las trampas técnicas ya resueltas y lo que queda pendiente. Lo pendiente concreto está en [`BACKLOG.md`](BACKLOG.md).

Desviaciones principales respecto a lo que se lee aquí:

| Tema | Qué dice el plan | Qué se hizo |
|------|------------------|-------------|
| Salas | Dos salas (Principal y de Reuniones) | **Solo Sala Principal.** Decisión de producto tras la Fase 8. El modelo `Room` se mantuvo genérico. |
| Rechazar / cancelar | `adminNote` obligatorio | **Solo confirmación**, sin capturar motivo. Pedido antes de construir la Fase 6. |
| Formulario de reserva | Nombre, cargo, documento, correo, motivo libre, asistentes opcional | Se añadieron **programa académico**, **tipo de actividad** y **aceptación de responsabilidad**; `attendees` pasó a obligatorio y se valida contra el aforo; el campo libre `purpose` se eliminó; el cargo pasó de texto libre a lista cerrada. |
| Estados de la reserva | Cuatro: pendiente, confirmada, rechazada, cancelada | Hay un **quinto, `EXPIRED`** (vencida), para la solicitud que nadie revisó y cuya franja ya pasó. Es el único que no decide una persona. |
| Cancelación | Solo el administrador | El **solicitante también puede cancelar** la suya, con código + documento, hasta que empieza. |
| Correos | Tres plantillas, todas al solicitante | Son **seis**: se añadieron dos avisos internos al laboratorio (`MAIL_TO_ADMIN`) y el acuse de autocancelación. El de confirmación lleva botón de Google Calendar. |
| Versiones del §2 | Ver tabla | Cinco paquetes cambiaron por advisories de seguridad — ver la tabla de desviaciones en `CLAUDE.md`. |
| Logo (riesgo R3) | SVG oficial pendiente | Resuelto: se entregó en **PNG**, sin canal alfa. |

> Las cuatro filas del medio salen de una tanda de nueve ajustes que el usuario pidió **después** de desplegar, ya con la aplicación en uso. Están todos hechos; el detalle de cada decisión está en `CLAUDE.md`.

---

## 1. Contexto y objetivo

El laboratorio UEDA de la Universidad Católica Luis Amigó necesita gestionar la reserva de sus espacios. Hoy no existe sistema: se coordina de forma informal.

**Objetivo del MVP:** una aplicación web funcional, desplegada y presentable en una reunión de avances, que permita a cualquier persona de la comunidad universitaria ver la disponibilidad de las salas y solicitar una reserva escaneando un código QR, y que permita a un administrador gestionar esas solicitudes y la disponibilidad.

### 1.1 Alcance del MVP (sí entra)

| # | Funcionalidad |
|---|---------------|
| F1 | Landing pública accesible por QR con ~~dos calendarios de disponibilidad (Sala de Reuniones y Sala Principal)~~ **un calendario de disponibilidad (Sala Principal) — decisión de producto tras la Fase 8: se retiró Sala de Reuniones, ver §13 y `CLAUDE.md`** |
| F2 | Flujo de solicitud de reserva: sala → día → hora → duración |
| F3 | Formulario de datos del solicitante: nombre, cargo, número de documento, correo institucional |
| F4 | Validación de dominio `@amigo.edu.co` y de todos los campos obligatorios |
| F5 | Detección de choques: no se puede solicitar sobre una franja ya ocupada o bloqueada |
| F6 | Panel de administrador protegido por contraseña |
| F7 | Admin: bloquear franjas horarias (no reservables) |
| F8 | Admin: marcar franjas de **advertencia** (reservables, pero sin préstamo de equipos de cómputo) |
| F9 | Admin: bandeja de solicitudes con confirmar / rechazar / cancelar |
| F10 | Correo automático al solicitante al confirmar, rechazar o cancelar |
| F11 | Página que genera el QR apuntando a la URL pública |
| F12 | Despliegue en Vercel con base de datos en Supabase |

### 1.2 Fuera de alcance del MVP (no entra — anotar como fase 2)

- Autenticación de usuarios finales (SSO institucional).
- Múltiples administradores con roles y auditoría.
- Reservas recurrentes o series.
- Gestión de inventario de equipos de cómputo (solo se marca la advertencia).
- Reportes, métricas y exportación.
- Recordatorios previos, integración con Google Calendar / Outlook (.ics).
- **Correo de acuse de recibo al enviar la solicitud** — decidido: solo se envía correo en la decisión (confirmar / rechazar / cancelar). La pantalla de éxito con el código de reserva cumple la función de acuse.
- Edición de una reserva ya creada por parte del solicitante.

> **Regla para el agente:** no implementar nada de 1.2 sin pedirlo. Si aparece una tentación de "ya que estoy", anotarla en `BACKLOG.md` y seguir.

---

## 2. Stack tecnológico

Criterio de selección: **versiones estables, maduras y ampliamente documentadas**, no las más recientes. Se evita Tailwind v4 y Next 15 a propósito, porque Next 14 + Tailwind 3 tienen mucho más material de referencia y menos fricción de configuración.

### 2.1 Núcleo

| Tecnología | Versión exacta | Por qué |
|------------|----------------|---------|
| **Next.js** | `14.2.18` | App Router estable, Route Handlers, Server Components. La versión con más documentación consolidada. |
| **React** | `18.3.1` | Par estable de Next 14. No usar React 19. |
| **TypeScript** | `5.4.5` | Estable, sin sorpresas de inferencia. |
| **Tailwind CSS** | `3.4.14` | v3 usa `tailwind.config.ts` clásico. **No usar v4** (configuración CSS-first, rompe la mayoría de ejemplos conocidos). |
| **PostCSS / Autoprefixer** | `8.4.47` / `10.4.20` | Requeridos por Tailwind 3. |
| **Node.js** | `20.x` en Vercel | Fijar `"engines": { "node": "20.x" }` en `package.json` para que Vercel no use una versión distinta a la local. |

### 2.2 Datos — Supabase (PostgreSQL) + Prisma

| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Supabase** | capa gratuita | **Solo como servidor PostgreSQL alojado.** No se usa el SDK de Supabase, ni su Auth, ni su Storage. |
| **Prisma ORM** | `5.22.0` | ORM + migraciones + `prisma studio`. |
| **@prisma/client** | `5.22.0` | Cliente generado. |

**Por qué Supabase y no SQLite:** Vercel corre en un filesystem efímero y de solo lectura, así que un archivo SQLite se perdería en cada despliegue. Supabase da un PostgreSQL gestionado en capa gratuita, que es lo que el despliegue exige.

**Por qué Prisma sobre el SDK de Supabase:** Prisma da migraciones versionadas, tipos generados y `prisma studio` (un inspector de base de datos muy útil durante el desarrollo). El SDK de Supabase añadiría un segundo modelo mental sin aportar nada aquí.

> ⚠️ **Trampa crítica — leer antes de configurar el `.env`.** Vercel ejecuta funciones serverless: cada request puede abrir una conexión nueva a Postgres, y Supabase en capa gratuita permite pocas conexiones directas. Hay que usar **dos URLs distintas**:
>
> | Variable | Puerto | Para qué |
> |----------|--------|----------|
> | `DATABASE_URL` | **6543** (pooler, *Transaction mode*) | Consultas en runtime. Debe llevar `?pgbouncer=true&connection_limit=1`. |
> | `DIRECT_URL` | **5432** (conexión directa) | Solo migraciones (`prisma migrate`). PgBouncer en modo transacción no soporta las sentencias DDL de las migraciones. |
>
> Ambas se declaran en el bloque `datasource` del schema. Omitir esto produce el error *"prepared statement already exists"* o agotamiento de conexiones, típicamente **después** de desplegar, no en local.

> ⚠️ **Capa gratuita de Supabase:** los proyectos se **pausan tras 7 días sin actividad**. Si el proyecto lleva más de una semana sin uso, hay que reactivarlo desde el dashboard (tarda ~1 minuto). **Verificar que el proyecto esté activo el día antes de cualquier presentación.**

### 2.3 Formularios y validación

| Paquete | Versión | Rol |
|---------|---------|-----|
| `zod` | `3.23.8` | Esquemas de validación compartidos cliente/servidor. **Fuente única de verdad de las reglas.** |
| `react-hook-form` | `7.53.2` | Manejo de formularios, poco re-render. |
| `@hookform/resolvers` | `3.9.1` | Puente RHF ↔ Zod. |

### 2.4 Fechas y horas

| Paquete | Versión | Rol |
|---------|---------|-----|
| `date-fns` | `3.6.0` | Manipulación y formato de fechas. |
| `date-fns-tz` | `3.2.0` | Conversión de zona horaria. |

**Regla de oro de fechas:** todo se **almacena en UTC** y se **presenta en `America/Bogotá`** (UTC−5, sin horario de verano). Nunca construir fechas con `new Date("2026-08-01 08:00")` sin zona explícita.

> Esto importa más de lo que parece en Vercel: los servidores corren en **UTC**, no en hora de Colombia. Cualquier lógica que dependa de `new Date()` sin conversión explícita funcionará en local y fallará en producción — típicamente con 5 horas de desfase en la validación de "anticipación mínima" y en el cálculo del horario de atención.

### 2.5 Calendario (UI)

| Paquete | Versión | Rol |
|---------|---------|-----|
| `@fullcalendar/react` | `6.1.15` | Wrapper React. |
| `@fullcalendar/core` | `6.1.15` | Núcleo. |
| `@fullcalendar/timegrid` | `6.1.15` | Vista semanal por franjas horarias (la vista principal). |
| `@fullcalendar/daygrid` | `6.1.15` | Vista mensual (opcional). |
| `@fullcalendar/interaction` | `6.1.15` | Click/selección de franjas. |

Uso **en modo lectura** en la landing. Los componentes de FullCalendar van en Client Components (`"use client"`). Se estiliza sobrescribiendo sus variables CSS para respetar la marca.

> **Alternativa si el theming se complica:** grilla semanal propia con CSS Grid + Tailwind. Da control total de marca y elimina una dependencia pesada, a costa de ~1 día. Decidir al inicio de la Fase 3 y no volver a cambiar.

### 2.6 Correo

| Paquete | Versión | Rol |
|---------|---------|-----|
| `nodemailer` | `6.9.16` | Envío por SMTP. |
| `@types/nodemailer` | `6.4.16` | Tipos. |

Configurado contra **Google Workspace** (el correo institucional es Gmail). Ver §10 para la explicación completa de qué es SMTP y cómo obtener las credenciales.

El envío se encapsula en `lib/mail/mailer.ts` detrás de `sendMail(to, subject, html)`. Si `SMTP_HOST` está vacío, el mailer **loguea en consola y registra en `EmailLog`** en vez de fallar, para poder trabajar sin credenciales.

### 2.7 UI y utilidades

| Paquete | Versión | Rol |
|---------|---------|-----|
| `@radix-ui/react-dialog` | `1.1.2` | Modal accesible del formulario de reserva. |
| `@radix-ui/react-select` | `2.1.2` | Selects accesibles. |
| `lucide-react` | `0.454.0` | Iconografía de línea, sobria. |
| `clsx` | `2.1.1` | Composición de clases. |
| `tailwind-merge` | `2.5.4` | Resolución de conflictos de clases Tailwind. |
| `sonner` | `1.7.0` | Toasts. |
| `qrcode.react` | `4.1.0` | Render del QR en `/admin/qr`. |
| `jose` | `5.9.6` | Firma/verificación del JWT de sesión del admin. Funciona en Edge Runtime (el middleware lo requiere). |

> **No se usa `shadcn/ui`.** Su CLI actual asume Tailwind v4 y generaría fricción. Como la identidad visual es estricta, se construyen a mano los ~8 componentes necesarios en `components/ui/`, usando Radix solo donde hace falta accesibilidad no trivial.

### 2.8 Autenticación del admin

**Decisión: no usar NextAuth.** Para un solo administrador es sobredimensionado.

1. `POST /api/admin/login` compara la contraseña recibida con `ADMIN_PASSWORD`.
2. Si coincide, firma un JWT con `jose` usando `AUTH_SECRET` y lo setea en una cookie `admin_session` — `httpOnly`, `secure` en producción, `sameSite: "lax"`, expiración 8 h.
3. `middleware.ts` protege `/admin/**` (excepto `/admin/login`).
4. **Cada handler de `/api/admin/**` verifica la cookie por su cuenta** — el middleware no basta como única defensa.

---

## 3. Estructura del proyecto

```
reservas-laboratorio-ueda/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                      # salas + datos de demo
├── public/
│   ├── logo-ucla.svg                # solicitar a Comunicaciones
│   └── logo-ucla-blanco.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx               # fuentes, <Toaster/>, metadata
│   │   ├── globals.css              # tokens CSS de marca + capas Tailwind
│   │   ├── page.tsx                 # LANDING pública: dos calendarios + CTA
│   │   ├── reservar/page.tsx        # wizard de reserva
│   │   ├── reserva/[codigo]/page.tsx # comprobante consultable
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── layout.tsx           # shell del panel
│   │   │   ├── page.tsx             # bandeja de solicitudes
│   │   │   ├── franjas/page.tsx     # bloqueos y advertencias
│   │   │   ├── correos/page.tsx     # registro de EmailLog
│   │   │   └── qr/page.tsx          # QR imprimible
│   │   └── api/
│   │       ├── rooms/route.ts
│   │       ├── availability/route.ts
│   │       ├── reservations/route.ts
│   │       ├── reservations/[code]/route.ts
│   │       └── admin/
│   │           ├── login/route.ts
│   │           ├── logout/route.ts
│   │           ├── reservations/route.ts
│   │           ├── reservations/[id]/route.ts
│   │           ├── time-blocks/route.ts
│   │           └── time-blocks/[id]/route.ts
│   ├── components/
│   │   ├── ui/                      # Button, Input, Select, Card, Badge, Dialog, Field
│   │   ├── brand/                   # Logo, ArcoDecorativo, Header, Footer
│   │   ├── calendar/                # RoomCalendar, AvailabilityLegend
│   │   └── reservation/             # StepRoom, StepDateTime, StepRequester, StepReview
│   ├── lib/
│   │   ├── db.ts                    # singleton PrismaClient
│   │   ├── auth.ts                  # JWT, getAdminSession()
│   │   ├── datetime.ts              # zona horaria, generación de slots
│   │   ├── availability.ts          # solapamientos y estado de franja
│   │   ├── validation/
│   │   │   ├── reservation.ts
│   │   │   └── time-block.ts
│   │   └── mail/
│   │       ├── mailer.ts
│   │       └── templates.ts
│   ├── config/
│   │   ├── booking.ts               # horarios, granularidad, duraciones, límites
│   │   └── holidays.ts              # festivos colombianos por año
│   └── middleware.ts
├── .env.example
├── tailwind.config.ts
├── PLAN-MVP.md
└── identidad-visual-ucla-ui-ux.md
```

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

## 8. Diseño e identidad visual

Cumplimiento obligatorio de [`identidad-visual-ucla-ui-ux.md`](identidad-visual-ucla-ui-ux.md). Resumen operativo:

- **Tokens:** copiar el bloque `:root` de la §12.1 del documento de marca a `globals.css` y **mapearlo en `tailwind.config.ts`** para exponer `bg-primary`, `text-accent`, etc. No escribir hex sueltos en componentes.
- **Jerarquía:** azul estructura · blanco respira · naranja señala **una sola cosa** por vista · gris acompaña.
- **Tipografía:** `Montserrat` (display) + `Inter` (cuerpo) vía `next/font/google` — evita FOUT y no requiere licencia.
- **Gesto de marca:** un solo arco/anillo naranja por pantalla, en la cabecera de la landing.
- **Logo:** SVG en la top bar. Mientras Comunicaciones no entregue el arte oficial, placeholder tipográfico — **nunca** un PNG reescalado ni una versión recoloreada. **Actualización:** el usuario entregó el arte oficial como PNG (no SVG) tras la Fase 8; se usa tal cual, sin reescalar ni recolorear — ver R3 y la nota de ajustes post-Fase 8 en `CLAUDE.md`.
- **Accesibilidad:** WCAG AA, foco de teclado visible, `prefers-reduced-motion`. Texto sobre naranja siempre `#2E2E2E`, nunca blanco.
- **Copy:** voz cercana y activa. Los botones dicen qué hacen: "Solicitar reserva", "Confirmar reserva", "Rechazar solicitud".

**Código de colores del calendario** (leyenda siempre visible; cada estado lleva refuerzo no cromático, por daltonismo):

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

## 9. Orden de desarrollo

Diez fases. **Cada una termina en un estado ejecutable y verificable.** No empezar la siguiente sin cumplir los criterios de aceptación.

---

### Fase 0 — Infraestructura de datos y andamiaje
**Objetivo:** proyecto corriendo contra Supabase, con la marca ya aplicada.

1. Crear el proyecto en [supabase.com](https://supabase.com) (región **East US** — la más cercana a Colombia con menor latencia hacia Vercel). Guardar la contraseña de la base de datos: **solo se muestra una vez**.
2. Copiar las dos cadenas de conexión desde *Project Settings → Database → Connection string*: la de **Transaction pooler (6543)** para `DATABASE_URL` y la **Direct connection (5432)** para `DIRECT_URL`.
3. `npx create-next-app@14.2.18` con TypeScript, Tailwind, App Router, `src/`, alias `@/*`. **Sin Turbopack.**
4. Fijar las versiones exactas del §2 en `package.json` (sin `^`) e instalar. Añadir `"postinstall": "prisma generate"` y `"engines": { "node": "20.x" }`.
5. Volcar los tokens de marca a `globals.css` y extender `tailwind.config.ts` (`colors`, `fontFamily`, `borderRadius`, `boxShadow`).
6. Configurar `next/font/google` (Montserrat + Inter) en `app/layout.tsx`.
7. Construir `components/ui/`: `Button` (primary/secondary/accent/ghost/danger), `Input`, `Select`, `Textarea`, `Card`, `Badge`, `Field` (label + error + ayuda), `EmptyState`.
8. Construir `components/brand/`: `Logo`, `Header`, `Footer`, `ArcoDecorativo`.
9. Crear `/kitchen-sink` (temporal) mostrando todos los componentes en todos sus estados.

**Aceptación:** `npm run dev` levanta sin errores; `/kitchen-sink` muestra los componentes con los colores institucionales; `npm run build` pasa limpio.

---

### Fase 1 — Modelo de datos y semilla
1. `prisma/schema.prisma` según §4. `npx prisma migrate dev --name init`. Verificar en el *Table Editor* de Supabase que las tablas existen.
2. `lib/db.ts` con el singleton de `PrismaClient` (patrón `globalThis`, imprescindible en serverless).
3. `prisma/seed.ts`: crea las dos salas y ~6 reservas de ejemplo repartidas entre estados, más 2 `TimeBlock` (uno `BLOCKED`, uno `WARNING`) en la semana en curso. Registrar el script en `package.json` (`prisma.seed`).

   | Sala | `slug` | Aforo | Equipos de cómputo | `colorToken` |
   |------|--------|-------|--------------------|--------------|
   | Sala Principal | `sala-principal` | 20 | Sí | `azul` |
   | ~~Sala de Reuniones~~ | ~~`sala-reuniones`~~ | ~~7~~ | ~~No~~ | ~~`naranja`~~ |

   > **Actualización tras la Fase 8:** Sala de Reuniones se retiró por decisión de producto (§13). El modelo `Room` sigue siendo genérico — no se tocó el schema —, pero `prisma/seed.ts` ya no la crea y borró la fila existente; las dos reservas de demo que tenía se reasignaron a Sala Principal. Ver `CLAUDE.md`.

4. `config/booking.ts` con `BOOKING_CONFIG` del §5 y `config/holidays.ts` con `HOLIDAYS_CO` del §5.1.
5. `lib/datetime.ts`: `toBogota()`, `fromBogota()`, `generateSlots(date, room)`, `getOpeningRangesFor(date)`, `isHoliday(date)`, `fitsInSingleRange(start, end)`, `formatRange()`.
6. `lib/availability.ts`: `overlaps(a, b)`, `getSlotState(slot, reservations, blocks)`, `findConflicts()`.

**Aceptación:** `npx prisma studio` muestra las 2 salas con sus aforos y los datos de demo. Existe `scripts/check-datetime.ts` que imprime y verifica los casos límite: 08:00, 12:00, 13:00, 17:00, una reserva que intenta cruzar el receso, un sábado, un festivo trasladado (ej. 2026-01-12), y un cálculo de anticipación mínima corriendo con `TZ=UTC` (simulando Vercel). *(Estado tras la Fase 8: `prisma studio` muestra 1 sala activa — ver actualización arriba.)*

---

### Fase 2 — API de lectura
1. `GET /api/rooms`.
2. `GET /api/availability` con validación Zod de query params y **anonimización** de reservas.

**Aceptación:** `curl "http://localhost:3000/api/availability?roomId=...&from=...&to=..."` devuelve JSON correcto y **sin datos personales**. Un `from` inválido devuelve `400` con el formato de error uniforme.

---

### Fase 3 — Landing pública con ~~los dos calendarios~~ el calendario
1. `app/page.tsx`: cabecera de marca con el arco, título, texto breve, leyenda de colores, dos `RoomCalendar` lado a lado en escritorio y apilados en móvil.
2. `components/calendar/RoomCalendar.tsx` (`"use client"`): FullCalendar en `timeGridWeek`, `slotMinTime: "08:00"` / `slotMaxTime: "17:00"`, `locale` es, `allDaySlot: false`, `weekends: false` (el laboratorio no abre). El receso 12:00–13:00 se pinta como no disponible. Los días festivos se atenúan y se etiquetan "Festivo" en la cabecera del día. Colores según §8.
3. Botón destacado **"Reservar espacio"** (única acción en naranja de la pantalla).
4. Responsive: **la landing se abre desde un QR, así que móvil es el caso principal.** En pantallas pequeñas, vista por defecto `timeGridDay` con navegación por días.

**Aceptación:** a 390 px de ancho se ven ambos calendarios legibles con la disponibilidad y la leyenda; no hay scroll horizontal; el receso se distingue de una franja bloqueada; una semana que contenga un festivo lo muestra atenuado y etiquetado.

> **Revisión post-Fase 3 (con la Fase 4 ya construida):** dos cambios de diseño sobre lo anterior, pedidos explícitamente por el usuario tras ver el resultado. (1) Los calendarios ya no se muestran de entrada: cada uno empieza plegado detrás de un botón "Ver disponibilidad de {sala}" — menos que cargar antes de decidir qué sala mirar, coherente con que la landing se abre desde un QR. (2) El calendario dejó de ser "sin edición": ahora es clicable (`@fullcalendar/interaction`). Clicar una franja libre o con `WARNING` navega a `/reservar?roomId=&startsAt=` con la hora ya elegida — ver Fase 4.
>
> **Actualización tras la Fase 8:** el punto (1) ya no aplica. Con una sola sala (ver §13), el plegado perdió su motivo —existía para elegir *qué* calendario mirar— y `CalendarGrid.tsx` se eliminó: ahora `RoomAvailability.tsx` muestra el único calendario directo y a todo el ancho. El enlace del punto (2) quedó en `?startsAt=`, sin `roomId`. Ver `CLAUDE.md`.

---

### Fase 4 — Flujo de solicitud de reserva
Wizard de 3 pasos + confirmación, en página `/reservar`.

1. **Paso 1 — Espacio y horario:** selector de sala, selector de día, grilla de horas disponibles (deshabilitando ocupadas, bloqueadas y las que no caben en la jornada), selector de duración. Las franjas `WARNING` son seleccionables con el aviso visible.
2. **Paso 2 — Datos del solicitante:** nombre completo, cargo, número de documento, correo institucional, motivo (opcional), n.º de asistentes (opcional). Validación en vivo con RHF + Zod, mensajes en español y en voz de marca.
3. **Paso 3 — Revisión:** resumen, aviso destacado si aplica `WARNING`, texto de que la reserva queda **sujeta a aprobación**, botón "Enviar solicitud".
4. `POST /api/reservations` con las 12 validaciones del §5.
5. Pantalla de éxito con el **código de reserva** y enlace a `/reserva/[codigo]`. Como no hay correo de acuse, esta pantalla debe invitar explícitamente a guardar o fotografiar el código.
6. Error de carrera: si la franja se ocupó mientras el usuario llenaba el formulario → mensaje claro ("Esa franja acaba de ser reservada, elige otra") y vuelta al paso 1 con el calendario refrescado.

**Aceptación:** una reserva válida aparece como `PENDING` en Prisma Studio y como "En revisión" en el calendario. Un correo `@gmail.com` se rechaza con el mensaje del §5, regla 2. Una franja bloqueada no es seleccionable. Una reserva 11:00–14:00 se rechaza por cruzar el receso. Un festivo y un fin de semana no ofrecen ninguna franja. Enviar dos veces la misma franja falla la segunda vez.

> **Revisión post-Fase 3/4:** `/reservar` acepta `?roomId=&startsAt=` para llegar con la sala y la hora ya elegidas (validado contra las salas reales antes de confiar en la URL; si no cuadra, el wizard arranca vacío sin romper nada). El Paso 1 sigue existiendo — sala, día y franja se ven pre-seleccionados y editables —, pero con esos dos parámetros el selector de duración queda visible de inmediato, sin repetir la elección de horario que ya se hizo en el calendario.
>
> **Actualización tras la Fase 8:** con una sola sala reservable (ver §13), el Paso 1 ya no tiene selector de sala — solo día, hora y duración —, y el enlace desde el calendario quedó en `?startsAt=` sin `roomId` (redundante cuando solo hay una sala). Ver `CLAUDE.md`.

---

### Fase 5 — Autenticación y shell del admin
1. `lib/auth.ts`: `signAdminToken()`, `verifyAdminToken()`, `getAdminSession()`.
2. `POST /api/admin/login` y `/logout`.
3. `middleware.ts` protegiendo `/admin/:path*` excepto `/admin/login`.
4. `app/admin/login/page.tsx`: pantalla centrada, fondo azul con textura sutil, logo en blanco (patrón "splash/login" del §7 del documento de marca).
5. `app/admin/layout.tsx`: shell con navegación (Solicitudes · Franjas · Correos · QR) y botón de salir.
6. **Cada handler de `/api/admin/**` verifica la sesión por su cuenta.**

**Aceptación:** entrar a `/admin` sin sesión redirige a login; con la contraseña correcta se accede; `curl` a `/api/admin/reservations` sin cookie devuelve `401`.

---

### Fase 6 — Bandeja de solicitudes
1. `app/admin/page.tsx`: lista de reservas con filtros por estado y sala, ordenadas por fecha de inicio. Tarjetas en móvil, tabla en escritorio.
2. Detalle expandible con todos los datos del solicitante.
3. Acciones: **Confirmar**, **Rechazar** y **Cancelar**, cada una con un diálogo de confirmación simple ("¿Estás seguro de...?") — sin motivo, ver revisión pre-Fase 6 en el §6.
4. `PATCH /api/admin/reservations/[id]` validando las transiciones permitidas.
5. Toasts + revalidación de la lista tras cada acción.
6. Contador de pendientes visible en la navegación.

**Aceptación:** confirmar una solicitud la mueve a `CONFIRMED` y la pinta como reservada en el calendario público. Confirmar una ya rechazada devuelve `409`.

---

### Fase 7 — Correos automáticos
1. Obtener las credenciales SMTP siguiendo el §10.
2. `lib/mail/mailer.ts` con el fallback a consola + `EmailLog`.
3. `lib/mail/templates.ts` con las tres plantillas del §7 (las otras tres llegaron después del despliegue).
4. Conectar el envío a `PATCH /api/admin/reservations/[id]`, **después** de la escritura en BD.
5. `app/admin/correos/page.tsx`: listado de `EmailLog` con vista previa y botón "Reintentar".

**Aceptación:** confirmar una reserva genera un registro en `EmailLog` y el correo llega a una bandeja real, legible en escritorio y móvil. Con SMTP caído, la reserva igual queda confirmada y el log marca `FAILED`.

---

### Fase 8 — Gestión de franjas (bloqueos y advertencias)
1. `app/admin/franjas/page.tsx`: lista de franjas vigentes + formulario de creación (sala o "todas", fecha, hora inicio, hora fin, tipo, motivo).
2. `POST` y `DELETE` de `/api/admin/time-blocks`.
3. Al crear un `BLOCKED` que solapa reservas: `409` con la lista de conflictos y diálogo — *"Hay 2 reservas en ese horario. Cancélalas primero o elige otro rango."*
4. Verificar que ambos tipos se reflejan en el calendario público y en el wizard.

**Aceptación:** bloquear una franja la vuelve no seleccionable en el wizard; una franja de advertencia sigue siendo reservable, muestra el motivo en el paso 3, y ese motivo aparece en el correo de confirmación.

> **Decisión de implementación:** el formulario pide **fecha de inicio y fecha de fin por separado** (no un solo día + hora de inicio/fin, como el wizard público). Una franja de admin puede abarcar varios días — "semana de receso", una jornada institucional de varios días — y a diferencia de una reserva no está sujeta a `fitsInSingleRange`/`isAlignedToSlot` de `lib/datetime.ts` (esas reglas son de la grilla de reserva del público, no aplican a lo que el admin declara como cerrado). El chequeo de conflicto al crear un `BLOCKED` compara contra reservas `PENDING`/`CONFIRMED`, filtrando por sala solo si `roomId` no es `null` — una franja global (`roomId: null`) choca con una reserva de **cualquier** sala.

---

### Fase 9 — Despliegue en Vercel
1. Subir el proyecto a un repositorio de GitHub (`.env` en `.gitignore`).
2. Importar el repositorio en Vercel. Framework detectado: Next.js.
3. Cargar **todas** las variables del §12 en *Settings → Environment Variables*, para los entornos Production y Preview.
4. `NEXT_PUBLIC_APP_URL` debe apuntar al dominio real de Vercel — **el QR codifica esta URL**, así que un valor incorrecto rompe la funcionalidad principal.
5. Aplicar las migraciones a la base de datos de producción: `npx prisma migrate deploy` con `DIRECT_URL` apuntando a Supabase.
6. Ejecutar el seed contra producción una sola vez.
7. Verificar el despliegue: landing, wizard completo, login de admin, confirmación con correo real.

**Aceptación:** el flujo completo funciona desde la URL pública de Vercel, en un teléfono real, con datos persistiendo en Supabase.

> **✅ COMPLETA.** Desplegada en https://reservas-laboratorio-ueda.vercel.app (subdominio de Vercel: decisión explícita del usuario, no hay dominio propio). Verificada con peticiones reales contra esa URL, incluyendo que la cookie de sesión de admin autorice efectivamente las rutas protegidas.
>
> Dos desviaciones respecto a los pasos de arriba:
> - **El paso 6 (seed contra producción) no aplica como está escrito.** No existe una base de datos separada: local y producción comparten el mismo proyecto de Supabase, que ya estaba migrado y sembrado desde la Fase 1. Además el usuario limpió después los datos de demo a propósito, para dejar la aplicación lista para uso real. **`prisma db seed` es destructivo contra producción** — ver `CLAUDE.md`.
> - **El paso 7 quedó a medias:** se verificó landing, wizard, login de admin y todas las rutas, pero **no una reserva completa con correo real desde producción**. Sigue pendiente en `BACKLOG.md`.
>
> Las trampas encontradas al desplegar (el primer `vercel deploy` va siempre a producción, la Production Branch por defecto, `vercel env add` con caracteres `<`/`>`) están documentadas en `CLAUDE.md`.

---

### Fase 10 — QR, pulido y cierre
1. `app/admin/qr/page.tsx`: QR con `qrcode.react` apuntando a `NEXT_PUBLIC_APP_URL`, con logo y el texto "Escanea para reservar", en formato imprimible (media query de impresión, tamaño carta).
2. Metadata y Open Graph (título, descripción, imagen).
3. Estados de carga (skeletons) y estados vacíos con la voz de marca.
4. `error.tsx`, `not-found.tsx`, `loading.tsx`.
5. Revisión de accesibilidad: navegación completa por teclado, `aria-label` en los controles del calendario, contraste verificado.
6. Eliminar `/kitchen-sink`.
7. `npm run build` limpio, sin warnings de tipos.
8. Dataset de demostración: la semana en curso poblada con reservas realistas en todos los estados, una franja bloqueada (mantenimiento) y una de advertencia (sin préstamo de equipos).
9. `README.md` con instalación, variables de entorno y pasos de despliegue.

**Aceptación:** recorrido completo end-to-end desde un teléfono real escaneando el QR impreso, terminando con el correo de confirmación recibido.

> **🟡 PARCIAL.** Hechos: **1** (la ruta real es `app/admin/(protected)/qr/page.tsx`, dentro del route group), **4** (las tres, más un `global-error.tsx` que el plan no pedía), **7** y **9**. Parciales: **2** (falta la imagen OG) y **3** (el calendario, `EmptyState` y las pantallas del punto 4 sí; el resto no se repasó). Pendientes: **5** y **6**.
>
> El punto **8 queda anulado a propósito**: contradice la decisión del usuario de limpiar los datos de prueba para uso real.
>
> El seguimiento vivo de lo que falta está en [`BACKLOG.md`](BACKLOG.md), no aquí.

---

## 10. Correo institucional: qué es SMTP y cómo obtener las credenciales

> Esta sección es explicativa. El correo institucional de la universidad corre sobre **Google Workspace**, así que aplican las instrucciones de Gmail.

### 10.1 Qué es SMTP, en corto

**SMTP** (*Simple Mail Transfer Protocol*) es el protocolo estándar para **enviar** correo. La aplicación no tiene un sistema de correo propio: lo que hace es **iniciar sesión en un buzón real y pedirle que envíe un mensaje**, exactamente igual que hacen Outlook o Thunderbird cuando los configuras con tu cuenta.

Para eso necesita cuatro datos:

| Dato | Qué es | Valor para Google Workspace |
|------|--------|-----------------------------|
| **Host** | Dirección del servidor de envío | `smtp.gmail.com` |
| **Puerto** | Puerto de conexión | `587` (con STARTTLS) o `465` (con SSL directo) |
| **Usuario** | La dirección de correo completa | ej. `lab.analitica@amigo.edu.co` |
| **Contraseña** | Credencial de acceso | ⚠️ **No la contraseña normal** — ver 10.2 |

Los correos salidos **aparecen enviados desde ese buzón** y quedan en su carpeta "Enviados". Si alguien responde a un correo de confirmación, la respuesta llega a ese mismo buzón. Por eso conviene usar la cuenta del laboratorio y no una cuenta personal.

### 10.2 Contraseña de aplicación (el paso que suele trabar a todo el mundo)

Google **bloquea el acceso SMTP con la contraseña normal de la cuenta** desde 2022. En su lugar hay que generar una *contraseña de aplicación*: una clave de 16 caracteres, específica para una aplicación, revocable de forma independiente y que no da acceso al resto de la cuenta.

**Pasos, con la cuenta del laboratorio ya iniciada:**

1. Ir a [myaccount.google.com/security](https://myaccount.google.com/security).
2. Activar la **Verificación en 2 pasos** si no lo está. **Es requisito obligatorio**: sin ella la opción de contraseñas de aplicación ni siquiera aparece.
3. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
4. Escribir un nombre identificable — por ejemplo `Reservas Laboratorio UEDA`.
5. Google muestra una clave de 16 caracteres del tipo `abcd efgh ijkl mnop`. **Se muestra una sola vez.** Copiarla y **quitarle los espacios** al pegarla en la variable de entorno.

**Si `/apppasswords` da error o no carga:** el administrador de Google Workspace de la universidad tiene deshabilitada esa función para el dominio. Es una restricción común en instituciones. En ese caso hay que escribir a la oficina de TI pidiendo una de estas dos cosas:

- que habiliten contraseñas de aplicación para la cuenta del laboratorio; o
- una cuenta de servicio / relay SMTP institucional con sus credenciales.

**Empezar este trámite en la Fase 0**, no en la Fase 7 — es la dependencia externa más lenta del proyecto y no depende de ti.

### 10.3 Configuración resultante

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"                          # false con 587 (STARTTLS); true con 465
SMTP_USER="lab.analitica@amigo.edu.co"    # la cuenta del laboratorio
SMTP_PASSWORD="abcdefghijklmnop"             # contraseña de aplicación, sin espacios
MAIL_FROM="Laboratorio de Analítica de Datos e Inteligencia Artificial <lab.analitica@amigo.edu.co>"
```

> ⚠️ **La dirección de `MAIL_FROM` debe ser la misma de `SMTP_USER`** (o un alias configurado en esa cuenta). Gmail rechaza remitentes arbitrarios; poner un `no-responder@...` que no exista hace fallar el envío.

**Límites:** Google Workspace permite ~2 000 destinatarios al día por cuenta. Para este sistema es más que suficiente.

**Seguridad:** la contraseña de aplicación **nunca** va al repositorio. Solo en `.env` local (ignorado por git) y en las variables de entorno de Vercel. Si se filtra, se revoca desde la misma página de Google sin tocar la contraseña real de la cuenta.

### 10.4 Mientras no haya credenciales

Dos opciones para desarrollar sin bloquearse:

- **Sin configurar nada:** con `SMTP_HOST` vacío, el mailer escribe el correo en consola y lo guarda en `EmailLog`. El flujo completo es demostrable desde `/admin/correos`.
- **[Ethereal](https://ethereal.email):** genera credenciales SMTP falsas al instante. Los correos no se entregan a nadie, pero se ven renderizados en su web — sirve para verificar que el HTML de las plantillas se ve bien.

---

## 11. Despliegue: Vercel + Supabase (capa gratuita)

### 11.1 Qué hace cada uno

| Servicio | Rol | Límite relevante de la capa gratuita |
|----------|-----|--------------------------------------|
| **Vercel** (plan Hobby) | Aloja la aplicación Next.js. Despliegue automático en cada `push`. | 100 GB de ancho de banda/mes. Sobrado. **Uso no comercial** — un proyecto universitario interno encaja. |
| **Supabase** (plan Free) | Aloja la base de datos PostgreSQL. | 500 MB de almacenamiento; **el proyecto se pausa tras 7 días sin actividad**. |

### 11.2 Puntos críticos

1. **Las dos URLs de conexión** (§2.2). Es el error número uno al combinar Prisma + Supabase + serverless.
2. **`postinstall: prisma generate`** en `package.json`. Vercel cachea `node_modules`; sin este script, el cliente de Prisma queda desactualizado tras cambiar el schema y el build falla con errores de tipos confusos.
3. **Las migraciones no se ejecutan solas.** Tras cambiar el schema hay que correr `npx prisma migrate deploy` apuntando a la base de datos de producción. Alternativa: añadirlo al `buildCommand` de Vercel (`prisma migrate deploy && next build`).
4. **Los servidores corren en UTC.** Ver la advertencia del §2.4.
5. **`NEXT_PUBLIC_APP_URL`** debe ser el dominio final, porque el QR lo codifica.
6. **La pausa por inactividad de Supabase** es el riesgo más tonto y más probable de arruinar una demostración: verificar que el proyecto esté despierto el día anterior.

### 11.3 Alternativa si Supabase estorba

**Neon** (también capa gratuita, también PostgreSQL) no pausa proyectos con la misma agresividad y tiene mejor integración con Vercel. Si la pausa de Supabase resulta molesta, migrar es cambiar `DATABASE_URL` y `DIRECT_URL` y volver a correr las migraciones — el código no cambia.

---

## 12. Variables de entorno

`.env.example` (commitear este archivo; **nunca** el `.env`):

```bash
# ---- Base de datos (Supabase) ----
# Pooler, puerto 6543 — para el runtime. Los parámetros del final son obligatorios.
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Conexión directa, puerto 5432 — solo para migraciones.
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# ---- Sesión de administrador ----
ADMIN_PASSWORD="cambiar-por-una-contrasena-fuerte"
AUTH_SECRET="cadena-aleatoria-de-32-bytes"   # generar con: openssl rand -base64 32

# ---- URL pública (la que codifica el QR) ----
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # en Vercel: https://<proyecto>.vercel.app

# ---- Correo (Google Workspace). Ver §10. ----
# Si SMTP_HOST está vacío, el mailer solo registra en consola y en EmailLog.
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="lab.analitica@amigo.edu.co"
SMTP_PASSWORD=""                             # contraseña de aplicación de 16 caracteres, sin espacios
MAIL_FROM="Laboratorio de Analítica de Datos e Inteligencia Artificial <lab.analitica@amigo.edu.co>"

# Buzón interno de los AVISOS al laboratorio (§7). Añadida tras el despliegue.
# Hoy coincide con SMTP_USER —el laboratorio se avisa a sí mismo— pero es
# variable aparte a propósito: el día que los avisos deban ir a otra persona se
# cambia esto y no el remitente de todos los correos. Vacía = no se envían.
MAIL_TO_ADMIN="lab.analitica@amigo.edu.co"
```

Son **doce** variables. El [`.env.example`](.env.example) del repositorio es la versión viva de este bloque y va bastante más comentado; si los dos difieren, manda el `.env.example`.

---

## 13. Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Horario de atención | **8:00–12:00 y 13:00–17:00**, de lunes a viernes. Receso de 12:00 a 13:00 no reservable. Una reserva no puede cruzarlo. |
| Días cerrados | **Sábados, domingos y festivos colombianos.** Los festivos viven en `config/holidays.ts` (§5.1); los cierres excepcionales los crea el admin como `TimeBlock`. |
| Salas | **Sala Principal**: aforo ~~20~~ **25** (valor real, corregido tras el despliegue), con equipos de cómputo. ~~**Sala de Reuniones**: aforo 7, sin equipos.~~ **Retirada tras la Fase 8** (decisión de producto: solo se reserva Sala Principal). El modelo `Room` se mantuvo genérico por si se reactiva una segunda sala; el wizard y la landing ya no muestran selector de sala. Ver `CLAUDE.md`. |
| Duración de reservas | De **30 minutos a 4 horas**, en bloques de 30 min. |
| Correo institucional | **Google Workspace** → SMTP de Gmail con contraseña de aplicación (§10). |
| Acuse de recibo | **No se envía al solicitante.** Solo hay correo al confirmar, rechazar o cancelar; la pantalla de éxito con el código cumple esa función. **Matiz posterior:** al *laboratorio* sí se le avisa de cada solicitud nueva (`MAIL_TO_ADMIN`, §7) — es otra cosa. |
| Persistencia | **Supabase PostgreSQL** (capa gratuita) vía Prisma. |
| Despliegue | **Vercel** (plan Hobby). |
| Aprobación | **Siempre manual.** No hay auto-confirmación en el MVP. |
| Reservas pendientes | **Ocupan la franja** mientras están en revisión, para evitar solicitudes duplicadas sobre el mismo horario. |

---

## 14. Riesgos y datos pendientes

| # | Asunto | Impacto | Manejo |
|---|--------|---------|--------|
| ~~P1~~ | ~~**Dirección real del correo del laboratorio**~~ | ~~Bloquea la Fase 7.~~ | **RESUELTO.** La dirección confirmada es `lab.analitica@amigo.edu.co` y está aplicada en todo el plan y en `.env.example`. |
| ~~P2~~ | ~~**La lista de festivos de 2026 está calculada, no verificada**~~ | ~~Se aceptarían reservas un día festivo.~~ | **RESUELTO en la Fase 1, y la sospecha estaba justificada: faltaba un festivo.** Se recalculó la Pascua (5 abr 2026) y se revisó traslado por traslado; las 18 fechas originales son correctas, pero la **Ley 2578 de 2026** (sancionada el 1 de junio de 2026) creó el Día de Nuestra Señora del Rosario de Chiquinquirá: 9 de julio, trasladado al **lunes 13 de julio de 2026**. Son **19 festivos**, no 18. Lección para 2027: el calendario puede cambiar por ley dentro del mismo año, así que la lista se revisa al añadir cada año nuevo, no una sola vez. |
| ~~R1~~ | ~~Google Workspace institucional puede tener deshabilitadas las contraseñas de aplicación.~~ | ~~El correo no sale.~~ | **RESUELTO en la Fase 7.** `/apppasswords` sí estaba habilitado para `lab.analitica@amigo.edu.co`: se generó la contraseña de aplicación sin fricción y el envío real se verificó de punta a punta (ver Fase 7 más abajo). |
| R2 | La lista de festivos se queda sin años. | El sistema abriría festivos de 2027 en silencio. | `console.warn` al arrancar + aviso en el panel si el año en curso no está en `HOLIDAYS_CO` (§5.1). |
| ~~R3~~ | ~~No hay logo oficial en SVG.~~ | ~~Incumplimiento de marca.~~ | **RESUELTO tras la Fase 8.** El usuario entregó el arte oficial en PNG (no llegó a haber SVG). `Logo.tsx` lo usa sin recolorear ni reescalar — ver nota de ajustes post-Fase 8 en `CLAUDE.md`. |
| R4 | Supabase pausa el proyecto tras 7 días sin actividad. | La aplicación aparece caída. | Verificar el estado antes de cualquier presentación. Alternativa: Neon (§11.3). |
| R5 | Una sola contraseña de admin, sin usuarios reales. | Aceptable en MVP, no en producción. | Documentado como fase 2 (SSO institucional). Contraseña fuerte y rotada tras la demo. |
| R6 | Sin autenticación del solicitante, cualquiera con un correo `@amigo.edu.co` válido puede reservar a nombre de otro. | Uso indebido. | Aceptado en MVP; el admin aprueba manualmente. Fase 2: verificación por enlace al correo. |
| R7 | Vercel Hobby es de uso no comercial. | Riesgo bajo para un proyecto interno universitario. | Si el sistema pasa a producción institucional, evaluar plan Pro o alojamiento propio. |

---

## 15. Comandos

```bash
npm run dev                  # desarrollo
npm run build                # build de producción (debe pasar limpio en cada fase)
npm run start                # servidor de producción
npx prisma migrate dev       # crear y aplicar migración en desarrollo
npx prisma migrate deploy    # aplicar migraciones en producción
npx prisma generate          # regenerar el cliente tras cambiar el schema
npx prisma studio            # inspector de base de datos
npx prisma db seed           # ⚠️ DESTRUCTIVO — leer la advertencia de abajo
npm run check:datetime       # casos límite de fecha/hora (no está en el CI)
```

> ⚠️ **`npx prisma db seed` borra `Reservation` y `TimeBlock` enteros** antes de recrear los datos de ejemplo, y **no hay una base de datos de desarrollo separada**: el `.env` local apunta al mismo proyecto de Supabase que producción. El guard de `seed.ts` comprueba `NODE_ENV`, que en una terminal local nunca vale `"production"`, así que **no protege**. Mirar con `npx prisma studio` antes de ejecutar cualquier cosa que escriba.

---

## 16. Reglas permanentes para el agente

1. **Zod es la única fuente de verdad de la validación.** El mismo esquema en cliente y servidor. El servidor nunca confía en el cliente.
2. **Todas las fechas se guardan en UTC** y se muestran en `America/Bogotá`. Ningún `new Date(string)` sin zona explícita. Recordar que el servidor corre en UTC.
3. **Ningún color hex suelto en los componentes** — solo tokens de Tailwind derivados del documento de marca.
4. **Ningún dato personal en el endpoint público de disponibilidad.**
5. **`npm run build` debe pasar al cerrar cada fase.** No acumular deuda de tipos.
6. **Un solo patrón para las mutaciones:** Route Handlers. No mezclar Server Actions.
7. **Nunca commitear `.env`** ni credenciales. Todo secreto va a variables de entorno.
8. **Todo el texto visible en español**, en la voz de marca del §9 del documento de identidad.
9. Si una decisión de producto no está resuelta en este plan, **preguntar** en vez de inventar; anotar el supuesto si hay que avanzar.
