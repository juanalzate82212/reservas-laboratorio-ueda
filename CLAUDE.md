# CLAUDE.md

Guía para trabajar en este repositorio. Contiene **lo que no se puede deducir leyendo el código**: las decisiones y sus porqués, y las trampas que rompen algo si se tocan sin saberlas. Lo que sí se ve en el código no se repite aquí. Las tareas abiertas están en [BACKLOG.md](BACKLOG.md).

---

## Qué es esto

Sistema de reserva del **Laboratorio de Analítica de Datos e Inteligencia Artificial** de la Universidad Católica Luis Amigó, **en producción**: https://reservas-laboratorio-ueda.vercel.app

El público llega por un código QR impreso → ve la disponibilidad en un calendario → solicita una franja. Un único administrador (una contraseña, sin sistema de usuarios) gestiona todo desde `/admin`, que tiene seis secciones: **Solicitudes, Calendario** (solo lectura), **Franjas, Estadísticas, Correos y QR**. Todo el texto visible va en español.

**Hay una sola sala reservable, "Sala Principal"**, pero el modelo `Room` es genérico a propósito: hubo una segunda y se retiró por decisión de producto, no por limitación técnica. Por eso conviven `getActiveRoom()` y `getActiveRooms()`. **No "simplificar" eso**: reactivar una segunda sala debe seguir siendo un cambio de datos, no una migración.

⚠️ **Dos nombres que se confunden, y ya costaron dos rondas de correcciones.** El **Laboratorio de Analítica de Datos e Inteligencia Artificial** es el espacio que se reserva y aparece en toda la app. La **Unidad de Estrategia del Dato y Analítica** es quien lo administra y construyó la herramienta, y aparece **una sola vez**, en el crédito de `Footer.tsx`. Esa línea dice algo distinto al resto del producto a propósito — no unificarla.

---

## ⚠️ Datos: dos proyectos de Supabase

| Entorno | Proyecto | Quién lo usa |
|---------|----------|--------------|
| **Desarrollo** | `vkixgpvztkvbuwamhqdv` | el `.env` local y el MCP de `.mcp.json` |
| **Producción** | `ceqqzubsxxuroawcnpvg` | solo las variables de entorno de Vercel |

**Antes de ejecutar cualquier cosa que escriba en la base, confirmar a cuál apunta el `.env`:**

```bash
grep -oE 'postgres\.[a-z0-9]{20}' .env | head -1
```

Importa porque **el guard de `prisma/seed.ts` no protege**: comprueba `NODE_ENV === "production"`, que en una terminal local nunca vale eso aunque la cadena apunte a la base real. Y `npx prisma db seed` **borra `Reservation` y `TimeBlock` completos**.

**La app está en uso: no dar por buena ninguna cifra de filas de producción que leas aquí.** Míralo en vez de deducirlo. En producción **no resembrar sin pedirlo**.

**Las cinco tablas de `public` tienen RLS y ninguna tiene políticas**, que es el estado buscado: cierra el canal REST de Supabase sin afectar a la app, porque Prisma se conecta como `postgres` y ese rol ignora RLS. El linter reportará `rls_enabled_no_policy` como INFO en las cinco — **no es un pendiente**, es la consecuencia esperada.

---

## Documentos

- **[BACKLOG.md](BACKLOG.md)** — lo pendiente y lo que está fuera de alcance. **No implementar nada de esa lista sin que el usuario lo pida.**
- **[identidad-visual-ucla-ui-ux.md](identidad-visual-ucla-ui-ux.md)** — tokens, tipografía, logo y voz de redacción. **De cumplimiento obligatorio.**
- **[PLAN-MVP.md](PLAN-MVP.md)** — la especificación numerada que citan los comentarios del código (`§5 del plan`…). Es referencia de contrato, no estado actual: **donde difiera del código, manda el código.**
- **[README.md](README.md)** — instalación, variables de entorno y despliegue.

---

## Comandos

```bash
npm run dev
npm run build                # debe pasar limpio antes de cerrar cualquier trabajo
npm run lint
npm run typecheck
npm test                     # Vitest (está en CI)
npm run check:datetime       # casos límite de fecha/hora (NO está en CI)

npx prisma migrate dev       # crear y aplicar migración en desarrollo
npx prisma migrate deploy    # aplicar migraciones ya creadas
npx prisma generate          # regenerar cliente tras cambiar el schema
npx prisma studio            # inspector de BD — el verificador principal
npx prisma db seed           # ⚠️ DESTRUCTIVO: ver la sección de Datos
```

**La verificación principal es por criterios de aceptación**, no por tests: `prisma studio`, `curl` contra los Route Handlers, y `check:datetime` al cerrar cualquier trabajo que toque fechas.

**Vitest cubre solo funciones puras** — `lib/availability.test.ts` y `lib/stats.test.ts`, sin Prisma ni petición, ejercitadas con objetos literales. Ese es el criterio para decidir si algo nuevo merece un test aquí; el resto se verifica con el método de arriba.

Para bugs de interfaz y auditorías de accesibilidad, **Playwright y axe-core instalados temporalmente** (`npm install --no-save playwright @axe-core/playwright`) han sido efectivos; `package.json` y `package-lock.json` deben quedar intactos.

---

## Git y despliegue

`main` = producción, y cada push despliega en Vercel. `develop` = rama por defecto e integración, adonde apuntan los PR. Cada unidad de trabajo en su rama (`feat/*`, `fix/*`, `chore/*`, `docs/*`). Los rulesets bloquean push directo y force-push en las dos ramas protegidas.

[ci.yml](.github/workflows/ci.yml) corre lint + typecheck + test + build en cada PR; es el status check obligatorio. **No corre en `main`**, a propósito.

- **Nunca fusionar un PR sin confirmación explícita del usuario.**
- ⚠️ **Un merge a `main` puede no desplegar, y nada avisa.** Ya pasó: el PR se fusionó, Vercel no creó el despliegue y la app quedó atrasada ~12 h en silencio, porque el CI no corre en `main` y Vercel no marca error. **Tras fusionar a `main`, comprobar producción con una petición real** a una ruta cuyo contenido haya cambiado.
- **Nunca desplegar desde local** para "arreglar" un despliegue que falta.
- Los despliegues de vista previa están detrás del muro de autenticación de Vercel: `curl` a esa URL devuelve la página de login, no la app.

---

## Decisiones de producto

Todas pedidas explícitamente por el usuario. Sin este contexto, varias parecen errores.

**Rechazar y cancelar no piden motivo.** El campo `adminNote` sigue en el modelo (nullable) y se muestra si tiene valor, pero nada lo escribe. **Consecuencia:** el correo de rechazo no puede citar una razón.

**Campos del formulario.** Obligatorios `academicProgram` y `activityType` (listas cerradas; `OTRO` pide detalle en `activityTypeOther`), `attendees` —validado contra `Room.capacity`, no contra una constante— y `responsibilityAccepted`. No hay campo de texto libre para el propósito: lo reemplaza `activityType`, más útil para decidir.

⚠️ **`Reservation.requesterRole` es `String`, no un enum de Prisma**, a diferencia de los otros dos. Es deliberado: nació como texto libre y hay filas con valores que no traducen a la lista. La única escritura pasa por Zod, que sí valida contra `REQUESTER_ROLES`, y `labelForRequesterRole()` devuelve el valor crudo si no lo reconoce, así las reservas antiguas siguen legibles. Su "Otro", a diferencia del de `activityType`, **no** pide detalle.

⚠️ **Los `value` de `src/config/reservationOptions.ts` deben coincidir exactamente con los enums de `prisma/schema.prisma`.** Ese archivo es la única fuente: lo consumen el `<select>` del wizard, el `z.enum` de la validación y las etiquetas de la revisión.

**No se rota `ADMIN_PASSWORD`.** El usuario lo decidió con la información delante. **No volver a proponerlo.**

---

## Arquitectura

**Configuración como fuente única de reglas.** `src/config/booking.ts` y `src/config/holidays.ts` concentran horarios, granularidad, duraciones, límites y festivos. Ninguna regla de negocio se hardcodea en componentes ni handlers.

**El horario de atención absorbe los festivos.** `getOpeningRangesFor(date)` devuelve `[]` para sábados, domingos y festivos. Todo lo demás —generación de slots, validación del servidor, pintado del calendario, cálculo de ocupación— consume esa función, así que cerrar un día no requiere lógica extra en ninguna capa. Los cierres excepcionales son otra cosa: los crea el admin como `TimeBlock` de tipo `BLOCKED`.

**Dos jornadas por día con receso 12:00–13:00.** Una reserva nunca puede cruzarlo: `fitsInSingleRange()` rechaza 11:00–14:00 aunque ambos extremos estén en horario.

**Zod compartido cliente/servidor.** Los esquemas de `lib/validation/` son la única definición de las reglas de campo. El servidor **siempre** revalida, aunque el formulario ya haya validado.

**Qué vive en Zod y qué en el handler.** Zod cubre lo que es función pura de los campos (formato, dominio del correo, duración, alineación a la grilla, receso, anticipación). Lo que necesita la base de datos —sala activa, solapamiento, bloqueos, aforo, límite de pendientes— vive en `POST /api/reservations`, **dentro de la misma `prisma.$transaction` que crea el registro**: comprobar el choque y crear no pueden ir separados.

**Disponibilidad.** El solapamiento es exactamente `A.startsAt < B.endsAt && B.startsAt < A.endsAt` — 09:00–10:00 y 10:00–11:00 **no** solapan. Las reservas `PENDING` **ocupan la franja** igual que las `CONFIRMED`.

**Mutaciones = Route Handlers, no Server Actions.** Un solo patrón, para poder probar con `curl`. Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`.

**Dos patrones de datos a propósito.** La landing consulta Prisma directo (Server Component, no necesita refrescarse). El panel es Client Component y llama a la API desde el navegador, porque necesita revalidar tras cada mutación, mantener filtros y mostrar toasts.

### `EXPIRED` se aplica al leer, no con un cron

Una solicitud que nadie revisó y cuya franja ya terminó pasa a `EXPIRED`. Es el único estado que **no** decide el administrador, así que no hay acción de usuario donde colgarlo: `lib/expiration.ts` hace un `updateMany` idempotente que se llama **antes** de las lecturas que importan.

Se descartó Vercel Cron porque en plan Hobby solo permite **una ejecución al día**. `decidedAt` se deja en `null` a propósito: `EXPIRED` con `decidedAt` nulo significa exactamente "se venció sin que nadie la mirara", y el dashboard lo cuenta así.

**Es terminal**, y eso arregla un bug real: el tope de `maxPendingPerEmail` filtra por `PENDING`, así que antes tres solicitudes vencidas sin revisar bloqueaban ese correo para siempre.

### Cancelación por el propio solicitante

`POST /api/reservations/[code]/cancel` no lleva sesión: la llave son **código + número de documento**, dos datos que solo junta quien reservó.

- **El error es el mismo para "ese código no existe" y "ese documento no coincide".** Si fueran distintos, el endpoint diría si un código existe y volvería recorrible el espacio de códigos.
- **El acuse por correo es parte de la seguridad**, no cortesía: el documento no es un secreto, así que si alguien cancelara sin permiso, el dueño se entera al momento. Usa `selfCancelTemplate` y **no** `cancelTemplate`, cuya redacción es la de una cancelación que se sufre, no una que se decide.
- **Compare-and-set:** el estado va en el `WHERE` del `updateMany`, no solo en la comprobación previa, para no pisar una decisión simultánea del admin.

### Correos

**El correo nunca bloquea la transición de estado.** Orden: actualizar BD → intentar enviar → registrar en `EmailLog` (`SENT`/`FAILED`/`LOGGED`). Si el envío falla, la respuesta sigue siendo `200` con `{ emailStatus: "FAILED" }`.

⚠️ **Las llamadas a correo van envueltas en `try/catch` en los handlers**, además del que ya tiene el mailer: el `EmailLog.create` del propio `catch` del mailer puede fallar, y esa excepción convertiría un `201` en `500` con la reserva ya escrita.

**El HTML se escapa en origen Y se previsualiza en un `<iframe sandbox="">`.** Doble capa a propósito: `requesterName` y `activityTypeOther` los escribió alguien externo por el formulario público, y ese HTML se guarda en `EmailLog.body` y se vuelve a renderizar en `/admin/correos`, dentro de la sesión del admin.

**`MAIL_TO_ADMIN` es variable aparte de `SMTP_USER`** aunque hoy valgan lo mismo: el día que los avisos internos deban ir a otra persona se cambia eso y no el remitente de todos los correos.

⚠️ **El enlace de Google Calendar usa el instante UTC real.** **No** pasa por `toBogotaWallClockIso()`: ese truco es exclusivo del límite con FullCalendar, y aquí metería 5 h de desfase en el calendario de quien pulse el botón.

### Autenticación del admin

JWT firmado con `jose` en cookie `admin_session` (httpOnly, 8 h). Sin NextAuth.

**El middleware no es la única defensa:** solo protege *páginas*. Cada handler de `/api/admin/**` debe llamar a `getAdminSession()` por su cuenta.

⚠️ **Dos runtimes, un solo `lib/auth.ts`.** `middleware.ts` corre en **Edge** y solo puede importar `signAdminToken`/`verifyAdminToken`/`ADMIN_SESSION_COOKIE`; nunca `getAdminSession()`, que depende de `next/headers` (Node). Para que convivan, `getAdminSession()` importa `next/headers` de forma **dinámica** dentro de su cuerpo, así no queda atrapado en el grafo estático del bundle de Edge.

**Route group `(protected)`.** Agrupa las páginas con el shell autenticado; `/admin/login` queda **fuera**. Sin eso, el login heredaba el nav y el botón de cerrar sesión antes de que hubiera sesión.

---

## FullCalendar: tres trampas

`RoomCalendar` se usa en dos sitios con el mismo código: el público (`/`) y el panel (`/admin/calendario`, con `soloLectura`). Se resolvió con un prop en vez de duplicando el componente **porque estas tres trampas viajan con él**: una copia aparte las duplicaría y se quedaría atrás en cuanto se arregle una.

**1. El truco de zona horaria.** Se configura con `timeZone="UTC"` y se le pasan cadenas ISO **sin sufijo de zona** que ya representan hora de Bogotá (`toBogotaWallClockIso()`). Así el calendario se ve igual sin importar la zona del navegador. Contrapartida: los `Date` que FullCalendar construye traen los campos de Bogotá metidos en los *getters* UTC, y `src/lib/fullcalendar.ts` deshace el truco. **No usar esas funciones fuera del límite con FullCalendar** — son un adaptador de un solo sentido. Por lo mismo se sobrescribe el prop `now`.

**2. Los AVISO van de fondo, no en primer plano.** Un evento de fondo no intercepta el clic, así que `dateClick` sigue disparando con la media hora exacta que se tocó; en primer plano, `eventClick` solo entregaría el rango completo del bloque. Un evento de fondo **no tiene** el wrapper `.fc-event-main`, así que el tinte va en `background-color` con alpha y **nunca** en `opacity`, que atenuaría también el icono y el texto. Y `renderEventContent` necesita su guard: los eventos de festivo no llevan `extendedProps.tipo`, y sin él React truena en cualquier semana con festivo.

**3. El bucle infinito de `datesSet`.** Cada `setState` hace que `<FullCalendar>` reciba props nuevas; el wrapper llama `resetOptions()` en cada `componentDidUpdate` con un objeto recién creado, la memoización interna compara por referencia, falla siempre, y vuelve a disparar `datesSet` **para el mismo rango visible** → otro fetch → otro `setState`. El arreglo son dos capas que se complementan: `ultimoRangoRef` ignora un `datesSet` de rango idéntico, y un `AbortController` por componente cubre la navegación real solapada. **El rango se marca al empezar la petición y se desmarca si falla o se aborta** — sin lo segundo, el doble montaje de efectos de React en desarrollo deja el rango bloqueado sin datos.

> **`/` y `/reservar` deben seguir con `force-dynamic`.** No son candidatos a ISR: el CI construye con credenciales de base de datos falsas.

---

## Trampas que rompen cosas

**1. Dos URLs de base de datos.** `DATABASE_URL` = pooler puerto **6543** con `?pgbouncer=true&connection_limit=N` (runtime). `DIRECT_URL` = puerto **5432**, solo para migraciones (PgBouncer en modo transacción no soporta DDL). Omitir la segunda produce *"prepared statement already exists"*, y típicamente **solo después de desplegar**.

⚠️ **`connection_limit=1` prohíbe `Promise.all` de varias consultas Prisma fuera de una `$transaction`.** Cada llamada intenta adquirir su propia conexión; con el límite en 1 compiten en vez de esperar turno y agotan el `pool_timeout`. **Fuera de una transacción, las consultas van secuenciales, sin excepción** — ya causó un `P2024` real. En Vercel `connection_limit=1` es lo correcto; en el `.env` local puede subirse a 5.

⚠️ **El puerto 6543 falla de forma intermitente desde las herramientas de este agente**, aunque desde la terminal del usuario funciona siempre. Cuando pase, correr con la URL directa como override **solo de terminal, nunca escrito al `.env`**:

```bash
DIRECT_URL=$(grep '^DIRECT_URL=' .env | cut -d'"' -f2) && DATABASE_URL="$DIRECT_URL" npm run dev
```

Distinguir los tres fallos importa: *"Can't reach database server"* es el handshake del agente; `P2024` es saturación del pool y exige conexión ya establecida; y `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` significa **proyecto pausado** —Supabase free pausa tras 7 días sin actividad—, no borrado: se despausa desde el panel y vuelve tal cual.

**2. El servidor corre en UTC, no en hora de Colombia.** Todo se almacena en UTC y se presenta en `America/Bogota`. **Nunca `new Date("2026-08-01 08:00")` sin zona explícita.** Un desfase de 5 h funciona bien en local antes de fallar en producción.

**3. Pre-renderizado silencioso en build time.** Un Route Handler `GET` o un Server Component que no lea `request`, `searchParams`, `cookies()` ni `headers()` **se pre-renderiza durante `next build`**. Si consulta la base de datos, el build queda acoplado a que esté disponible — y en CI, a las credenciales falsas. Pasó dos veces. Necesitan `export const dynamic = "force-dynamic"` explícito. **Revisar cada página o handler nuevo que toque la base.**

**4. Row-Level Security, obligatorio en toda tabla nueva.** Supabase expone automáticamente todas las tablas de `public` por su API REST, protegidas únicamente por RLS — sin relación con si el código usa esa API. Sin RLS, cualquiera con la llave `anon` (pública por diseño) podía leer o borrar `Reservation` entera. **Toda migración que cree una tabla necesita su propio `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`**: Prisma no lo hace ni lo deriva del schema.

**5. Nodemailer no corre en Edge.** Los handlers que envían correo necesitan `export const runtime = "nodejs"`.

**6. `"postinstall": "prisma generate"`** en `package.json`: Vercel cachea `node_modules` y sin esto el build falla con errores de tipos confusos tras cambiar el schema.

**7. `NEXT_PUBLIC_APP_URL` es lo que codifica el QR** y la base de `metadataBase`. Un valor incorrecto rompe la función principal del producto.

---

## UI, marca y accesibilidad

**Props en español** (`variante`, `tamano`, `tono`, `cargando`, `ayuda`, `opcional`), igual que el resto del producto.

**Ningún hex suelto en componentes.** Los tokens del documento de marca viven en **dos sitios que hay que mantener sincronizados**: el bloque `:root` de `globals.css` (para CSS crudo: FullCalendar, plantillas de correo) y `tailwind.config.ts` (para las utilidades). Los componentes usan solo las utilidades.

**`cn()` de `src/lib/utils.ts`** para componer clases; usa `extendTailwindMerge` declarando nuestra escala tipográfica. **Si añades un tamaño a `fontSize`, añádelo también ahí**, o tailwind-merge descartará una de dos clases en silencio.

**`Field` cablea la accesibilidad por contexto**: genera el id, lo enlaza al `<label>`, apunta `aria-describedby` a ayuda y error, y pone `aria-invalid`. Envolver siempre los controles en `Field` para que ese enlace no se pueda olvidar. `Checkbox` es la excepción, por layout.

Jerarquía visual: azul estructura · blanco respira · **naranja señala una sola cosa por vista** · gris acompaña. Texto sobre naranja `#F39200` siempre `#2E2E2E`, nunca blanco.

⚠️ **El azul y el naranja de marca no valen como texto pequeño.** Ni `#007B99` ni `#C77700` llegan a 4.5:1 sobre nuestras superficies claras. Por eso existen `--azul-texto` (`#00647D`) y `--naranja-texto` (`#9A5C00`), y la regla es de una línea: **color de fondo, icono o borde → el token de marca; color de texto → el token `-texto`.** Igual con el gris: `#848585` se queda para gráficos, y el neutral de texto es `#6F7070`.

⚠️ **`--texto-secundario` (#6F7070) tampoco pasa AA sobre el naranja suave `accent-soft`** (#FDE6C7): da 4,09. Ahí el texto pequeño va con `text-texto`.

Los estados del calendario llevan **refuerzo no cromático** además del color (etiqueta, borde punteado, rayado diagonal, icono), por daltonismo.

**La rejilla del calendario no es operable por teclado** y se acepta así: FullCalendar no hace focusables las celdas. No incumple WCAG 2.1.1 porque el wizard es el camino equivalente y sí es navegable. **Si el wizard cambia, hay que volver a mirarlo.**

Auditado con **axe-core sobre el build de producción** (no en `dev`) más recorridos de teclado. Ese es el método al añadir una pantalla.

### Gráficos del dashboard

⚠️ **Nada de gráficos categóricos multicolor, y no es una preferencia.** El validador del skill `dataviz` reprueba la paleta de marca como paleta categórica: `#007B99` y `#2E7D5B` quedan en ΔE 9,9, por debajo del mínimo de 15 **incluso con visión normal de color**. Por eso todos los rankings son **barras de una sola serie del mismo azul** —la longitud codifica, el color no— y **no hay ningún circular**. Antes de tocar un gráfico, cargar el skill `dataviz`.

**`GET /api/admin/stats` devuelve solo agregados.** Su `select` deja fuera nombre, documento y correo a propósito: lo que no se lee no se puede filtrar por accidente. **No ampliar ese `select` sin pensarlo.** La agregación vive en `lib/stats.ts` como función pura, y la hora del día se calcula en hora de **Bogotá**.

---

## Privacidad

`GET /api/availability` es público y **nunca** devuelve datos personales: solo `startsAt`, `endsAt` y `status`. Por eso el calendario del panel muestra la ocupación pero no de quién es cada reserva — para eso está la bandeja. `GET /api/reservations/[code]` tampoco expone documento ni correo completo. El `.env` nunca se commitea; `.env.example` sí.

---

## Stack: versiones fijadas a propósito

Next `14.2.35` + React `18.3.1` + Tailwind `3.4.14` + Prisma `5.22.0`, sin `^` en `package.json`. **No actualizar a Next 15/16, React 19 ni Tailwind v4**: la elección es por madurez, no por descuido. Tampoco `shadcn/ui` (su CLI asume Tailwind v4) ni Turbopack.

Supabase se usa **solo como PostgreSQL alojado** — nada de su SDK, Auth ni Storage.

Node **22.x**, para paridad con Vercel (`engines`, `.nvmrc`). Vercel no tiene desplegable de versión: respeta `engines.node`.

**`npm audit` nunca quedará en cero, y no hay que perseguirlo.** Lo que queda es la cadena de ESLint (dev-only) y advisories de Next cuyo único "fix" es saltar a Next 16 — aplican a Server Actions, `next/image` remoto, rewrites e i18n de Pages Router, superficies que esta aplicación no tiene. **Antes de reaccionar a un audit, comprobar si la superficie afectada existe aquí.**

**Las skills de agente no se versionan**: `.claude/skills/` y `.agents/skills/` están en `.gitignore`; lo versionado es `skills-lock.json`.

---

## Los dos logos, y por qué no son intercambiables

| Fichero | Qué es | Alfa | Para qué |
|---------|--------|------|----------|
| `logo-uclam.png` | horizontal, 427×118 | **No** — fondo blanco horneado | cabecera, pie, tarjeta de Open Graph |
| `logo-uclam-escudo.png` | escudo, 78×118 | **Sí** | iconos de pestaña y de iOS |

Que el horizontal no tenga transparencia está confirmado inspeccionando los chunks del PNG. Por eso sobre superficies azules se envuelve en una tarjeta blanca: así el recorte se lee como decisión de diseño y no como un accidente. El escudo sí la tiene, y por eso sirve de favicon.

`src/app/icon.png`, `apple-icon.png` y `opengraph-image.png` los **enlaza Next.js solo, por convención de nombre**, sin tocar `layout.tsx`. Se generan con [scripts/generar-imagenes-marca.mjs](scripts/generar-imagenes-marca.mjs).

⚠️ **`metadataBase` en `layout.tsx` es lo que hace funcionar el Open Graph.** Sin él, Next resuelve la URL de la imagen contra `localhost:3000` y ningún servicio externo puede descargarla.

---

## Disciplina de trabajo

- **`npm run build` debe pasar limpio** antes de dar por cerrado cualquier trabajo.
- **Si una decisión de producto no está resuelta, preguntar en vez de inventar.**
- El usuario pide **explicar el trabajo antes de construirlo** y un **resumen al terminarlo**: qué se construyó, qué archivos, en qué estado queda la app.
- **No fusionar ningún PR sin confirmación explícita.**
- **No afirmar que algo se probó si no se probó.** Ya pasó una vez que un mensaje de commit afirmaba una verificación que no se había hecho.
