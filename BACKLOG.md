# Backlog

**Lo que queda pendiente y lo que no se debe construir.** Cosas que aparecen a mitad de una tarea pero no la bloquean se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo, las *tareas abiertas*. **No duplicar**: si algo ya está explicado allá, aquí no se repite.

**La aplicación está en producción** con el MVP completo, el panel de administración (solicitudes, calendario de solo lectura, franjas, estadísticas, correos y QR) y los arreglos pedidos tras el despliegue.

---

## Con fecha límite

**Festivos de 2027 — antes de enero de 2027.** `HOLIDAYS_CO` en `src/config/holidays.ts` solo cubre 2026, y `holidays.ts` emite un `console.warn` cuando falta el año en curso.

⚠️ **No basta con calcular la Pascua y aplicar la Ley Emiliani.** Hay que comprobar si el Congreso creó algún festivo nuevo: ya pasó con la Ley 2578 de 2026, que añadió el de la Virgen de Chiquinquirá y dejó el año en 19 festivos en vez de 18. Un festivo que falte no es cosmético — `getOpeningRangesFor()` lo consume, así que el laboratorio aceptaría reservas un día cerrado.

---

## Errores conocidos

### Los errores de validación no se borran al corregirlos

Afecta a **todo el wizard público**. Si alguien pulsa "Siguiente" sin completar un campo, ve el error en rojo; al corregirlo, el mensaje **sigue ahí** hasta que vuelve a pulsar "Siguiente". No bloquea nada —el paso avanza igual—, pero parece que la corrección no se registró.

Causa: con `mode: "onTouched"` y errores puestos por `trigger()` en vez de por un `handleSubmit`, `isSubmitted` se queda en `false` y el `reValidateMode: "onChange"` por defecto nunca llega a activarse. Se arreglaría revalidando el campo en su `onChange` cuando ya tiene error.

### Estados de carga del panel, sin repasar

El calendario, `EmptyState`, las pantallas de estado y el wizard ya los tienen. Falta un repaso de las pantallas del panel. No bloquea nada.

---

## Detalles menores, sin compromiso

- **Distinguir quién canceló.** Una cancelación del administrador y una del solicitante quedan idénticas en la base: `CANCELLED` con `decidedAt`. Si llega a importar, es un campo nuevo en `Reservation` y su migración, no un apaño de presentación.
- **El correo de contacto del manual de identidad** sigue siendo `ucatolicaluisamigo@amigo.edu.co`. Al cambiar el sitio web a `funlam.edu.co` no se tocó, porque una dirección de correo es otra cosa y cambiarla sería inventar un dato. **Preguntar antes de tocarla.**
- **Reactivar una segunda sala.** No requiere migración —el modelo `Room` se dejó genérico a propósito—, pero sí reponer el selector del wizard y decidir cómo se muestran dos calendarios en la landing.

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

## Riesgos aceptados

Conocidos y asumidos para el uso actual. Habría que reabrirlos si el sistema pasa a uso institucional formal.

- **Una sola contraseña de administrador, sin usuarios ni auditoría** (R5 del plan). Con SSO dejaría de serlo.
- **Sin autenticación del solicitante** (R6): cualquiera con un correo `@amigo.edu.co` válido puede reservar a nombre de otro. Lo mitiga la aprobación manual.

---

## Cerrado, y no se reabre

⛔ **Fusión con DataCueva — cancelada por el usuario el 2026-08-22.** Absorber la app de préstamo de equipos dentro de este panel. Llegó a haber un plan aprobado por fases y se completó su fase 0. **No reabrir sin que lo pida.**

Nada de aquel trabajo se revirtió, porque su fase 0 eran tres cosas que este repositorio necesitaba igual: la base de datos de desarrollo, Node 22 y Vitest. El análisis completo sigue en el historial —`git log --all --oneline -- FUSION-DATACUEVA.md`—, pero estaba **equivocado en tres puntos** que solo se vieron al leer el repositorio de verdad: hay que reverificarlo antes de fiarse de él.
