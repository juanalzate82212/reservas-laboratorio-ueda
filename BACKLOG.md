# Backlog

**Lista única de lo que queda pendiente** y de lo que se decidió dejar fuera. Cosas que aparecen durante el desarrollo pero no bloquean la tarea en curso se anotan aquí en vez de resolverse fuera de turno.

`CLAUDE.md` guarda las *decisiones y sus porqués*; este archivo guarda las *tareas abiertas*. No duplicar el estado de un pendiente allá.

**Estado general: las diez fases del MVP están completas**, y con ellas los nueve ajustes pedidos tras el despliegue. La aplicación está en producción y el usuario confirmó el recorrido de punta a punta.

Lo que queda debajo es **un arreglo pedido por el usuario**, un vencimiento (los festivos de 2027) y dos detalles menores.

---

## Fase 10, cerrada

Queda un solo resto, y es parcial:

| # | Tarea | Estado |
|---|-------|--------|
| 3 | Repasar estados de carga y vacíos | **Parcial.** El calendario, `EmptyState`, las pantallas de estado y el wizard ya los tienen; falta un repaso del panel. No bloquea nada. |

**Lo que quedó fuera de la revisión de accesibilidad, a propósito:** la rejilla del calendario sigue sin ser operable por teclado (FullCalendar no hace focusables las celdas). No incumple, porque el wizard es el camino equivalente y sí es navegable — pero si el wizard cambia, hay que volver a mirarlo.

---

## Arreglos pedidos por el usuario (2026-08-22)

Cola de trabajo activa. Se resuelven **de a poco**, cada uno en su rama y su PR.

### 1. ~~Quitar "Estudiante" de la lista de cargos~~ ✅ Hecho el 2026-08-22

Fuera de `REQUESTER_ROLES`. El usuario confirmó que **ninguna reserva de producción lo usaba**, así que no quedan filas huérfanas. Las dos reservas de ejemplo de `prisma/seed.ts` que lo usaban pasaron a `INVESTIGADOR` y `DOCENTE`, para que la semilla no genere valores que el formulario ya no ofrece.

### 2. ~~La tabla de solicitudes está desalineada~~ ✅ Hecho el 2026-08-22

La causa era que la cabecera tenía cinco `<th>` y cada fila un solo `<td colSpan={5}>` con un CSS grid dentro: dos algoritmos de reparto independientes. Ahora hay celdas reales, una por columna, y el navegador dimensiona cabecera y cuerpo a la vez.

Medido en navegador con la API interceptada: **0 px de desfase** en las 15 intersecciones (3 filas × 5 columnas), tanto en las cajas de celda como en la posición real del texto.

De paso se recuperaron las semánticas de columna (`<th scope="col">` y una celda por dato, que antes no existían) y el chevron pasó a ser un `<button>` con `aria-expanded` y nombre propio.

### 3. El QR impreso desaprovecha la hoja

`/admin/qr` genera el `QRCodeSVG` a `size={280}`, que en papel carta queda pequeño. Hay que subirlo en el medio `print` sin descolocar el resto de la composición ni tocar la vista en pantalla. El `@page { size: letter }` ya está en `globals.css`.

Al ampliarlo, **volver a comprobar el nivel de corrección de errores**: se bajó de `H` a `M` cuando se quitó el logo incrustado, y a otro tamaño conviene reconfirmar que se lee bien impreso. Probar con una impresión real, no solo con la previsualización.

### 4. ~~El dominio del pie debe ser `funlam.edu.co`~~ ✅ Hecho el 2026-08-22

Cambiado en `Footer.tsx` (enlace y texto) y en `identidad-visual-ucla-ui-ux.md`, por decisión del usuario, para que los dos no se contradigan.

⚠️ **El correo de contacto del manual sigue siendo `ucatolicaluisamigo@amigo.edu.co`**, sin tocar: es una dirección, no el enlace al sitio, y cambiarla sería inventar un dato. Si también debe cambiar, hay que preguntarlo.

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
| ~~**Node.js 20.x quedará obsoleto en Vercel**~~ | ~~2026-10-01~~ | ✅ **Hecho el 2026-08-11**, con margen de mes y medio. `engines.node`, `.nvmrc` y `@types/node` a 22.x; el CI ya leía `.nvmrc`, así que no hubo que tocar `ci.yml`. |
| **Festivos de 2027** | Antes de enero 2027 | `HOLIDAYS_CO` solo cubre 2026. Al añadir el año nuevo **no basta con calcular Pascua y aplicar la Ley Emiliani**: hay que comprobar si se creó algún festivo por ley (ya pasó en 2026 con la Ley 2578). `holidays.ts` emite `console.warn` si falta el año en curso. |

---

## Seguridad, antes de un uso más amplio

- ~~**Rotar `ADMIN_PASSWORD`.**~~ **Descartado por decisión del usuario (2026-08-11).** Estaba anotado porque la contraseña actual se eligió durante el desarrollo y circuló en sesiones de trabajo. No se rota. **No volver a proponerlo**; si algún día cambia el criterio, lo pedirá él.
- **Una sola contraseña de administrador, sin usuarios ni auditoría** (riesgo R5 del plan). Aceptado para el MVP; si el sistema pasa a uso institucional formal, se necesita SSO.
- **Sin autenticación del solicitante** (riesgo R6): cualquiera con un correo `@amigo.edu.co` válido puede reservar a nombre de otro. Mitigado por la aprobación manual del administrador.

---

## Limpieza del repositorio

~~**Los ficheros de las skills están duplicados en el historial.**~~ ✅ **Hecho.** `.claude/skills/` y `.agents/skills/` están en `.gitignore`; lo versionado es `skills-lock.json`. El árbol de ficheros es caché reinstalable.

*(Las 14 ramas remotas ya fusionadas se borraron el 2026-08-11; solo quedan `main` y `develop`.)*

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

- ⛔ **Fusión con DataCueva — explorada y CANCELADA el 2026-08-22.** La idea era absorber la app de préstamo de equipos ([DataCueva](https://github.com/JuanSNuno/DataCueva)) dentro de este panel, con una sola base y usuarios con roles en lugar de la contraseña compartida. Hubo plan aprobado por fases (`FUSION-DATACUEVA.md`) y se completó su fase 0; el usuario canceló antes de traer una sola línea de DataCueva. **No reabrir sin que lo pida.**

  **Nada de aquel trabajo se revirtió, y no hace falta**: la fase 0 eran tres tareas que este repositorio necesitaba igual —la base de datos de desarrollo, Node 22 y Vitest— y ninguna tocó código de la aplicación. El plan sí se borró, porque señalaba un trabajo que no va a ocurrir.

  El análisis completo (inventario real de DataCueva, por qué no se subía a Next 16, el porte de Drizzle a Prisma) vive en el historial: `git log --all --oneline -- FUSION-DATACUEVA.md`. Si algún día se retoma, es material aprovechable — pero estaba **equivocado en tres puntos** que solo se descubrieron al leer el repositorio de verdad, así que hay que reverificarlo antes de fiarse.

- **Reactivar una segunda sala.** Se retiró "Sala de Reuniones" por decisión de producto, pero el modelo `Room` se dejó genérico a propósito. Volver a tener dos salas requeriría reponer el selector en el wizard y decidir cómo se muestran dos calendarios en la landing; no requiere migración de base de datos.
- **Dataset de demostración.** El punto 8 de la Fase 10 pedía dejar la semana en curso poblada con reservas de ejemplo. Quedó anulado: el usuario limpió los datos de prueba a propósito para dejar la aplicación lista para uso real. Si alguna vez hace falta para una demostración, `prisma/seed.ts` sigue funcionando y desde el 2026-08-11 apunta a la base de **desarrollo** — pero **sigue siendo destructivo**: borra `Reservation` y `TimeBlock` completos. Confirmar a qué proyecto apunta el `.env` antes de correrlo (ver `CLAUDE.md`).
