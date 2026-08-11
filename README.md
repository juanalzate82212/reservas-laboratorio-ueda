# Reservas — Laboratorio de Analítica de Datos e Inteligencia Artificial

Sistema de reserva del laboratorio de la **Universidad Católica Luis Amigó**.

Cualquier persona de la comunidad universitaria escanea un código QR, consulta la disponibilidad en un calendario y solicita una franja horaria. Un administrador revisa las solicitudes, las aprueba o rechaza, y gestiona bloqueos de horario. El solicitante recibe un correo automático con la decisión.

**En producción:** https://reservas-laboratorio-ueda.vercel.app

---

## Qué hace

**Para el público** (sin cuenta ni contraseña):

- Ver la disponibilidad de la sala en un calendario semanal, con los estados diferenciados por color **y** por icono/borde (por accesibilidad para daltonismo): reservado, en revisión, sin equipos de cómputo, no disponible, festivo.
- Solicitar una reserva eligiendo día, hora de inicio y duración; tocar una franja libre del calendario prellena el formulario.
- Consultar el estado de una solicitud con el código que se entrega al enviarla (ej. `UEDA-7F3K2`).
- Cancelar la propia reserva hasta el momento en que empieza, con ese mismo código más el número de documento. No hace falta cuenta: son dos datos que solo junta quien reservó.

**Para el administrador** (una contraseña, sin sistema de usuarios):

- Bandeja de solicitudes con filtros por estado: confirmar, rechazar o cancelar.
- Gestión de franjas: bloquear horarios (no reservables) o marcarlos como advertencia (reservables, pero sin préstamo de equipos).
- Registro de correos enviados, con vista previa y opción de reintentar los fallidos.
- Página con el código QR en formato imprimible.

**Reglas de negocio principales:**

| Regla | Valor |
|-------|-------|
| Horario de atención | Lunes a viernes, 8:00–12:00 y 13:00–17:00 |
| Receso | 12:00–13:00 no reservable; una reserva no puede cruzarlo |
| Días cerrados | Sábados, domingos y festivos colombianos |
| Duración de una reserva | De 30 minutos a 4 horas, en bloques de 30 min |
| Anticipación | Mínimo 1 hora, máximo 60 días |
| Correo del solicitante | Debe terminar en `@amigo.edu.co` |
| Asistentes | Obligatorio, y no puede pasar del aforo de la sala (hoy 25) |
| Aprobación | Siempre manual; las solicitudes pendientes ya ocupan la franja |

Las reglas viven en `src/config/booking.ts` y `src/config/holidays.ts`, no repartidas por el código. El aforo es la excepción: sale de `Room.capacity`, porque es un dato de la sala y no una regla global.

**Estados de una reserva:** `PENDING` (en revisión) · `CONFIRMED` · `REJECTED` · `CANCELLED` · `EXPIRED`. Los cuatro primeros los decide el administrador o el solicitante; **`EXPIRED` (vencida) se aplica al leer**, a las solicitudes que nadie revisó y cuya franja ya terminó. No hay tarea programada: `lib/expiration.ts` corre antes de las lecturas que importan.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14.2.35 (App Router) + React 18.3.1 |
| Lenguaje | TypeScript 5.4.5 |
| Estilos | Tailwind CSS 3.4.14 |
| Base de datos | PostgreSQL (Supabase) vía Prisma 5.22.0 |
| Calendario | FullCalendar 6 |
| Formularios | React Hook Form + Zod |
| Correo | Nodemailer sobre SMTP de Gmail (Google Workspace) |
| Alojamiento | Vercel |

> **Las versiones están fijadas sin `^` a propósito.** No actualizar a Next 15/16, React 19 ni Tailwind v4: la elección es por madurez de documentación. Supabase se usa **solo como PostgreSQL alojado** — no se usa su SDK, ni su Auth, ni su Storage.

---

## Requisitos

- **Node.js 20.x** (el repo fija `20.20.2` en `.nvmrc`, para paridad con Vercel)
- Una cuenta de [Supabase](https://supabase.com) con un proyecto PostgreSQL
- Una cuenta de correo de Google Workspace con contraseña de aplicación (opcional en desarrollo)

---

## Instalación

```bash
git clone https://github.com/juanalzate82212/reservas-laboratorio-ueda.git
cd reservas-laboratorio-ueda
npm install
```

Copia la plantilla de variables de entorno y rellénala:

```bash
cp .env.example .env
```

Aplica las migraciones y carga datos de ejemplo:

```bash
npx prisma migrate deploy
npx prisma db seed        # ⚠️ Ver la advertencia de abajo
```

Levanta el servidor de desarrollo:

```bash
npm run dev               # http://localhost:3000
```

> ⚠️ **`npx prisma db seed` es destructivo.** Borra todas las reservas y franjas antes de recrear los datos de ejemplo. **Si tu `.env` apunta a la base de datos de producción, destruirás datos reales.** Ver "Una sola base de datos" más abajo.

---

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Resumen:

| Variable | Para qué |
|----------|----------|
| `DATABASE_URL` | Conexión de runtime — pooler de Supabase, **puerto 6543**, con `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Conexión directa, **puerto 5432** — solo para migraciones (PgBouncer no soporta DDL) |
| `ADMIN_PASSWORD` | Contraseña única del panel de administración |
| `AUTH_SECRET` | Clave para firmar el JWT de sesión. Generar con `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app. **Es lo que codifica el QR** y la base de la URL absoluta de la imagen de Open Graph; un valor incorrecto rompe la función principal y deja el enlace compartido sin vista previa |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | Credenciales de envío de correo |
| `MAIL_FROM` | Remitente, en formato `Nombre <correo>`. Debe coincidir con `SMTP_USER` o ser un alias suyo |
| `MAIL_TO_ADMIN` | Buzón interno donde caen los **avisos** al laboratorio: solicitud nueva por revisar, y cancelación hecha por el solicitante. Hoy es la misma cuenta que envía. Si se deja vacía, esos avisos no se mandan y solo queda constancia en consola |

**Las dos URLs de base de datos no son intercambiables** y ambas deben estar declaradas. Omitir `DIRECT_URL` produce errores de *"prepared statement already exists"* que típicamente solo aparecen después de desplegar.

**Sin `SMTP_PASSWORD`, la aplicación sigue funcionando:** el mailer escribe los correos en consola y los registra con estado `LOGGED` en vez de fallar, de modo que todo el flujo es desarrollable y demostrable sin credenciales.

### Cómo obtener la contraseña de correo

El correo institucional corre sobre **Google Workspace**, así que aplican las reglas de Gmail. La aplicación no tiene sistema de correo propio: inicia sesión en un buzón real y le pide que envíe, igual que haría Outlook.

⚠️ **Google bloquea el acceso SMTP con la contraseña normal de la cuenta desde 2022.** Hace falta una *contraseña de aplicación*: 16 caracteres, específica para una aplicación, revocable por separado y que no da acceso al resto de la cuenta.

Con la cuenta del laboratorio iniciada:

1. En [myaccount.google.com/security](https://myaccount.google.com/security), activar la **verificación en 2 pasos**. Es requisito: sin ella la opción de contraseñas de aplicación **ni siquiera aparece**.
2. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) y crear una con un nombre reconocible.
3. Google muestra la clave **una sola vez**, con el formato `abcd efgh ijkl mnop`. Copiarla y **quitarle los espacios** al pegarla en `SMTP_PASSWORD`.

**Si `/apppasswords` da error o no carga**, el administrador de Google Workspace de la universidad tiene la función deshabilitada para el dominio — es una restricción común en instituciones. Hay que pedir a TI que la habiliten para esa cuenta, o que faciliten un relay SMTP institucional.

> `MAIL_FROM` debe ser la dirección de `SMTP_USER` o un alias suyo: Gmail rechaza remitentes arbitrarios, y un `no-responder@…` inexistente hace fallar el envío. El límite de Google Workspace ronda los 2 000 destinatarios diarios, de sobra para este sistema.

Para desarrollar sin credenciales, además del modo consola descrito arriba, [Ethereal](https://ethereal.email) genera credenciales SMTP falsas al instante: los correos no se entregan a nadie pero se ven renderizados en su web, útil para revisar el HTML de las plantillas.

---

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build            # build de producción
npm run start            # servir el build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run check:datetime   # verifica los casos límite de fecha/hora

npx prisma migrate dev   # crear y aplicar una migración nueva
npx prisma migrate deploy # aplicar migraciones existentes
npx prisma generate      # regenerar el cliente tras cambiar el schema
npx prisma studio        # inspector visual de la base de datos
npx prisma db seed       # ⚠️ destructivo: recrea los datos de ejemplo
```

No hay framework de tests. La verificación se hace por criterios de aceptación: Prisma Studio, `curl` contra los Route Handlers, y `scripts/check-datetime.ts` para la capa horaria.

---

## Estructura

```
prisma/
  schema.prisma          Modelo de datos (Room, Reservation, TimeBlock, EmailLog)
  migrations/            Historial de migraciones
  seed.ts                Datos de ejemplo (destructivo)
scripts/
  check-datetime.ts      Verificación de los casos límite de fecha/hora
  generar-imagenes-marca.mjs  Rehace los iconos y la imagen de Open Graph
src/
  app/
    page.tsx             Landing pública con el calendario
    error.tsx …          Pantallas de error, 404 y carga en voz de marca
    icon.png …           Iconos y tarjeta de Open Graph (Next los enlaza solo)
    reservar/            Wizard de solicitud (3 pasos)
    reserva/             Búsqueda por código (funciona sin JavaScript)
    reserva/[codigo]/    Estado de una reserva, con opción de cancelarla
    admin/
      login/             Pantalla de acceso (fuera del shell autenticado)
      (protected)/       Panel: bandeja, franjas, correos, QR
    api/                 Route Handlers (públicos y de admin)
  components/
    ui/                  Primitivos: Button, Input, Field, Card, Dialog…
    brand/               Logo, Header, Footer, ArcoDecorativo
    calendar/            RoomCalendar (FullCalendar) y leyenda
    reservation/         Pasos del wizard
    admin/               Componentes del panel
  config/
    booking.ts           Horarios, duraciones, límites
    holidays.ts          Festivos colombianos
    reservationOptions.ts Programas académicos y tipos de actividad
  lib/
    datetime.ts          Toda la aritmética de fechas (UTC ↔ Bogotá)
    availability.ts      Solapamiento y estado de cada franja
    expiration.ts        Marca como vencidas las solicitudes sin revisar
    validation/          Esquemas de Zod compartidos cliente/servidor
    mail/                Plantillas y envío de correo
    auth.ts              JWT de sesión del administrador
  middleware.ts          Protege las páginas de /admin/**
```

---

## Despliegue

El proyecto está desplegado en Vercel con despliegue automático:

- Push a **`main`** → despliegue a producción
- Pull request → despliegue de vista previa

Para desplegar desde cero:

1. Importar el repositorio en Vercel (detecta Next.js automáticamente).
2. Configurar **Production Branch = `main`** en Settings → Git. Vercel toma por defecto la rama por defecto del repositorio, que aquí es `develop`.
3. Cargar todas las variables de entorno en los entornos Production y Preview.
4. `NEXT_PUBLIC_APP_URL` debe ser el dominio real — es lo que codifica el QR.
5. Aplicar las migraciones: `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy`.

> **Node 20.x quedará obsoleto en Vercel el 2026-10-01.** Antes de esa fecha hay que subir `engines.node` en `package.json` y `.nvmrc` a 22.x o 24.x.

### Flujo de ramas

- `main` — producción, protegida
- `develop` — rama por defecto e integración
- `feat/*`, `fix/*`, `chore/*` — una por unidad de trabajo, con PR hacia `develop`

El workflow [ci.yml](.github/workflows/ci.yml) corre lint, typecheck y build en cada PR, y es un check obligatorio.

---

## ⚠️ Una sola base de datos

**No existe una base de datos de desarrollo separada.** El entorno local y producción apuntan al mismo proyecto de Supabase.

Esto significa que cualquier escritura desde tu máquina afecta a producción, y que **`npx prisma db seed` borraría datos reales**. El guard que trae `prisma/seed.ts` comprueba `NODE_ENV === "production"`, lo cual **no protege** en este caso: en una terminal local `NODE_ENV` no vale `"production"` aunque la conexión apunte a la base real.

Antes de ejecutar cualquier cosa que escriba en la base, inspecciona primero qué hay (`npx prisma studio`).

---

## Seguridad

- **Row-Level Security habilitado** en las cuatro tablas. Es imprescindible: Supabase expone automáticamente todas las tablas del schema `public` por su API REST, protegidas únicamente por RLS. **Cualquier tabla nueva necesita su propio `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`** en la migración que la crea — Prisma no lo hace solo.
- **Ningún dato personal en el endpoint público.** `GET /api/availability` devuelve solo `startsAt`, `endsAt` y `status`.
- **El HTML de los correos se escapa en origen** y la vista previa del panel se renderiza dentro de un `<iframe sandbox="">`, porque ese contenido incluye texto escrito por terceros desde el formulario público.
- **La sesión de administrador** es un JWT firmado en una cookie `httpOnly` de 8 horas. El middleware protege las páginas, pero además cada handler de `/api/admin/**` verifica la sesión por su cuenta.
- El archivo `.env` nunca se versiona; sí `.env.example`.

---

## Documentación del proyecto

| Documento | Contenido |
|-----------|-----------|
| [CLAUDE.md](CLAUDE.md) | Estado actual, decisiones tomadas y trampas técnicas ya resueltas. **La referencia principal para retomar el trabajo.** |
| [PLAN-MVP.md](PLAN-MVP.md) | Plan original: alcance, modelo de datos, reglas de negocio, contratos de API y fases con criterios de aceptación. |
| [identidad-visual-ucla-ui-ux.md](identidad-visual-ucla-ui-ux.md) | Identidad visual: tokens, tipografía, uso del logo y voz de redacción. |
| [BACKLOG.md](BACKLOG.md) | Lo que queda pendiente y lo que se dejó fuera de alcance. |

---

Desarrollado por la **Unidad de Estrategia del Dato y Analítica** — Universidad Católica Luis Amigó.
