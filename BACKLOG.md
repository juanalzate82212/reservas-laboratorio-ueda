# Backlog

**Lo que queda pendiente y lo que no se debe construir.** Cosas que aparecen a mitad de una tarea pero no la bloquean se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo, las *tareas abiertas*. **No duplicar**: si algo ya está explicado allá, aquí no se repite.

**La aplicación está en producción** con el MVP completo, el panel de administración (solicitudes, calendario de solo lectura, franjas, estadísticas, correos y QR) y los arreglos pedidos tras el despliegue.

---

## Con fecha límite

**Festivos de 2027 — antes de enero de 2027.** `HOLIDAYS_CO` en `src/config/holidays.ts` solo cubre 2026, y `holidays.ts` emite un `console.warn` cuando falta el año en curso.

⚠️ **No basta con calcular la Pascua y aplicar la Ley Emiliani.** Hay que comprobar si el Congreso creó algún festivo nuevo: ya pasó con la Ley 2578 de 2026, que añadió el de la Virgen de Chiquinquirá y dejó el año en 19 festivos en vez de 18. Un festivo que falte no es cosmético — `getOpeningRangesFor()` lo consume, así que el laboratorio aceptaría reservas un día cerrado.

---

## Detalles menores, sin compromiso

- **Distinguir quién canceló.** Una cancelación del administrador y una del solicitante quedan idénticas en la base: `CANCELLED` con `decidedAt`. Si llega a importar, es un campo nuevo en `Reservation` y su migración, no un apaño de presentación.

---

## Fuera de alcance

**No implementar nada de esto sin que el usuario lo pida explícitamente.** Si aparece la tentación a mitad de otra tarea, anotarla aquí y seguir.

- Autenticación de usuarios finales (SSO institucional).
- Múltiples administradores con roles y auditoría.
- Reservas recurrentes o series.
- Gestión de inventario de equipos de cómputo.
- **Exportar** las estadísticas (CSV, Excel, PDF). El dashboard de agregados sí se construyó; sacarlas del panel, no.
- Recordatorios previos y adjunto `.ics` para Outlook. El enlace "Añadir a Google Calendar" del correo de confirmación **sí** existe.
- **Correo de acuse de recibo al solicitante** al enviar la solicitud: se decidió que solo se envía correo en la decisión, y la pantalla de éxito con el código cumple esa función. Ojo con el matiz — el aviso al **laboratorio** cuando entra una solicitud nueva es otra cosa y sí se construyó (`MAIL_TO_ADMIN`).
- **Edición** de una reserva ya creada por el solicitante. La **cancelación** por el solicitante es distinta y sí existe (`POST /api/reservations/[code]/cancel`).

---
