# Backlog

**Lista única de lo que queda pendiente** y de lo que se decidió dejar fuera. Cosas que aparecen durante el desarrollo pero no bloquean la tarea en curso se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo guarda las *tareas abiertas*. No duplicar el estado de un pendiente allá.

Estado general: **Fases 0–9 completas, la app está en producción.** La Fase 10 va parcial y encima hay una tanda de ajustes pedidos después del despliegue.

---

## Ajustes pedidos tras el despliegue

Prioridad actual. Las causas raíz anotadas aquí están **verificadas leyendo el código**, no supuestas.

**Los nueve ajustes pedidos tras el despliegue están hechos.** Lo que queda debajo es lo anterior (Fase 10, mantenimiento, seguridad) más lo menor que fue apareciendo.

⚠️ **`MAIL_TO_ADMIN` hay que cargarla en el `.env` local y en Vercel** (Production y Preview) para que los avisos al laboratorio salgan de verdad. Sin ella se omiten en silencio: queda constancia en consola, pero no llega a nadie. El valor es el mismo buzón que envía (`SMTP_USER`). Ver `.env.example`.

### 3bis. Reservas de prueba en la base (menor)

Quedan reservas de desarrollo que conviene limpiar desde el panel antes de que el laboratorio se use de verdad. Dos están por encima del aforo nuevo (`UEDA-HZEX8` con 100 y `UEDA-2RPGM` con 183); no se tocaron porque la validación de aforo solo aplica a solicitudes futuras.

### 4bis. Distinguir quién canceló (menor, sin compromiso)

Hoy una cancelación del administrador y una del solicitante quedan idénticas en la base: `CANCELLED` con `decidedAt`. En el panel no se puede saber cuál fue. Si llega a importar, es un campo nuevo en `Reservation` (y su migración), no un apaño de presentación.

### 6bis. Los errores de validación no se borran al corregirlos (menor)

Detectado al probar el desplegable de cargo, pero **afecta a todo el formulario y es anterior a este trabajo**: si alguien pulsa "Siguiente" sin completar algo, ve el error en rojo; al corregirlo, el mensaje **sigue ahí** hasta que vuelve a pulsar "Siguiente". No bloquea nada —el paso avanza igual—, pero da la sensación de que la corrección no se registró.

La causa es la configuración de `useForm`: con `mode: "onTouched"` y errores puestos por `trigger()` (no por un `handleSubmit`), `isSubmitted` sigue en `false` y el `reValidateMode: "onChange"` por defecto no llega a activarse. Se arreglaría revalidando el campo en su `onChange` cuando ya tiene error.

---

## Pendiente de la Fase 10 (pulido y cierre)

Nada de esto bloquea el uso de la aplicación; es lo que separa "funcional" de "terminado".

| # | Tarea | Notas |
|---|-------|-------|
| ~~1~~ | ~~`error.tsx`, `not-found.tsx` y `loading.tsx`~~ | ✅ Hechas, más `global-error.tsx`. Ver "Pantallas de estado" en `CLAUDE.md`. |
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
