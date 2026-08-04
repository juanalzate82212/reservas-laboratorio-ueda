# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

**Fases 0 a 8 completas**, más dos rondas de ajustes pedidas por el usuario tras revisar el resultado en el navegador: post-Fase-3/4 (ver nota en el §9 del plan, Fases 3 y 4) y post-Fase-4 sobre los campos del formulario de reserva (ver nota "Revisión post-Fase 4" en el §5 del plan). Andamiaje Next + Tailwind con la marca aplicada, `components/ui/`, `components/brand/`, [/kitchen-sink](src/app/kitchen-sink/page.tsx) (temporal, se borra en la Fase 10), schema de Prisma migrado contra Supabase, semilla con datos de demo, las capas de fecha/hora y disponibilidad, la API pública de lectura, la landing (`/`) con los dos calendarios de FullCalendar (plegables y clicables), el wizard de solicitud de reserva (`/reservar`, `POST /api/reservations`, `/reserva/[codigo]`, con soporte para llegar prellenado desde un clic en el calendario, y con programa académico/tipo de actividad/aceptación de responsabilidad como campos obligatorios), la autenticación del admin (`/admin/login`, `middleware.ts`, shell de `/admin` con nav y logout), la bandeja de solicitudes real (`GET/PATCH /api/admin/reservations`, tarjetas en móvil/tabla en escritorio, diálogo de confirmación sin motivo), los correos automáticos (`lib/mail/mailer.ts`, `lib/mail/templates.ts`, conectados al `PATCH` de la Fase 6, `/admin/correos` con vista previa y reintentar), y la gestión de franjas (`app/admin/franjas/page.tsx`, `GET`/`POST`/`DELETE /api/admin/time-blocks`, conflicto `409` con la lista de reservas afectadas al bloquear sobre horarios ya reservados — ver nota más abajo). `npm run build`, `npm run lint`, `npm run typecheck` y `npm run check:datetime` pasan limpios. **SMTP real configurado y verificado**: la contraseña de aplicación de Google para `lab.analitica@amigo.edu.co` ya está en `.env`, y el envío se probó de punta a punta contra Gmail real (ver nota de la Fase 7).

**Siguiente: Fase 9** (despliegue en Vercel: variables de entorno, `prisma migrate deploy` contra producción, seed único, dominio real en `NEXT_PUBLIC_APP_URL`).

## Fase 8: gestión de franjas

**El formulario de franjas pide fecha de inicio y fecha de fin por separado, no un solo día.** A diferencia del wizard público (una reserva siempre cabe dentro de un único día, por regla de negocio — `fitsInSingleRange`), una franja de admin puede abarcar varios días (ej. "semana de receso"), así que `TimeBlockForm.tsx` no reutiliza esas reglas de grilla — solo valida que `endsAt` sea posterior a `startsAt`. Consecuencia en la UI: `TimeBlockCard.tsx` no puede usar `formatRange()` tal cual (asume un solo día) — cuando el rango cruza medianoche, cae a un formato largo con fecha completa en ambos extremos (`formatBlockRange()`, local al componente).

**El chequeo de conflicto al crear un `BLOCKED` distingue franja por sala de franja global:** si `roomId` viene con valor, la búsqueda de reservas `PENDING`/`CONFIRMED` en conflicto se filtra a esa sala; si `roomId` es `null` ("todas las salas"), no se filtra por sala — una franja global choca con una reserva de **cualquier** sala, no solo una. Solo `BLOCKED` dispara este chequeo: `WARNING` sigue siendo reservable por definición (§8 del plan), así que no puede chocar con nada.

Reutiliza dos primitivos ya construidos en la Fase 6 sin cambios: `components/ui/Dialog.tsx` para el diálogo de conflictos (`TimeBlockConflictDialog.tsx`, listando cada reserva afectada) y el diálogo de confirmación de borrado (inline en `app/admin/franjas/page.tsx`, mismo patrón que `ConfirmActionDialog`).

## Fase 7: correos automáticos

`MAIL_FROM` quedó como `"Laboratorio de Estrategia del Dato y Analítica <lab.analitica@amigo.edu.co>"` — nombre visible distinto del "Laboratorio UEDA" que usa el resto de la app (UEDA es el equipo que administra el espacio, no el nombre del espacio en sí, según aclaración del usuario). Las plantillas de correo (`lib/mail/templates.ts`) siguen diciendo "Laboratorio UEDA" en la cabecera del HTML por ahora — el usuario indicó que ese tipo de textos se ajustan después como retoque, no bloquea la fase.

**`lib/mail/mailer.ts` revisa `SMTP_HOST` Y `SMTP_PASSWORD`, no solo el host, para decidir el fallback a consola+`EmailLog` (`LOGGED`).** El plan original solo mencionaba `SMTP_HOST` vacío como condición; en la práctica el usuario ya tenía host/puerto/usuario configurados desde antes de tramitar la contraseña de aplicación, así que revisar solo el host habría intentado una conexión real sin credenciales y fallado con `FAILED` en vez de degradar limpiamente a `LOGGED`.

**Seguridad: el HTML de los correos se escapa en origen y se previsualiza en un `<iframe sandbox="">`, doble capa.** `requesterName`, `activityTypeOther` y `adminNote` los escribió alguien externo por el formulario público, y ese HTML no solo se manda por correo — se guarda tal cual en `EmailLog.body` y se renderiza de nuevo en `/admin/correos` para la vista previa, dentro de la sesión autenticada del admin. `lib/mail/templates.ts` escapa (`&<>"'`) todo valor interpolado antes de construir el HTML; `EmailLogRow.tsx` además renderiza ese HTML dentro de un `<iframe sandbox="">` (sin ningún token: ni scripts, ni forms, ni same-origin) en vez de `dangerouslySetInnerHTML` — así, aunque algo se escapara mal, no podría ejecutar código en la sesión de quien mira la vista previa.

**Verificado con SMTP real, no solo simulado:** con la contraseña de aplicación ya en `.env`, se probaron los tres estados de `EmailLog` contra Gmail real (no solo `LOGGED`): `SENT` confirmando una reserva de prueba dirigida a `lab.analitica@amigo.edu.co` (la propia cuenta del laboratorio, para poder verificar sin usar un correo ajeno), `LOGGED` con `SMTP_PASSWORD` deliberadamente vacío, y `FAILED` con una contraseña deliberadamente incorrecta — Gmail devolvió `535-5.7.8 Username and Password not accepted`, capturado en `EmailLog.error`, y la reserva quedó igual `CONFIRMED` (el correo nunca bloquea la transición). También se probó `POST /api/admin/email-logs/[id]/retry` sobre el registro `LOGGED`, que pasó a `SENT` al reintentarlo ya con credenciales válidas. Los tres registros de prueba se borraron después; los datos de demo se resembraron.

## Fase 6: rechazar/cancelar sin motivo (pedido explícito del usuario, antes de construir la fase)

El plan original (§6) exigía `adminNote` obligatorio al rechazar o cancelar una solicitud, con un diálogo que forzaba a escribir el motivo. El usuario pidió lo contrario antes de empezar la Fase 6: **ambas acciones solo piden confirmación** ("¿Estás seguro de...?"), sin capturar texto. `PATCH /api/admin/reservations/[id]` ya no exige `adminNote` en ningún caso — el campo sigue existiendo en el modelo (nullable) por si una fase futura decide retomarlo, y el componente `ReservationDetail` todavía lo muestra si ya tiene un valor (los tres registros de la semilla que lo traían de antes de este cambio siguen visibles). **Consecuencia real para la Fase 7:** el correo de rechazo no podrá incluir una razón específica, porque ya no se recoge en ningún punto del flujo — documentado también en el §6 del plan.

Nuevo primitivo `components/ui/Dialog.tsx` sobre `@radix-ui/react-dialog` (dependencia que ya estaba en el `package.json` desde el §2 del plan, sin usar hasta ahora): siempre controlado desde fuera (`open`/`onOpenChange`), sin `Trigger` propio, porque cada sitio de uso ya decide cuándo abrir el diálogo desde su propia lógica. `components/admin/ConfirmActionDialog.tsx` lo envuelve con el texto específico de cada acción (Confirmar/Rechazar/Cancelar).

**Patrón de datos de la bandeja, distinto al de la landing:** `app/page.tsx` consulta Prisma directo porque es un Server Component sin necesidad de refrescarse tras una mutación (ver comentario en ese archivo). `app/admin/page.tsx` es Client Component y sí llama a `GET /api/admin/reservations` desde el navegador, porque necesita revalidar la lista después de cada `PATCH`, mantener filtros interactivos y mostrar toasts — el mismo tipo de razón por la que `ReservationWizard.tsx` es Client Component completo en vez de Server Component con islas.

**Comunicación entre hermanos sin store global:** el contador de pendientes vive en `AdminNav` (dentro de `app/admin/layout.tsx`), pero quien dispara los cambios de estado es `app/admin/page.tsx` — hermanos en el árbol, no hay relación padre-hijo directa. En vez de introducir Context o un store para un solo contador, se usa un evento de `window` (`ADMIN_RESERVATIONS_CHANGED_EVENT` en `components/admin/adminEvents.ts`): la bandeja lo dispara tras cada `PATCH` exitoso, `AdminNav` lo escucha y vuelve a pedir el conteo. Simple, sin dependencias nuevas, proporcional al problema (un solo valor derivado).

## El formulario de reserva ganó campos que no estaban en el plan original (post-Fase 4, antes de la Fase 6)

El usuario pidió, tras probar el wizard en el navegador, tres cambios que el §5 del plan original no contemplaba: **programa académico** (`academicProgram`, lista cerrada de 6 valores) y **tipo de actividad** (`activityType`, lista cerrada de 6 valores incluyendo `OTRO` con detalle libre en `activityTypeOther`) como campos nuevos y obligatorios, y un **checkbox de responsabilidad** (`responsibilityAccepted`, debe ser `true`) sobre el uso adecuado del laboratorio y los equipos. De paso, `attendees` (número de asistentes) pasó de opcional a obligatorio, y el campo libre `purpose` (motivo) se eliminó del modelo — lo reemplaza `activityType`, más útil para que el admin decida sin tener que leer texto libre.

Las opciones de ambas listas viven en una única fuente, `src/config/reservationOptions.ts` (`ACADEMIC_PROGRAMS`, `ACTIVITY_TYPES`), consumida por el `<select>` del wizard (`StepRequester.tsx`), por el esquema de Zod compartido (`lib/validation/reservation.ts`, que deriva la tupla de `z.enum` del mismo array) y por el paso de revisión (`StepReview.tsx`, con `labelForAcademicProgram`/`labelForActivityType`). Los `value` de ese archivo deben coincidir **exactamente** con los nombres de los enums `AcademicProgram`/`ActivityType` en `prisma/schema.prisma` — están comentados cruzadamente en ambos archivos para que no se desincronicen.

Nuevo componente `components/ui/Checkbox.tsx`: a diferencia de `Input`/`Textarea`/`Select`, no usa `Field` porque el layout de un checkbox (caja + texto al lado) es distinto del de un control con label encima — trae su propia etiqueta/error/id.

**Trampa evitada, no inventada — advisory lock huérfano en Supabase:** al aplicar la migración, `prisma migrate dev` falló 6 veces seguidas con `P1002` (timeout esperando `pg_advisory_lock`) alternado con `P1001` (servidor inalcanzable), incluso reintentando con pausas. Diagnosticado conectando con `PrismaClient({ datasources: { db: { url: DIRECT_URL } } })` y consultando `pg_stat_activity`: un intento anterior (`migrate dev --create-only` en un entorno no interactivo, que abortó sin pasar por el flujo normal de salida) había dejado una sesión **`idle`** con `SELECT pg_advisory_lock(72707369)` todavía tomado — Postgres no libera un advisory lock hasta que la sesión que lo pidió se cierra, y esa sesión nunca se cerró. La migración quedó bloqueada por sí misma, no por la red. Se resolvió con `pg_terminate_backend()` sobre esa sesión específica (confirmado con el usuario antes de ejecutarlo, por ser una acción sobre la base de datos compartida) y la migración pasó al primer intento siguiente. **Si `migrate dev` vuelve a fallar con `P1002` de forma persistente, sospechar de esto antes que de la red**: consultar `pg_stat_activity` buscando una fila `idle` cuya `query` sea `SELECT pg_advisory_lock(...)` con el mismo número del error.


## Sesión de admin: dos runtimes, un solo archivo `lib/auth.ts`

`middleware.ts` corre en **Edge** y solo puede importar `signAdminToken`/`verifyAdminToken`/`ADMIN_SESSION_COOKIE` de `lib/auth.ts` — nunca `getAdminSession()`, que depende de `next/headers` (Node) para leer la cookie en Route Handlers. Para que ambos convivan en el mismo archivo sin arriesgar que el bundler de Edge se lleve por delante un import de Node solo por estar en el mismo módulo, `getAdminSession()` importa `next/headers` de forma **dinámica** (`await import("next/headers")`) dentro de su propio cuerpo — así no puede quedar atrapado en el grafo estático que arma el bundle de `middleware.ts`, sea cual sea el comportamiento real de tree-shaking. Verificado con `npm run build`: el bundle de Middleware compila limpio (35.5 kB).

**El middleware no es la única defensa (regla explícita del plan):** cada handler de `/api/admin/**` debe llamar a `getAdminSession()` por su cuenta, empezando en la Fase 6. `middleware.ts` solo protege páginas.

## El calendario es clicable: AVISO va de fondo, no en primer plano

`RoomCalendar` usa `@fullcalendar/interaction` (`dateClick`/`eventClick`) para abrir `/reservar?roomId=&startsAt=` al tocar una franja disponible. Esto obligó a un cambio de diseño: los `TimeBlock` de tipo `WARNING` (reservables, según §5) se renderizan como evento de **fondo** (`display: "background"`), no de primer plano como `RESERVADO`/`EN_REVISION`/`BLOQUEADO`. Un evento de fondo no intercepta el clic, así que `dateClick` sigue disparando con la franja exacta de 30 min tocada — si `AVISO` fuera de primer plano, `eventClick` solo entregaría el rango completo del `TimeBlock` (que puede durar varias horas), perdiendo qué media hora concreta se tocó.

**Trampa evitada, no inventada:** un evento de fondo **no tiene** el wrapper `.fc-event-main` que sí tienen los de primer plano — el contenido de `eventContent` se inserta directo dentro de `.fc-bg-event`. El tinte de color va en `background-color` con alpha, nunca en la propiedad `opacity`: `opacity` en ese elemento habría atenuado también el icono y el texto, que viven en el mismo nodo. Verificado leyendo `@fullcalendar/core/internal-common.js`, no asumido por la documentación.

**Bug real encontrado y corregido en el camino** (preexistente desde la Fase 3, nunca detectado porque no hay navegador en este entorno): `renderEventContent` hacía `const tipo = arg.event.extendedProps.tipo as EventoTipo` — un *cast*, no una comprobación. Los eventos de festivo no llevan `extendedProps.tipo`, así que `tipo` era `undefined` en runtime; `ICONOS[undefined]` da `undefined`; y `<Icono .../>` con un tipo de componente `undefined` hace que **React truene** ("Element type is invalid… got: undefined") en cualquier semana que mostrara un festivo. TypeScript nunca lo vio venir porque el `as` se lo ocultó. Confirmado reproduciendo el error con `react-dom/server` en un script aislado (no solo por inspección), y corregido con un guard (`if (!tipo) return null`).

## Validación de reservas: qué vive en Zod y qué vive en el Route Handler

`lib/validation/reservation.ts` (compartido cliente/servidor) cubre las reglas del §5 que son puras funciones de los campos —formato, dominio del correo, duración, alineación a la grilla, receso, anticipación mínima/máxima— reutilizando `lib/datetime.ts` en vez de reimplementar la aritmética. Las reglas que necesitan la base de datos —sala activa, solapamiento con otras reservas, bloqueos del admin, límite de pendientes por correo— viven en `POST /api/reservations`, dentro de la misma `prisma.$transaction` que crea el registro (así lo exige el §5: la comprobación de choque y la creación no pueden ir separadas).

**Trampa evitada, no inventada:** `z.coerce.number()` sobre un campo opcional vacío. Un `<input type="number">` sin valor llega como `""`, y `Number("")` da **`0`, no `NaN`** — sin un `z.preprocess` que convierta `""` a `undefined` antes de coercionar, dejar en blanco un campo opcional como `attendees` fallaba la validación de "mayor que cero" en vez de aceptarse vacío. Se detectó con un script de verificación aislado antes de llegar al wizard real, no navegando la UI.

## FullCalendar: el mismo truco de zona horaria, para el navegador

`RoomCalendar` configura FullCalendar con `timeZone="UTC"` y le pasa cadenas ISO **sin sufijo de zona** que ya representan hora de Bogotá (`toBogotaWallClockIso()` en `lib/datetime.ts`). Así el calendario se ve igual sin importar en qué zona horaria esté el navegador de quien lo mira — la alternativa (`timeZone="local"` con instantes UTC reales) delegaría la corrección en la zona del dispositivo del visitante, exactamente el tipo de dependencia ambiental que la Fase 1 eliminó del servidor.

Contrapartida: los `Date` que construye FullCalendar internamente (`datesSet`, `dayHeaderClassNames`) tienen los campos de Bogotá metidos en los *getters* UTC. `src/lib/fullcalendar.ts` (`fullCalendarDateToInstant`, `fullCalendarDayKey`) deshace el truco para recuperar el instante real antes de llamar a la API. **No usar esas funciones fuera del límite con FullCalendar** — son un adaptador de un solo sentido, no utilidades generales de fecha.

Por la misma razón, el prop `now` de FullCalendar también se sobreescribe (`now={() => toBogotaWallClockIso(new Date())}`): sin eso, el indicador de hora actual usaría la hora real del sistema, desalineada 5 h de la grilla.

## Git y GitHub

`main` es producción y solo admite PR con CI en verde; `develop` es la rama por defecto e integración; cada fase va en `feat/fase-N-*`. Los rulesets bloquean push directo, force-push y borrado en ambas. El workflow [ci.yml](.github/workflows/ci.yml) corre lint + typecheck + build y es el status check obligatorio.

**Antes de cerrar una fase, correr también `npm run check:datetime`** — el CI todavía no lo incluye porque no necesita base de datos, pero es la red de seguridad de la capa horaria.

## Entorno local

Node **20.20.2** vía nvm-windows, para paridad exacta con Vercel (`engines: 20.x`, `.nvmrc`). La versión anterior (24) quedó absorbida por nvm.

Dos peculiaridades de esta máquina, por si algo no resuelve:

- `nvm use` **falla** porque `NVM_HOME` contiene un espacio (`C:\Users\Juan Jose\...`) y el `elevate.cmd` de nvm-windows no entrecomilla la ruta. El enlace simbólico `C:\nvm4w\nodejs` se creó a mano con `mklink /D` elevado. Para cambiar de versión hay que repetir esa operación, o reinstalar nvm en una ruta sin espacios.
- Una terminal nueva resuelve `node` sin problema. Solo hace falta intervenir si el shell heredó un entorno anterior a la instalación de nvm.

## Documentos que gobiernan el trabajo

Ambos son de cumplimiento obligatorio y tienen prioridad sobre criterios propios:

- [PLAN-MVP.md](PLAN-MVP.md) — alcance, stack con versiones exactas, modelo de datos, reglas de negocio, contratos de API y las 10 fases de desarrollo con sus criterios de aceptación. **Leer antes de escribir cualquier código.**
- [identidad-visual-ucla-ui-ux.md](identidad-visual-ucla-ui-ux.md) — tokens de color/tipografía/espaciado, reglas de logo, mapeo a componentes de UI y voz de redacción.

Regla operativa: no implementar nada listado como fuera de alcance (§1.2 del plan). Si aparece la tentación, anotarla en `BACKLOG.md` y seguir.

## Qué es esto

Sistema de reserva de dos salas del laboratorio UEDA (Universidad Católica Luis Amigó). Público general accede por QR → ve disponibilidad → solicita franja. Un único administrador (contraseña, sin usuarios) aprueba/rechaza/cancela y gestiona bloqueos. Todo el texto visible va en español.

## Comandos

```bash
npm run dev                  # desarrollo
npm run build                # debe pasar limpio al cerrar cada fase
npx prisma migrate dev       # crear y aplicar migración en desarrollo
npx prisma migrate deploy    # aplicar migraciones en producción
npx prisma generate          # regenerar cliente tras cambiar el schema
npx prisma studio            # inspector de BD — el verificador principal del MVP
npx prisma db seed           # datos de ejemplo
```

No hay framework de tests en el MVP. La verificación es por criterios de aceptación por fase: `prisma studio`, `curl` contra los Route Handlers, y `scripts/check-datetime.ts` (Fase 1) para los casos límite de fecha/hora.

## Stack: versiones fijadas a propósito

Next `14.2.35` + React `18.3.1` + Tailwind `3.4.14`, sin `^` en `package.json`. **No actualizar a Next 15/16, React 19 ni Tailwind v4**: la elección es por madurez de documentación, no por descuido. Tampoco usar `shadcn/ui` (su CLI asume Tailwind v4) ni Turbopack.

### Desviaciones respecto al §2 del plan (todas por seguridad, verificadas contra `npm audit`)

| Paquete | Plan | Instalado | Motivo |
|---------|------|-----------|--------|
| `next` | 14.2.18 | **14.2.35** | 14.2.18 arrastra el *Authorization Bypass in Next.js Middleware*, que es exactamente el mecanismo que protege `/admin/**`. 14.2.35 es la punta de la línea `next-14`, misma API. |
| `nodemailer` | 6.9.16 | **9.0.3** | 4 advisories afectan a todo `>=6.5.0`; el parche solo existe en 9.x. La API que usamos (`createTransport` + `sendMail`) no cambió. |
| `@types/nodemailer` | 6.4.16 | **8.0.1** | Acompaña a nodemailer 9 (ninguna versión trae tipos propios). |
| `postcss` | 8.4.47 | **8.5.25** | La advisory cubre `<=8.5.17`. |
| `tsx` | — | **4.23.1** | No está en el §2, pero `prisma/seed.ts` y `scripts/check-datetime.ts` necesitan un runner de TS. |

**Postura frente a `npm audit`: nunca quedará en cero, y no hay que perseguirlo.** Lo que queda son (a) la cadena de ESLint (`brace-expansion` → `minimatch` → `glob`), que es dev-only, y (b) advisories de Next cuyo único "fix" es saltar a Next 16. Estas últimas aplican a Server Actions, `next/image` remoto, rewrites e i18n de Pages Router — superficies que esta aplicación no tiene, porque el plan manda Route Handlers y App Router. Antes de reaccionar a un audit, comprobar si la superficie afectada existe aquí.

Supabase se usa **solo como PostgreSQL alojado** — nada de su SDK, Auth ni Storage. El acceso a datos es Prisma `5.22.0`.

## Arquitectura: lo que hay que entender de varios archivos a la vez

**Configuración como fuente única de reglas.** `src/config/booking.ts` (`BOOKING_CONFIG`) y `src/config/holidays.ts` (`HOLIDAYS_CO`) concentran horarios, granularidad, duraciones, límites y festivos. Ninguna regla de negocio se hardcodea en componentes ni en handlers.

**El horario de atención absorbe los festivos.** `lib/datetime.ts` expone `getOpeningRangesFor(date)`, que devuelve `[]` para sábados, domingos y festivos. Todo lo demás —generación de slots, validación del servidor, pintado del calendario— consume esa función, así que cerrar un día no requiere lógica extra en ninguna capa. Los cierres excepcionales (mantenimiento, jornadas institucionales) no van aquí: los crea el admin como `TimeBlock` de tipo `BLOCKED`.

**Dos jornadas por día con receso 12:00–13:00.** Una reserva nunca puede cruzarlo: `fitsInSingleRange(start, end)` rechaza 11:00–14:00 aunque ambos extremos estén en horario. El calendario debe pintar el receso distinto de una franja bloqueada.

**Zod compartido cliente/servidor.** Los esquemas de `lib/validation/` son la única definición de las reglas de campo; el cliente los usa vía `@hookform/resolvers`, el servidor los revalida siempre. El servidor no confía en el cliente ni cuando el formulario ya validó.

**Disponibilidad.** `lib/availability.ts` implementa el solapamiento con exactamente `A.startsAt < B.endsAt && B.startsAt < A.endsAt` (09:00–10:00 y 10:00–11:00 **no** solapan). Las reservas `PENDING` **ocupan la franja** igual que las `CONFIRMED`. La verificación de choque y la creación van dentro de una `prisma.$transaction`.

**Mutaciones = Route Handlers, no Server Actions.** Un solo patrón, para poder probar con `curl`. Formato de error uniforme: `{ "error": { "code": "...", "message": "..." } }`.

**Autenticación del admin sin NextAuth.** JWT firmado con `jose` en cookie `admin_session` (httpOnly, 8 h). `middleware.ts` protege `/admin/**`, pero **cada handler de `/api/admin/**` verifica la sesión por su cuenta** — el middleware no es la única defensa.

**El correo nunca bloquea la transición de estado.** Orden en `PATCH /api/admin/reservations/[id]`: actualizar BD → intentar enviar → registrar en `EmailLog` (`SENT`/`FAILED`/`LOGGED`). Si falla, la respuesta sigue siendo `200` con `{ emailStatus: "FAILED" }`. Con `SMTP_HOST` vacío el mailer loguea en consola y guarda `LOGGED`, de modo que todo el flujo es desarrollable y demostrable sin credenciales, desde `/admin/correos`.

## Trampas que ya costaron análisis

1. **Dos URLs de base de datos.** `DATABASE_URL` = pooler puerto **6543** con `?pgbouncer=true&connection_limit=1` (runtime); `DIRECT_URL` = puerto **5432** (solo migraciones). Ambas declaradas en el bloque `datasource`. Omitirlo produce *"prepared statement already exists"* o agotamiento de conexiones, y típicamente **solo después de desplegar**.

   ⚠️ **6543 no funciona desde las herramientas de este agente, pero sí desde la terminal del usuario.** Diagnosticado en la Fase 1: el puerto acepta TCP pero no completa el handshake de Postgres al conectar desde el entorno de shell del agente. Migraciones y semilla se ejecutan ahí con la URL de 5432. **Confirmado en la ronda de rendimiento post-Fase-4:** el error `P2024` que vio el usuario ("Timed out fetching a new connection from the connection pool") solo puede ocurrir si la conexión al pooler ya se estableció — es un timeout esperando un *slot* libre, no un fallo de conexión (eso habría dado *"Can't reach database server"*, el error que sí ve el agente). El pooler funciona bien en la máquina del usuario; el problema de handshake es específico de la red de las herramientas de este agente. **Ya no bloquea la Fase 9.**

   **Actualización (ronda de campos del formulario, post-Fase 4):** en esta sesión el puerto 6543 sí completó el handshake y sirvió tráfico real desde las herramientas del agente — el servidor de desarrollo lo usó sin fallar para crear y borrar reservas de prueba por `curl`. Un solo dato no basta para dar el problema por resuelto de forma permanente (podría depender de la red del entorno en cada sesión), pero es evidencia de que ya no es un bloqueo consistente.

   **Otra trampa nueva, real, encontrada en la misma ronda: un *advisory lock* de Postgres puede quedar huérfano y bloquear toda migración futura.** `prisma migrate dev` falló 6 veces seguidas alternando `P1002` (timeout esperando `pg_advisory_lock`) y `P1001` (servidor inalcanzable), incluso con reintentos espaciados. La causa no era la red: un intento anterior de `migrate dev --create-only` había abortado en un entorno no interactivo sin pasar por el flujo normal de cierre, dejando una sesión **`idle`** en Postgres con `SELECT pg_advisory_lock(72707369)` todavía tomado — un advisory lock no se libera hasta que la sesión que lo pidió se cierra. Diagnosticado conectando con `new PrismaClient({ datasources: { db: { url: DIRECT_URL } } })` (para evitar el pooler) y consultando `pg_stat_activity`; resuelto con `pg_terminate_backend()` sobre esa sesión puntual, confirmado con el usuario antes de ejecutarlo por tratarse de una acción sobre la base de datos compartida. **Si `migrate dev` vuelve a fallar con `P1002` de forma persistente, sospechar primero de esto:** buscar en `pg_stat_activity` una fila `idle` cuya `query` sea `SELECT pg_advisory_lock(...)` con el mismo número que reporta el error, antes de asumir que es la red.

   ⚠️ **`connection_limit=1` prohíbe `Promise.all` de varias consultas Prisma fuera de una `$transaction`.** Cada llamada al cliente `prisma` normal intenta adquirir su propia conexión del pool; con el límite en 1, lanzar varias a la vez las hace competir por esa única conexión en vez de esperar su turno, y agota el `pool_timeout` (10 s por defecto) bajo carga real. Un `Promise.all` de varias queries **dentro** de `prisma.$transaction(async (tx) => ...)` sí es seguro, porque `tx` reutiliza la única conexión ya reservada para esa transacción (ver `POST /api/reservations`). Fuera de una transacción, las consultas van secuenciales, sin excepción — así esté la tentación de "paralelizar para ganar velocidad" (pasó una vez, real, en `GET /api/availability`: la "optimización" causó el P2024 de arriba). El cuello de botella real de latencia no son los round-trips en sí, sino este límite: en local, `connection_limit=1` sirve para que múltiples solicitudes concurrentes (p. ej. los dos calendarios abiertos a la vez) hagan fila entera por una sola conexión. Subirlo a 5 en el `.env` **local únicamente** (nunca en Vercel — ver `.env.example`) baja esas esperas de ~5 s a <1 s, verificado con mediciones.
2. **El servidor corre en UTC, no en hora de Colombia.** Todo se almacena en UTC y se presenta en `America/Bogota`. Nunca `new Date("2026-08-01 08:00")` sin zona explícita. Un desfase de 5 h aparece en la anticipación mínima y en el horario de atención, y funciona bien en local antes de fallar en producción.
3. **Nodemailer no corre en Edge Runtime.** Los handlers que envían correo necesitan `export const runtime = "nodejs"`.
4. **`"postinstall": "prisma generate"`** en `package.json`; Vercel cachea `node_modules` y sin esto el build falla con errores de tipos confusos tras cambiar el schema.
5. **Supabase free pausa el proyecto tras 7 días sin actividad.** Verificar que esté despierto el día antes de cualquier demostración.
6. **`NEXT_PUBLIC_APP_URL` es lo que codifica el QR.** Un valor incorrecto rompe la funcionalidad principal.
7. **Un Route Handler `GET` o un Server Component que no lea `request`, `searchParams`, `cookies()` ni `headers()` se pre-renderiza en build time.** Next.js lo trata como candidato a estático y lo ejecuta durante `next build`, no por petición — si consulta la base de datos, el build queda acoplado a que la BD esté disponible en ese momento (y en CI, a las credenciales falsas de `ci.yml`). Pasó dos veces en la Fase 3: en `/api/rooms/route.ts` y en `app/page.tsx` (Server Component que llama a Prisma directo). Ambos necesitan `export const dynamic = "force-dynamic";` explícito. Los que sí leen `request.nextUrl` (como `/api/availability`) ya salen dinámicos solos, pero conviene revisar cada página o handler nuevo que toque la base de datos contra este caso — es más fácil olvidarlo en una página que en un handler.
8. **La lista de festivos puede cambiar por ley a mitad de año.** Verificada en la Fase 1: las 18 fechas del plan eran correctas, pero faltaba una. La **Ley 2578 de 2026** creó el festivo de la Virgen de Chiquinquirá (9 jul → lunes 13 jul en 2026). Son **19**. Al añadir 2027 a `HOLIDAYS_CO`, **no basta con calcular Pascua y aplicar la Ley Emiliani**: hay que comprobar si se creó algún festivo nuevo. `holidays.ts` ya emite `console.warn` si falta el año en curso.

## Capa de UI: convenciones ya establecidas

- **Props en español** (`variante`, `tamano`, `tono`, `cargando`, `ayuda`, `opcional`), igual que el resto del producto.
- **`cn()` de [src/lib/utils.ts](src/lib/utils.ts)** para componer clases. Usa `extendTailwindMerge` declarando nuestra escala tipográfica (`text-h1`, `text-body-l`…): sin esa extensión, tailwind-merge las clasificaría como color de texto y descartaría una de dos clases en silencio. **Si añades un tamaño a `fontSize` en `tailwind.config.ts`, añádelo también ahí.**
- **[Field](src/components/ui/Field.tsx) cablea la accesibilidad por contexto**: genera el id, lo enlaza al `<label>` y apunta `aria-describedby` a ayuda y error. `Input`, `Textarea` y `Select` lo consumen con `useFieldControl()`. Envolver siempre los controles en `Field` — así el enlace no se puede olvidar. Los tres controles comparten `controlBase`, exportado desde `Input.tsx`.
- **Los tokens viven en dos sitios** que hay que mantener sincronizados: el bloque `:root` de [globals.css](src/app/globals.css) (para CSS crudo — theming de FullCalendar en la Fase 3, plantillas de correo) y `tailwind.config.ts` (para las utilidades). Los componentes usan solo las utilidades.
- **El `<Toaster/>` de sonner ya está en el layout raíz**; para notificar, `import { toast } from "sonner"`.
- **[Logo](src/components/brand/Logo.tsx) es un placeholder tipográfico** (riesgo R3). No dibuja el escudo ni la cruz: reconstruirlos sin el arte oficial incumpliría el manual. Al recibir el SVG de Comunicaciones, sustituir solo el interior de ese componente.

## Identidad visual

Los tokens del §12.1 del documento de marca se copian a `globals.css` y se mapean en `tailwind.config.ts`. **Ningún hex suelto en componentes.** Jerarquía: azul estructura · blanco respira · naranja señala **una sola cosa** por vista · gris acompaña. Un solo gesto gráfico protagonista por pantalla (arco, tilde o diagonal, no los tres). Texto sobre naranja `#F39200` siempre `#2E2E2E`, nunca blanco. Fuentes vía `next/font/google`: Montserrat (display) + Inter (cuerpo); las oficiales son comerciales y no se incrustan sin licencia. WCAG AA, foco de teclado visible, `prefers-reduced-motion`.

Copy en voz de marca: cercana, activa, sentence case; los botones dicen qué hacen ("Solicitar reserva", "Rechazar solicitud"); los errores explican qué pasó y cómo resolverlo, sin dramatismo.

Los estados del calendario llevan **refuerzo no cromático** además del color (etiqueta, borde punteado, rayado diagonal, icono) por daltonismo — ver la tabla del §8 del plan.

## Privacidad

`GET /api/availability` es público y **nunca** devuelve datos personales: solo `startsAt`, `endsAt` y `status`. `GET /api/reservations/[code]` tampoco expone documento ni correo completo. El `.env` nunca se commitea; sí `.env.example`.

## Disciplina de fases

Las 10 fases del §9 del plan terminan cada una en un estado ejecutable. No empezar la siguiente sin cumplir los criterios de aceptación, y `npm run build` debe pasar limpio al cerrar cada una — no acumular deuda de tipos. Si una decisión de producto no está resuelta en el plan, preguntar en vez de inventar.
