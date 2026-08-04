# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

**Fases 0 a 8 completas**, más cinco rondas de ajustes pedidas por el usuario tras revisar el resultado en el navegador: post-Fase-3/4 (ver nota en el §9 del plan, Fases 3 y 4), post-Fase-4 sobre los campos del formulario de reserva (ver nota "Revisión post-Fase 4" en el §5 del plan), dos rondas post-Fase-8 sobre marca y UI (ver notas "Ajustes post-Fase 8" más abajo, primera y segunda ronda), y la eliminación de Sala de Reuniones (ver "Decisión de producto: solo Sala Principal" más abajo). Andamiaje Next + Tailwind con la marca aplicada, `components/ui/`, `components/brand/`, [/kitchen-sink](src/app/kitchen-sink/page.tsx) (temporal, se borra en la Fase 10), schema de Prisma migrado contra Supabase, semilla con datos de demo, las capas de fecha/hora y disponibilidad, la API pública de lectura, la landing (`/`) con el calendario de FullCalendar de Sala Principal (a todo el ancho, clicable), el wizard de solicitud de reserva (`/reservar`, `POST /api/reservations`, `/reserva/[codigo]`, con sala fija y sin selector, con soporte para llegar prellenado desde un clic en el calendario, y con programa académico/tipo de actividad/aceptación de responsabilidad como campos obligatorios), la autenticación del admin (`/admin/login`, `middleware.ts`, shell de `/admin` con nav y logout, en un route group `(protected)`), la bandeja de solicitudes real (`GET/PATCH /api/admin/reservations`, tarjetas en móvil/tabla en escritorio, diálogo de confirmación sin motivo), los correos automáticos (`lib/mail/mailer.ts`, `lib/mail/templates.ts`, conectados al `PATCH` de la Fase 6, `/admin/correos` con vista previa y reintentar), y la gestión de franjas (`app/admin/franjas/page.tsx`, `GET`/`POST`/`DELETE /api/admin/time-blocks`, conflicto `409` con la lista de reservas afectadas al bloquear sobre horarios ya reservados). `npm run build`, `npm run lint`, `npm run typecheck` y `npm run check:datetime` pasan limpios. **SMTP real configurado y verificado**: la contraseña de aplicación de Google para `lab.analitica@amigo.edu.co` ya está en `.env`, y el envío se probó de punta a punta contra Gmail real (ver nota de la Fase 7).

**Nombre del laboratorio (verificado dos veces, la segunda es la correcta):** el espacio se llama **"Laboratorio de Analítica de Datos e Inteligencia Artificial"**. El nombre usado en la primera ronda de ajustes ("Laboratorio de Estrategia del Dato y Analítica") era, según aclaró el usuario después, el de la **Unidad de Estrategia del Dato y Analítica** — la unidad organizativa que administra el espacio y desarrolló esta aplicación, una entidad distinta del laboratorio mismo. La Unidad solo se menciona una vez en toda la app: en el crédito de desarrollo del pie de página (`Footer.tsx`). Si vuelve a haber dudas sobre cuál nombre va dónde: **laboratorio** = el espacio físico que se reserva (aparece en todas partes); **Unidad** = quién construyó la herramienta (aparece solo en el copyright del pie).

**Siguiente: Fase 9** (despliegue en Vercel: variables de entorno, `prisma migrate deploy` contra producción, seed único, dominio real en `NEXT_PUBLIC_APP_URL`) — en pausa a pedido del usuario mientras se hacen ajustes.

## Decisión de producto: solo Sala Principal (pedido explícito del usuario, tras la segunda ronda de ajustes post-Fase 8)

**Se retiró Sala de Reuniones del sistema entero — solo Sala Principal es reservable de ahora en adelante.** No es una limitación técnica ni un rollback: es una decisión de negocio comunicada directamente por el usuario. Alcance de lo que cambió:

- **Datos:** `prisma/seed.ts` ya no crea la fila `sala-reuniones` y borra la existente (`prisma.room.deleteMany({ where: { slug: "sala-reuniones" } } )`), después de vaciar `Reservation`/`TimeBlock` para no violar la FK. Las dos reservas de demo que antes vivían en Sala de Reuniones (Carlos Vélez, lunes 13:00–15:00; Diana Muñoz, miércoles 08:00–12:00) se reasignaron a Sala Principal en horarios sin choque, para no perder variedad en los datos de ejemplo. Aplicado contra Supabase con `DATABASE_URL="$DIRECT_URL" npx prisma db seed` (el pooler seguía sin dar handshake desde las herramientas del agente esta sesión — ver la trampa ya documentada más abajo).
- **El modelo `Room` NO se tocó.** Sigue siendo genérico (`schema.prisma` no cambió) por si algún día se reactiva una segunda sala — esto era ya la recomendación dada al usuario cuando preguntó "¿es fácil?" antes de autorizar el cambio, y la razón por la que esto fue un cambio de UI + datos, no una migración.
- **`lib/rooms.ts`:** nuevo `getActiveRoom()` (`rooms[0] ?? null`) además del `getActiveRooms()` ya existente — asume que, de las salas activas, la primera es la que hay que mostrar. `getActiveRooms()` no cambió.
- **Wizard sin selector de sala:** `StepRoom.tsx` se eliminó. El selector de día que tenía se movió dentro de `StepDateTime.tsx` (ahora recibe `selectedDate`/`onDateChange`/`minDate`/`maxDate` además de lo que ya tenía). `ReservationWizard` recibe `room: ActiveRoom` (antes `rooms: ActiveRoom[]`) y fija `roomId` en el formulario sin que el usuario elija — el Paso 1 (ahora titulado "Horario", no "Espacio y horario") muestra el nombre de la sala en una tarjeta de solo lectura para que el usuario sepa cuál es, sin poder cambiarla.
- **Landing sin grid de calendarios:** `CalendarGrid.tsx` (grid de 2 columnas + botón "Ver disponibilidad" plegable por sala) se eliminó, reemplazado por `RoomAvailability.tsx` — un wrapper mínimo que solo existe para poder usar `next/dynamic(..., { ssr: false })` desde un Server Component, y que muestra el calendario de Sala Principal directo, sin plegar y a todo el ancho de `max-w-6xl` (antes limitado a la mitad por `md:grid-cols-2`). Ya no tiene sentido "elegir qué sala mirar" con una sola sala, así que tampoco hacía falta el gesto de plegado que existía para eso.
- **`RoomCalendar.tsx`:** el enlace que arma `handleDateClick` al tocar una franja pasó de `/reservar?roomId=&startsAt=` a `/reservar?startsAt=` — `roomId` ya no aporta nada cuando solo hay una sala posible.
- **Copy:** "Dos salas, de lunes a viernes..." en la landing pasó a "De lunes a viernes...".
- **Lo que NO se tocó:** `TimeBlockForm.tsx` (dropdown de sala en franjas del admin, sigue funcionando igual porque ya era genérico sobre `getActiveRooms()` — con una sola sala activa, el dropdown queda con dos opciones con sentido: "Todas las salas" / "Sala Principal"), `ReservationTable.tsx`/`ReservationCard.tsx` (siguen mostrando el nombre de la sala por reserva, información, no selección), y `kitchen-sink/page.tsx` (el `<Select>` de ejemplo todavía lista "Sala de Reuniones" como opción ilustrativa — es una página de muestra de componentes, no funcionalidad real, y se borra entera en la Fase 10, así que no se justificaba tocarla).
- **PLAN-MVP.md** se actualizó con el mismo patrón de tachado + nota usado para otras decisiones tomadas después de escrito el plan (F1, la tabla de salas de la Fase 1, §13, y la nota post-Fase-3/4 sobre `?roomId=&startsAt=`).

## Ajustes post-Fase 8, segunda ronda (pedido explícito del usuario)

**Corrección de nombre:** "Laboratorio de Estrategia del Dato y Analítica" → "Laboratorio de Analítica de Datos e Inteligencia Artificial", en los mismos sitios que la primera ronda (páginas + tres plantillas de correo) más los ejemplos de `MAIL_FROM` en `.env.example` y `PLAN-MVP.md`. Ver el párrafo de arriba sobre por qué el nombre anterior no estaba mal escrito, sino que era el de otra entidad.

**Navbar público con el mismo estilo que el del admin:** `Header.tsx` cambió su `variante` por defecto de `"blanco"` a `"azul"` — antes la landing/`/reservar`/`/reserva/[codigo]` usaban cabecera blanca con logo en positivo por defecto, y solo el admin usaba la banda azul plena. Un solo cambio de default alcanzó porque los tres call sites públicos usan `<Header />` sin pasar `variante`, y la implementación de `variante="azul"` ya era visualmente idéntica al header del admin (mismo `bg-primary`, mismo `border-primary-active`, mismo tratamiento de `Logo`) — no hizo falta tocar el markup, solo qué variante se usa por defecto.

**Footer: correo del laboratorio + crédito de desarrollo.** `Footer.tsx` ahora tiene tres líneas en la columna derecha (nombre del laboratorio → correo `lab.analitica@amigo.edu.co` como `mailto:` → link a la universidad) y una fila nueva, centrada y en su propia franja con borde superior, con el año actual (`new Date().getFullYear()`, calculado en cada render — no hace falta que sea "en hora de Bogotá" para algo con granularidad de año) y el crédito a la Unidad de Estrategia del Dato y Analítica.

**Bug real, reportado por el usuario: el spinner de "Cargando disponibilidad" se quedaba pegado aunque las franjas ya hubieran llegado.** Causa: `datesSet` de FullCalendar puede disparar más de una vez para el mismo rango visible (recálculo de vista, ancho de pantalla, etc.), lanzando pedidos de `/api/availability` solapados. Si un pedido viejo resolvía DESPUÉS de uno nuevo, su `finally` corría igual y podía dejar `cargando` en `true` para siempre — o parpadeando indefinidamente entre `true`/`false` sin asentarse nunca en `false`, que es exactamente lo que se ve como "el spinner nunca desaparece" aunque los datos (de la petición que sí llegó) ya estén pintados. **Arreglado con un `AbortController` por componente** (`solicitudActualRef`): cada pedido nuevo aborta el anterior, y el `finally` de una petición solo puede apagar el spinner si sigue siendo la más reciente (`solicitudActualRef.current === controller`). No se pudo reproducir visualmente el bug original ni confirmar la corrección en un navegador real — este entorno no tiene uno; el diagnóstico es por lectura del código y el patrón (AbortController + guarda de "sigue vigente") es el remedio estándar para esta clase exacta de condición de carrera, no una corrección a ciegas.

## Ajustes post-Fase 8, primera ronda (pedido explícito del usuario, sin fase asociada)

**Logo oficial recibido — riesgo R3 del plan, resuelto.** El usuario entregó `logoU.png` (427×118, PNG indexado, sin canal alfa — confirmado inspeccionando los chunks del archivo, no asumido: sin `tRNS`, el fondo blanco está horneado en la imagen). Se movió a `src/components/brand/logo-uclam.png` y `Logo.tsx` dejó de ser un placeholder tipográfico: ahora usa `next/image` con importación estática del PNG. Como el archivo no tiene transparencia, sobre una superficie azul (`variante="blanco"`: cabecera del admin, splash de login) el fondo blanco de la imagen se envuelve a propósito en una tarjetita (`bg-white px-2 py-1 shadow-card`) — así el recorte blanco se lee como una tarjeta deliberada en vez de un accidente de exportación. La API del componente (`variante`, `compacto`, `className`) no cambió, así que ningún sitio de uso necesitó tocarse.

**Grid del calendario más oscuro:** nuevo token `--borde-calendario: #c7c7c7` en `globals.css` (no en `tailwind.config.ts` — es exclusivo de `--fc-border-color`, ningún componente lo usa como utilidad de Tailwind, así que no aplica la regla de "espejar ambos archivos"). `--borde` (#E1E1E1, el de siempre) resultó demasiado sutil para una grilla de franjas de 30 min.

**Indicador de carga en el calendario (primera versión — ver el bug y su corrección en la segunda ronda, arriba):** `RoomCalendar.tsx` ya tenía un `cargando` que atenuaba el calendario a `opacity-60`, pero un grid vacío atenuado no comunica "todavía está cargando" tan bien como "no hay nada agendado". Se añadió una capa superpuesta con el mismo anillo girando (`LoaderCircle` + `animate-spin`) que ya es el gesto de carga de `Button.tsx` (§5.1 del documento de marca) — no se inventó un spinner nuevo.

**Bug real encontrado al verificar el cambio de logo, no pedido por el usuario:** `/admin/login` heredaba `app/admin/layout.tsx` (el shell autenticado: cabecera azul, `AdminNav`, botón "Salir") porque Next.js App Router aplica un layout a *todas* las rutas anidadas bajo esa carpeta, sin excepción automática para páginas públicas. Confirmado con `curl` contra el HTML real: la pantalla de login mostraba el nav de Solicitudes/Franjas/Correos y un botón de cerrar sesión **antes de que hubiera sesión que cerrar**, con un `<main>` anidado dentro de otro `<main>` (HTML inválido). Existía desde la Fase 5; nadie lo había visto porque no hay navegador en este entorno y hasta ahora no había motivo para inspeccionar el HTML crudo de esa pantalla. **Arreglado con un route group**: `app/admin/page.tsx`, `franjas/page.tsx`, `correos/page.tsx` y `layout.tsx` se movieron a `app/admin/(protected)/`, que Next.js no refleja en la URL — `/admin`, `/admin/franjas`, `/admin/correos` siguen siendo las mismas rutas, pero ahora solo esas heredan el shell. `app/admin/login/page.tsx` quedó fuera del grupo, sin el layout. Verificado con `curl`: la sesión sigue redirigiendo igual (`/admin` sin cookie → 307 a `/admin/login`), el shell sigue apareciendo en las páginas protegidas, y el login ya no muestra nav ni botón de salir.

**Trampa evitada, no inventada — el pooler (6543) volvió a fallar en esta sesión, después de haber funcionado en las Fases 6-8.** Confirma lo ya documentado más abajo: no es un problema resuelto de forma permanente, varía por sesión. Diagnosticado con `prisma db execute --url $DIRECT_URL` (conecta bien) vs. el error de conexión del pooler — para verificar estos cambios visuales localmente se usó `DATABASE_URL="$DIRECT_URL" npm run dev`, **solo como override de entorno en la terminal, nunca escrito al `.env`**.

## Fase 8: gestión de franjas

**El formulario de franjas pide fecha de inicio y fecha de fin por separado, no un solo día.** A diferencia del wizard público (una reserva siempre cabe dentro de un único día, por regla de negocio — `fitsInSingleRange`), una franja de admin puede abarcar varios días (ej. "semana de receso"), así que `TimeBlockForm.tsx` no reutiliza esas reglas de grilla — solo valida que `endsAt` sea posterior a `startsAt`. Consecuencia en la UI: `TimeBlockCard.tsx` no puede usar `formatRange()` tal cual (asume un solo día) — cuando el rango cruza medianoche, cae a un formato largo con fecha completa en ambos extremos (`formatBlockRange()`, local al componente).

**El chequeo de conflicto al crear un `BLOCKED` distingue franja por sala de franja global:** si `roomId` viene con valor, la búsqueda de reservas `PENDING`/`CONFIRMED` en conflicto se filtra a esa sala; si `roomId` es `null` ("todas las salas"), no se filtra por sala — una franja global choca con una reserva de **cualquier** sala, no solo una. Solo `BLOCKED` dispara este chequeo: `WARNING` sigue siendo reservable por definición (§8 del plan), así que no puede chocar con nada.

Reutiliza dos primitivos ya construidos en la Fase 6 sin cambios: `components/ui/Dialog.tsx` para el diálogo de conflictos (`TimeBlockConflictDialog.tsx`, listando cada reserva afectada) y el diálogo de confirmación de borrado (inline en `app/admin/franjas/page.tsx`, mismo patrón que `ConfirmActionDialog`).

## Fase 7: correos automáticos

Al cierre de la Fase 7, `MAIL_FROM` decía `"Laboratorio de Estrategia del Dato y Analítica <lab.analitica@amigo.edu.co>"` y la cabecera HTML de `lib/mail/templates.ts` todavía decía "Laboratorio UEDA" — el usuario indicó que ese tipo de textos se ajustaban después como retoque. **Se ajustó en dos rondas post-Fase 8** (ver notas más arriba): primero a "Laboratorio de Estrategia del Dato y Analítica", después corregido a **"Laboratorio de Analítica de Datos e Inteligencia Artificial"**, el nombre real del espacio — el otro nombre resultó ser el de la Unidad que administra el laboratorio y desarrolló la app, no el del laboratorio en sí. **`MAIL_FROM` en el `.env` real del usuario no se toca desde el código** (no es archivo versionado): el ejemplo en `.env.example` sí se actualizó, pero si el valor local todavía dice el nombre de la Unidad, hay que cambiarlo a mano.

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
- **[Logo](src/components/brand/Logo.tsx) usa el PNG oficial** (`logo-uclam.png`, entregado por el usuario — riesgo R3 del plan, resuelto). Sin canal alfa: sobre superficies azules se envuelve en una tarjeta blanca (`bg-white px-2 py-1 shadow-card`) en vez de dejar el recorte blanco de la imagen suelto.

## Identidad visual

Los tokens del §12.1 del documento de marca se copian a `globals.css` y se mapean en `tailwind.config.ts`. **Ningún hex suelto en componentes.** Jerarquía: azul estructura · blanco respira · naranja señala **una sola cosa** por vista · gris acompaña. Un solo gesto gráfico protagonista por pantalla (arco, tilde o diagonal, no los tres). Texto sobre naranja `#F39200` siempre `#2E2E2E`, nunca blanco. Fuentes vía `next/font/google`: Montserrat (display) + Inter (cuerpo); las oficiales son comerciales y no se incrustan sin licencia. WCAG AA, foco de teclado visible, `prefers-reduced-motion`.

Copy en voz de marca: cercana, activa, sentence case; los botones dicen qué hacen ("Solicitar reserva", "Rechazar solicitud"); los errores explican qué pasó y cómo resolverlo, sin dramatismo.

Los estados del calendario llevan **refuerzo no cromático** además del color (etiqueta, borde punteado, rayado diagonal, icono) por daltonismo — ver la tabla del §8 del plan.

## Privacidad

`GET /api/availability` es público y **nunca** devuelve datos personales: solo `startsAt`, `endsAt` y `status`. `GET /api/reservations/[code]` tampoco expone documento ni correo completo. El `.env` nunca se commitea; sí `.env.example`.

## Disciplina de fases

Las 10 fases del §9 del plan terminan cada una en un estado ejecutable. No empezar la siguiente sin cumplir los criterios de aceptación, y `npm run build` debe pasar limpio al cerrar cada una — no acumular deuda de tipos. Si una decisión de producto no está resuelta en el plan, preguntar en vez de inventar.
