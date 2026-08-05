# Backlog

Lo que queda pendiente y lo que se decidió dejar fuera. Cosas que aparecen durante el desarrollo pero no bloquean la tarea en curso se anotan aquí en vez de resolverse fuera de turno.

Estado general del proyecto: **Fases 0–9 completas, la app está en producción.** Ver [CLAUDE.md](CLAUDE.md).

---

## Pendiente de la Fase 10 (pulido y cierre)

Nada de esto bloquea el uso de la aplicación; es lo que separa "funcional" de "terminado".

| # | Tarea | Notas |
|---|-------|-------|
| 1 | `error.tsx`, `not-found.tsx` y `loading.tsx` | No existen. Hoy se usan los genéricos de Next.js, que están en inglés y fuera de la voz de marca. |
| 2 | Eliminar `/kitchen-sink` | Página temporal de muestra de componentes; ya cumplió su propósito. Su `<Select>` de ejemplo todavía lista "Sala de Reuniones", que ya no existe. |
| 3 | Imagen de Open Graph | El `title` y la `description` del layout raíz ya están; falta la imagen para cuando se comparta el enlace. |
| 4 | Revisión de accesibilidad | Navegación completa por teclado, `aria-label` en los controles del calendario, contraste verificado. |
| 5 | Repasar estados de carga y vacíos | El calendario y `EmptyState` ya los tienen; falta revisar el resto de pantallas. |

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
- Recordatorios previos e integración con Google Calendar / Outlook (`.ics`).
- Correo de acuse de recibo al enviar la solicitud — decidido: solo se envía correo en la decisión. La pantalla de éxito con el código cumple esa función.
- Edición de una reserva ya creada por parte del solicitante.

---

## Ideas registradas, sin compromiso

- **Reactivar una segunda sala.** Se retiró "Sala de Reuniones" por decisión de producto, pero el modelo `Room` se dejó genérico a propósito. Volver a tener dos salas requeriría reponer el selector en el wizard y decidir cómo se muestran dos calendarios en la landing; no requiere migración de base de datos.
- **Dataset de demostración.** El punto 8 de la Fase 10 pedía dejar la semana en curso poblada con reservas de ejemplo. Quedó anulado: el usuario limpió los datos de prueba a propósito para dejar la aplicación lista para uso real. Si alguna vez hace falta para una demostración, `prisma/seed.ts` sigue funcionando — pero **es destructivo y apunta a la base de producción** (ver `CLAUDE.md`).
