# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

**Fases 0 a 4 completas**, más una ronda de ajustes post-Fase-3/4 pedida por el usuario tras revisar el resultado en el navegador (ver nota en el §9 del plan, Fases 3 y 4). Andamiaje Next + Tailwind con la marca aplicada, `components/ui/`, `components/brand/`, [/kitchen-sink](src/app/kitchen-sink/page.tsx) (temporal, se borra en la Fase 10), schema de Prisma migrado contra Supabase, semilla con datos de demo, las capas de fecha/hora y disponibilidad, la API pública de lectura, la landing (`/`) con los dos calendarios de FullCalendar (ahora plegables y clicables), y el wizard de solicitud de reserva (`/reservar`, `POST /api/reservations`, `/reserva/[codigo]`, con soporte para llegar prellenado desde un clic en el calendario). `npm run build`, `npm run lint`, `npm run typecheck` y `npm run check:datetime` pasan limpios.

**Siguiente: Fase 5** (autenticación del admin y shell de `/admin`).

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

   ⚠️ **6543 no funciona desde las herramientas de este agente, pero sí parece funcionar desde la terminal del usuario.** Diagnosticado en la Fase 1: el puerto acepta TCP pero no completa el handshake de Postgres al conectar desde el entorno de shell del agente (probado sin parámetros, con `pgbouncer=true`, con `sslmode=require` y con `connect_timeout=30`). Migraciones y semilla se ejecutan ahí con la URL de 5432. Pero al revisar `npm run dev` corrido por el usuario (Fase 3/4, ronda de rendimiento), los logs mostraban el patrón `BEGIN` / `DEALLOCATE ALL` / consulta / `COMMIT` en cada query — una firma que **solo aparece cuando `DATABASE_URL` lleva `pgbouncer=true`**, es decir, el 6543 sin ese `.env` sobreescrito. Conclusión provisional: el problema es de la red del entorno del agente, no de la cadena de conexión ni de Supabase. **Confirmar con el usuario antes de dar esto por cerrado**, y si se confirma, ya no bloquea la Fase 9.
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
