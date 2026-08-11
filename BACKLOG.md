# Backlog

**Lista única de lo que queda pendiente** y de lo que se decidió dejar fuera. Cosas que aparecen durante el desarrollo pero no bloquean la tarea en curso se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo guarda las *tareas abiertas*. No duplicar el estado de un pendiente allá.

**Estado general:** fases 0–9 completas y los **nueve ajustes pedidos tras el despliegue, hechos**. La aplicación está en producción y el usuario verificó un recorrido completo de punta a punta el 2026-08-10. Lo que queda es el pulido de la Fase 10, dos detalles menores y el mantenimiento con fecha.

---

## Pendiente de la Fase 10 (pulido y cierre)

Nada de esto bloquea el uso de la aplicación; es lo que separa "funcional" de "terminado".

**La numeración es la del §9 → Fase 10 de [PLAN-MVP.md](PLAN-MVP.md)**, para que las dos listas se puedan cruzar sin traducir. Los puntos que no aparecen aquí (1, 4, 7, 9) están hechos, y el 8 quedó anulado a propósito — el porqué de cada uno está en el plan.

| # | Tarea | Notas |
|---|-------|-------|
| 2 | Imagen de Open Graph | El `title` y la `description` del layout raíz ya están; falta la imagen para cuando se comparta el enlace. |
| 3 | Repasar estados de carga y vacíos | El calendario, `EmptyState` y las pantallas del punto 4 ya los tienen; falta revisar el resto. |
| 5 | Revisión de accesibilidad | Navegación completa por teclado, `aria-label` en los controles del calendario, contraste verificado. |
| 6 | Eliminar `/kitchen-sink` | Página temporal de muestra de componentes; ya cumplió su propósito. Su `<Select>` de ejemplo todavía lista "Sala de Reuniones", que ya no existe. |

---

## Detalles menores, sin compromiso

### Distinguir quién canceló

Hoy una cancelación del administrador y una del solicitante quedan idénticas en la base: `CANCELLED` con `decidedAt`. En el panel no se puede saber cuál fue. Si llega a importar, es un campo nuevo en `Reservation` (y su migración), no un apaño de presentación.

### Los errores de validación no se borran al corregirlos

Detectado al probar el desplegable de cargo, pero **afecta a todo el formulario y es anterior a ese trabajo**: si alguien pulsa "Siguiente" sin completar algo, ve el error en rojo; al corregirlo, el mensaje **sigue ahí** hasta que vuelve a pulsar "Siguiente". No bloquea nada —el paso avanza igual—, pero da la sensación de que la corrección no se registró.

La causa es la configuración de `useForm`: con `mode: "onTouched"` y errores puestos por `trigger()` (no por un `handleSubmit`), `isSubmitted` sigue en `false` y el `reValidateMode: "onChange"` por defecto no llega a activarse. Se arreglaría revalidando el campo en su `onChange` cuando ya tiene error.

---

## Mantenimiento con fecha límite

| Asunto | Plazo | Detalle |
|--------|-------|---------|
| **Node.js 20.x quedará obsoleto en Vercel** | **2026-10-01** | Los despliegues fallarán a partir de esa fecha. Subir `engines.node` en `package.json` y `.nvmrc` a 22.x o 24.x, y volver a verificar la paridad con el entorno local (ver "Entorno local" en `CLAUDE.md`: `nvm use` no funciona en esta máquina). |
| **Festivos de 2027** | Antes de enero 2027 | `HOLIDAYS_CO` solo cubre 2026. Al añadir el año nuevo **no basta con calcular Pascua y aplicar la Ley Emiliani**: hay que comprobar si se creó algún festivo por ley (ya pasó en 2026 con la Ley 2578). `holidays.ts` emite `console.warn` si falta el año en curso. |

---

## Seguridad, antes de un uso más amplio

- **Rotar `ADMIN_PASSWORD`.** La actual se eligió durante el desarrollo y ha circulado en sesiones de trabajo. Ahora que la aplicación recoge datos personales reales (nombre, documento, correo), conviene una contraseña fuerte y nueva, cambiada tanto en Vercel como en el `.env` local.
- **Una sola contraseña de administrador, sin usuarios ni auditoría** (riesgo R5 del plan). Aceptado para el MVP; si el sistema pasa a uso institucional formal, se necesita SSO.
- **Sin autenticación del solicitante** (riesgo R6): cualquiera con un correo `@amigo.edu.co` válido puede reservar a nombre de otro. Mitigado por la aprobación manual del administrador.

---

## Limpieza del repositorio

- **Los ficheros de las skills están duplicados en el historial.** En disco, `.claude/skills/frontend-design` y `.claude/skills/vercel-react-best-practices` son *junctions* de Windows que apuntan a `.agents/skills/`, pero git no los sigue como enlaces: **guarda las dos copias**, 115 ficheros por duplicado. Quien clone en Linux o macOS obtiene dos copias reales, que además pueden divergir. Elegir un directorio canónico y dejar el otro fuera del repositorio.
- **19 ramas remotas ya fusionadas en `develop`** siguen publicadas en GitHub. Borrarlas no pierde nada: los commits están en `develop`.

---

## Verificación pendiente

- **Recorrido completo desde un teléfono real escaneando el QR impreso.** El usuario confirmó una prueba completa de punta a punta el 2026-08-10 y la app quedó "en términos generales funcionando correctamente"; lo que no consta es que se hiciera con el QR ya impreso y pegado en la puerta, que es la formulación literal del criterio de aceptación de las Fases 9 y 10. Es la última comprobación que valida el punto de entrada real del sistema.

---

## Fuera de alcance del MVP (§1.2 del plan)

No implementar sin pedirlo explícitamente.

- Autenticación de usuarios finales (SSO institucional).
- Múltiples administradores con roles y auditoría.
- Reservas recurrentes o series.
- Gestión de inventario de equipos de cómputo (solo se marca la advertencia).
- Reportes, métricas y exportación.
- Recordatorios previos y adjunto `.ics` para Outlook. **Parcialmente reabierto:** el enlace "Añadir a Google Calendar" del correo de confirmación sí se construyó. Siguen fuera los recordatorios previos y el `.ics`.
- **Correo de acuse de recibo al solicitante** al enviar la solicitud. Decidido: solo se envía correo en la decisión, y la pantalla de éxito con el código cumple esa función. Ojo con el matiz: el aviso al **laboratorio** cuando entra una solicitud nueva es otra cosa y sí se construyó (`MAIL_TO_ADMIN`).
- **Edición** de una reserva ya creada por parte del solicitante. La **cancelación** por parte del solicitante es distinta y sí se construyó: `POST /api/reservations/[code]/cancel`, con código + documento como llave.

---

## Ideas registradas, sin compromiso

- **Reactivar una segunda sala.** Se retiró "Sala de Reuniones" por decisión de producto, pero el modelo `Room` se dejó genérico a propósito. Volver a tener dos salas requeriría reponer el selector en el wizard y decidir cómo se muestran dos calendarios en la landing; no requiere migración de base de datos.
- **Dataset de demostración.** El punto 8 de la Fase 10 pedía dejar la semana en curso poblada con reservas de ejemplo. Quedó anulado: el usuario limpió los datos de prueba a propósito para dejar la aplicación lista para uso real. Si alguna vez hace falta para una demostración, `prisma/seed.ts` sigue funcionando — pero **es destructivo y apunta a la base de producción** (ver `CLAUDE.md`).
