# Backlog

**Lista única de lo que queda pendiente** y de lo que se decidió dejar fuera. Cosas que aparecen durante el desarrollo pero no bloquean la tarea en curso se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo guarda las *tareas abiertas*. No duplicar el estado de un pendiente allá.

Estado general: **Fases 0–9 completas, la app está en producción.** La Fase 10 va parcial y encima hay una tanda de ajustes pedidos después del despliegue.

---

## Ajustes pedidos tras el despliegue

Prioridad actual. Las causas raíz anotadas aquí están **verificadas leyendo el código**, no supuestas.

Los puntos **1, 2 y 5 ya están hechos** (estado de carga al tocar una franja, mensajes de validación de los desplegables, y tope de asistentes ligado al aforo de la sala, fijado en 25); se conserva la numeración original para no romper las referencias. Tres puntos (4, 6 y 9) necesitan una decisión de producto antes de tocar nada.

### 3. Entrada pública a "Revisar el estado de mi reserva"

La página [/reserva/[codigo]](src/app/reserva/[codigo]/) ya existe y funciona; lo que falta es cómo llegar a ella. Hoy solo se accede desde la pantalla de éxito del wizard, justo en el único momento en que no hace falta.

- Enlace visible en la landing → pantalla con un campo para el código → navegar a `/reserva/[codigo]`.
- Normalizar lo que se escriba: mayúsculas, y con o sin el prefijo `UEDA-`. El alfabeto de [reservation-code.ts](src/lib/reservation-code.ts) excluye `I`, `O`, `0` y `1` precisamente porque se confunden al dictarlos; tolerar esas confusiones al teclear es coherente con esa decisión.
- Código inexistente: mensaje en voz de marca, no el 404 genérico de Next (se cruza con el `not-found.tsx` pendiente de la Fase 10).
- **Hacer antes que el punto 4**, que cuelga de esta misma pantalla.

### 4. Cancelación por parte del solicitante — ⚠️ decisión pendiente

Que quien solicitó pueda cancelar mientras la reserva esté `PENDING` o `CONFIRMED`, de forma segura y personal.

El problema: `/reserva/[codigo]` es público y solo pide el código. Cancelar no puede ir con esa única llave.

- **Opción A — código + documento (recomendada).** El formulario pide el número de documento y el servidor lo compara contra `requesterDocId`. Sin infraestructura nueva, funciona aunque hayan perdido el correo, y no revierte ninguna decisión anterior. El documento no es secreto, pero sumado a un código de ~33 M combinaciones son dos datos que un tercero no tiene juntos. Comparar en el servidor y **no revelar cuál de los dos falló**.
- **Opción B — enlace firmado por correo.** JWT con `jose` (ya es dependencia) acotado a `reservationId` + propósito. Más fuerte, pero **obliga a enviar un correo al crear la solicitud**, y eso está explícitamente descartado más abajo en "Fuera de alcance": elegirla implica revertir esa decisión y actualizar esa línea. Encaja bien con el punto 7.
- **A decidir además:** ¿hasta cuándo se puede cancelar una `CONFIRMED` — con antelación mínima, o nunca una vez empezada? ¿Se le avisa al administrador cuando el solicitante cancela?
- No hace falta estado nuevo: se reutiliza `CANCELLED`. Si interesa distinguir quién canceló, decidirlo aquí y no improvisarlo al programar.

### 3bis. Reservas de prueba por encima del aforo (menor)

Al fijar el aforo en 25 quedaron dos reservas antiguas por encima: `UEDA-HZEX8` (100, `REJECTED`) y `UEDA-2RPGM` (183, `PENDING`). Son pruebas de desarrollo y no se tocaron: la validación nueva solo aplica a solicitudes futuras. Conviene limpiarlas desde el panel antes de que el laboratorio empiece a usarse de verdad, junto con las demás de prueba.

Además, `UEDA-MRLGR` y `UEDA-2RPGM` siguen `PENDING` con fecha ya pasada — es exactamente el caso del punto 9, y ya son 2 de las 3 que bloquearían ese correo.

### 6. "Cargo" como desplegable — ⚠️ decisión pendiente

Hoy `requesterRole` es texto libre (`String` en el schema, `<Input>` con placeholder "Docente, estudiante, coordinador…").

- **Falta la lista definitiva.** Punto de partida a confirmar: Docente, Estudiante, Administrativo, Coordinador, Investigador, Externo, Otro.
- **Dónde guardar el valor:**
  - *Mantener `String`* + lista cerrada en `config/reservationOptions.ts`. Sin migración y sin heredar la restricción de sincronía enum↔config. **Recomendado.**
  - *Enum `RequesterRole` de Prisma*, como `academicProgram`/`activityType`. Más consistente con lo que ya hay, pero necesita migración y mapear las filas existentes. Hoy solo hay 1 reserva real, así que el coste es casi nulo — pero hay que decidirlo explícitamente, no descubrirlo cuando la migración falle.
- Si se incluye "Otro", ¿hace falta un campo de detalle, como `activityTypeOther`?
- El `<select>` nuevo nace ya con el `errorMap` del punto 2.

### 7. Aviso al laboratorio cuando entra una solicitud

Hoy `POST /api/reservations` **no envía ningún correo**: el único correo sale al decidir. El administrador no se entera de que tiene algo que revisar.

- Plantilla nueva en `lib/mail/templates.ts` + envío en el handler.
- Restricciones ya documentadas que aplican aquí:
  - El envío va **después** de que la transacción confirme, nunca dentro: una llamada SMTP lenta retendría la conexión del pool (`connection_limit=1`).
  - **No puede bloquear la creación.** Si falla, la respuesta sigue siendo `201` y el fallo queda en `EmailLog` como `FAILED`.
  - El handler necesita `export const runtime = "nodejs"` — nodemailer no corre en Edge. No lo tiene hoy porque no enviaba correo.
  - Escapar en la plantilla todo valor venido del formulario (`requesterName`, `activityTypeOther`).
- **A decidir:** ¿a qué dirección? Conviene una variable propia (`MAIL_TO_ADMIN`) en vez de reutilizar `MAIL_FROM`/`SMTP_USER`; habría que añadirla a `.env.example` y cargarla en Vercel (Production y Preview).
- Esto **no** es el "acuse de recibo al solicitante" descartado más abajo: es un aviso interno.

### 8. "Añadir a Google Calendar" en el correo de confirmación

- **Dónde:** solo en `confirmTemplate()` ([templates.ts:115](src/lib/mail/templates.ts#L115)); no en rechazo ni cancelación.
- Enlace `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=…`, con las fechas en UTC (`YYYYMMDDTHHMMSSZ`).
- ⚠️ Usar el instante UTC real, tal como está en BD. **No** pasar por `toBogotaWallClockIso()`: ese truco existe solo para el límite con FullCalendar y aquí metería 5 h de desfase en el calendario del usuario.
- El valor acaba en un `href` dentro de HTML: hay que codificarlo para URL **y** escaparlo para HTML.

### 9. Estado "Vencida" para las solicitudes no revisadas — ⚠️ decisión pendiente

Una reserva que sigue `PENDING` cuando su fecha ya pasó debe mostrarse como **Vencida**.

- **Recomendado: estado derivado, no valor nuevo en el enum.** `PENDING` + `endsAt < ahora` ⇒ se muestra "Vencida". Cero migraciones y cero trabajos programados. Meterlo en `ReservationStatus` exigiría migración *y* un cron que lo aplicara, y el dato quedaría desfasado entre ejecuciones.
- **Dónde toca:** [reservationStatus.ts](src/lib/reservationStatus.ts) — sus dos mapas son `satisfies Record<ReservationStatus, …>`, así que el tipo de presentación pasa a `ReservationStatus | "EXPIRED"` y hay que ampliar ambos a la vez (están compartidos a propósito entre la página pública y el panel). Además: filtros de la bandeja y `/reserva/[codigo]`.
- 🐞 **Bug real que este punto destapa:** el tope de 3 pendientes por correo cuenta *todas* las `PENDING` sin mirar la fecha ([route.ts:65-68](src/app/api/reservations/route.ts#L65-L68)). A quien se le venzan 3 solicitudes sin revisar **queda bloqueado indefinidamente** y no puede pedir ninguna más. Al implementar esto hay que excluir las vencidas de ese conteo.
- **A decidir:** ¿el administrador puede seguir confirmando una vencida, o solo rechazarla? ¿Las vencidas siguen ocupando la franja? (`lib/availability.ts` trata `PENDING` como ocupada; en la práctica casi da igual porque una franja pasada no es reservable, pero cambia cómo se pintan las semanas anteriores).

---

## Pendiente de la Fase 10 (pulido y cierre)

Nada de esto bloquea el uso de la aplicación; es lo que separa "funcional" de "terminado".

| # | Tarea | Notas |
|---|-------|-------|
| 1 | `error.tsx`, `not-found.tsx` y `loading.tsx` | No existen. Hoy se usan los genéricos de Next.js, que están en inglés y fuera de la voz de marca. El `not-found.tsx` se cruza con el punto 3 de arriba. |
| 2 | Eliminar `/kitchen-sink` | Página temporal de muestra de componentes; ya cumplió su propósito. Su `<Select>` de ejemplo todavía lista "Sala de Reuniones", que ya no existe. |
| 3 | Imagen de Open Graph | El `title` y la `description` del layout raíz ya están; falta la imagen para cuando se comparta el enlace. |
| 4 | Revisión de accesibilidad | Navegación completa por teclado, `aria-label` en los controles del calendario, contraste verificado. |
| 5 | Repasar estados de carga y vacíos | El calendario y `EmptyState` ya los tienen; falta revisar el resto. El punto 1 de arriba es un caso concreto de esto. |

---

## Mantenimiento con fecha límite

| Asunto | Plazo | Detalle |
|--------|-------|---------|
| **Node.js 20.x quedará obsoleto en Vercel** | **2026-10-01** | Los despliegues fallarán a partir de esa fecha. Subir `engines.node` en `package.json` y `.nvmrc` a 22.x o 24.x, y volver a verificar la paridad con el entorno local (ver "Entorno local" en `CLAUDE.md`: `nvm use` no funciona en esta máquina). |
| **Festivos de 2027** | Antes de enero 2027 | `HOLIDAYS_CO` solo cubre 2026. Al añadir el año nuevo **no basta con calcular Pascua y aplicar la Ley Emiliani**: hay que comprobar si se creó algún festivo por ley (ya pasó en 2026 con la Ley 2578). `holidays.ts` emite `console.warn` si falta el año en curso. |

---

## Verificación pendiente

- **Reserva completa de punta a punta en producción**, desde un teléfono real escaneando el QR impreso, terminando con el correo de confirmación recibido. Es el criterio de aceptación formal de las Fases 9 y 10. Hasta ahora se verificó en producción el login de administrador y que todas las rutas respondan correctamente, y el envío de correo se probó a fondo en la Fase 7 pero desde el entorno local, no desde Vercel.

---

## Seguridad, antes de un uso más amplio

- **Rotar `ADMIN_PASSWORD`.** La actual se eligió durante el desarrollo y ha circulado en sesiones de trabajo. Ahora que hay datos personales reales (nombre, documento, correo) en la base, conviene una contraseña fuerte y nueva, cambiada tanto en Vercel como en el `.env` local.
- **Una sola contraseña de administrador, sin usuarios ni auditoría** (riesgo R5 del plan). Aceptado para el MVP; si el sistema pasa a uso institucional formal, se necesita SSO.
- **Sin autenticación del solicitante** (riesgo R6): cualquiera con un correo `@amigo.edu.co` válido puede reservar a nombre de otro. Mitigado por la aprobación manual del administrador.

---

## Fuera de alcance del MVP (§1.2 del plan)

No implementar sin pedirlo explícitamente.

- Autenticación de usuarios finales (SSO institucional).
- Múltiples administradores con roles y auditoría.
- Reservas recurrentes o series.
- Gestión de inventario de equipos de cómputo (solo se marca la advertencia).
- Reportes, métricas y exportación.
- Recordatorios previos y adjunto `.ics` para Outlook. **Parcialmente reabierto:** el enlace "Añadir a Google Calendar" del correo de confirmación sí entra, y es el punto 8 de arriba. Siguen fuera los recordatorios previos y el `.ics`.
- **Correo de acuse de recibo al solicitante** al enviar la solicitud — decidido: solo se envía correo en la decisión, y la pantalla de éxito con el código cumple esa función. Ojo con dos matices: el punto 7 (aviso al **administrador**) es otra cosa y sí entra; y la opción B del punto 4 revertiría esta decisión, porque necesita mandarle un enlace firmado al solicitante desde el principio.
- **Edición** de una reserva ya creada por parte del solicitante. La **cancelación** por parte del solicitante es distinta y sí entra: es el punto 4 de arriba.

---

## Ideas registradas, sin compromiso

- **Reactivar una segunda sala.** Se retiró "Sala de Reuniones" por decisión de producto, pero el modelo `Room` se dejó genérico a propósito. Volver a tener dos salas requeriría reponer el selector en el wizard y decidir cómo se muestran dos calendarios en la landing; no requiere migración de base de datos.
- **Dataset de demostración.** El punto 8 de la Fase 10 pedía dejar la semana en curso poblada con reservas de ejemplo. Quedó anulado: el usuario limpió los datos de prueba a propósito para dejar la aplicación lista para uso real. Si alguna vez hace falta para una demostración, `prisma/seed.ts` sigue funcionando — pero **es destructivo y apunta a la base de producción** (ver `CLAUDE.md`).
