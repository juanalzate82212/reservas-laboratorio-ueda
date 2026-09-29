# Backlog

**Lo que queda pendiente y lo que no se debe construir.** Cosas que aparecen a mitad de una tarea pero no la bloquean se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo, las *tareas abiertas*. **No duplicar**: si algo ya está explicado allá, aquí no se repite.

**La aplicación está en producción** con el MVP completo y el panel de administración.

⚠️ **Lo multi-laboratorio está terminado en `develop`, pero `main` todavía sirve la versión de un solo laboratorio.** El portal, las rutas por laboratorio, los administradores con rol, el correo por buzón y la invitación de calendario no han llegado a producción. Los pasos, en orden y con las comprobaciones de después, en [README.md](README.md#este-despliegue-llevar-develop-a-main).

---

## Con fecha límite

**Festivos de 2027 — antes de enero de 2027.** `HOLIDAYS_CO` en `src/config/holidays.ts` solo cubre 2026, y `holidays.ts` emite un `console.warn` cuando falta el año en curso.

⚠️ **No basta con calcular la Pascua y aplicar la Ley Emiliani.** Hay que comprobar si el Congreso creó algún festivo nuevo: ya pasó con la Ley 2578 de 2026, que añadió el de la Virgen de Chiquinquirá y dejó el año en 19 festivos en vez de 18. Un festivo que falte no es cosmético — `getOpeningRangesFor()` lo consume, así que el laboratorio aceptaría reservas un día cerrado.

---

## Antes de que Redes reciba reservas de verdad

**Confirmar el aforo y el correo de contacto del Laboratorio de Redes e Infraestructura.** Se sembró con aforo **25 copiado de Analítica** y `contactEmail` en `null`, ambos provisionales y ya visibles al público. El aforo no es decorativo: es el tope que valida `POST /api/reservations` contra `Room.capacity`. Sin `contactEmail`, el pie de sus páginas no ofrece a quién escribir.

**Poner su buzón real en `MAIL_TO_ADMIN_REDES`.** Es a donde le llegan los avisos, quién va como **asistente** en la invitación de calendario y el `Reply-To` de los correos a sus solicitantes. Sin él cae al buzón global y sus reservas terminan en el calendario equivocado.

⚠️ **Ya no hace falta pedirle a Redes una contraseña de aplicación.** Todo el correo sale de una sola cuenta institucional; lo único propio de cada laboratorio son su nombre visible y su buzón. Ese pendiente se cerró solo.

**Crear a su encargado** desde `/admin/usuarios`, con rol `LAB_ADMIN`.

---

## Deuda técnica anotada

**No detectamos rebotes.** `EmailLog` con estado `SENT` significa *"el servidor SMTP aceptó el mensaje"*, **no** *"llegó"*. Si el correo de un solicitante rebota o cae en spam, hoy nadie se entera. Es la carencia real del montaje actual, independiente de la biblioteca que se use.

**Evaluar un transporte de correo más moderno — sin urgencia.** Nodemailer no es el problema: está mantenida y es el estándar de Node. Lo anticuado es la **credencial**: una contraseña de aplicación de Google, estática y que Google desincentiva, sobre un buzón humano usado como servicio de envío.

Lo que ganaría el diseño: con un dominio verificado (Resend, Postmark, SES) cada laboratorio podría **volver a enviar desde su propia dirección** sin necesitar credenciales propias, porque el remitente dejaría de estar atado a la cuenta autenticada. Hoy eso no se puede y por eso todo sale de una sola cuenta. De paso desaparecería el `runtime = "nodejs"` de los handlers de correo.

⚠️ **Ojo si algún día se cambia el transporte: el remitente no se puede mover a la ligera.** Las cancelaciones se emparejan con la invitación original por `UID` **y** organizador, así que cambiar la cuenta remitente deja sin poder retirar los eventos ya enviados.

Está preparado para migrar barato: todo el envío pasa por `enviarCorreo()` y `resolverBuzon()`, así que cambiar de transporte toca **un archivo**.

⚠️ **GCP no tiene servicio propio de correo transaccional** y bloquea el puerto 25 de salida; su documentación remite a terceros. La vía Google es la API de Gmail con cuenta de servicio, que exige que un superadministrador de Workspace conceda la delegación.

⚠️ **La delegación en todo el dominio se pidió y la NEGARON** (2026-09). Es lo que descartó crear los eventos con la API oficial de Google Calendar y obligó a la invitación por correo. **No volver a proponerla** salvo que el usuario diga que cambió la respuesta.

**Disparadores para retomarlo:** que Google endurezca las contraseñas de aplicación; que empiece a importar saber si un correo llegó; que aparezca un tercer o cuarto laboratorio; o que el equipo obtenga su proyecto de GCP.

---

## Detalles menores, sin compromiso

- **Distinguir quién canceló.** Una cancelación del administrador y una del solicitante quedan idénticas en la base: `CANCELLED` con `decidedAt`. Si llega a importar, es un campo nuevo en `Reservation` y su migración, no un apaño de presentación.

---

## Fuera de alcance

**No implementar nada de esto sin que el usuario lo pida explícitamente.** Si aparece la tentación a mitad de otra tarea, anotarla aquí y seguir.

- Autenticación de usuarios finales (SSO institucional).
- **Auditoría** de acciones del panel: quién decidió qué y cuándo. (Los administradores múltiples con rol **sí** se construyeron; lo que no existe es el registro de auditoría. `Reservation.decidedAt` guarda *cuándo* se decidió, pero no *quién*.)
- Reservas recurrentes o series.
- Gestión de inventario de equipos de cómputo.
- **Exportar** las estadísticas (CSV, Excel, PDF). El dashboard de agregados sí se construyó; sacarlas del panel, no.
- Recordatorios previos a la reserva. El **adjunto `.ics` sí se construyó**: el correo de confirmación lleva una invitación de calendario y el de cancelación la retira (ver CLAUDE.md). El botón "Añadir a Google Calendar" se retiró al llegar.
- **Correo de acuse de recibo al solicitante** al enviar la solicitud: se decidió que solo se envía correo en la decisión, y la pantalla de éxito con el código cumple esa función. Ojo con el matiz — el aviso al **laboratorio** cuando entra una solicitud nueva es otra cosa y sí se construyó (`MAIL_TO_ADMIN`).
- **Edición** de una reserva ya creada por el solicitante. La **cancelación** por el solicitante es distinta y sí existe (`POST /api/reservations/[code]/cancel`).

---
