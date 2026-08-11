# Fusión de DataCueva dentro de la app de reservas

**Estado: aprobado el 2026-08-11. Fase 0 en curso** — el punto 1 (base de datos de desarrollo) está hecho; faltan Node 22 y Vitest.

---

## Contexto

Hay dos aplicaciones del mismo equipo para el mismo laboratorio: **reservas del espacio** (esta, en producción, con un QR impreso apuntando a su URL) y **[DataCueva](https://github.com/JuanSNuno/DataCueva)**, que gestiona el préstamo de portátiles. Hoy el administrador tiene que entrar a dos paneles distintos con dos contraseñas distintas. El objetivo es que sea **una sola aplicación**, con el préstamo de equipos dentro del panel `/admin` de reservas.

La exploración descubrió que DataCueva **no es la app menor**: corre Next 16 / React 19, tiene autenticación multiusuario real con tres roles, bitácora de auditoría con un *trigger* de Postgres que impide modificarla, cumplimiento de Habeas Data y una suite de pruebas con Vitest. La app de reservas no tiene ninguna prueba y su sesión es una contraseña compartida.

Por eso la fusión no es "copiar carpetas": es traer un sistema más rico dentro de uno más simple sin perder lo que lo hace rico, y sin cortar un servicio en producción.

**Resultado buscado:** un solo despliegue, una sola base para las dos apps, un solo inicio de sesión con usuarios reales y roles, y el préstamo de equipos operable desde `/admin`.

---

## Decisiones ya tomadas (no volver a abrirlas)

Todas las tomó el usuario con la evidencia delante.

| Decisión | Elegido |
|---|---|
| Dirección | **Reservas absorbe a DataCueva.** No se mueve de dominio ni de despliegue. |
| Sesión | **Usuarios con roles** (Supabase Auth + tabla `perfiles`). La contraseña compartida desaparece. |
| Base de datos | **Se crea un proyecto Supabase de desarrollo** antes de tocar nada. |
| Autoservicio | **Se retira.** Los préstamos se registran solo desde el panel. |
| ORM | **Solo Prisma.** Se portan los adaptadores de Drizzle. |
| Versiones | **Se queda en Next 14 / React 18 / Zod 3.** DataCueva baja. |

---

## Cómo se trabaja este plan

**Reglas de ejecución, de cumplimiento obligatorio:**

1. ⚠️ **Antes de empezar CADA fase hay que explicarle al usuario qué se va a hacer** —qué se construye, qué ficheros se tocan, qué puede romperse y cómo se va a verificar— y **esperar su visto bueno**. No se empieza una fase por el hecho de que la anterior haya terminado.
2. Al cerrar cada fase, **resumen**: qué se construyó, qué ficheros cambiaron, en qué estado queda la aplicación y qué queda pendiente.
3. **Ninguna fase empieza sin que la anterior esté fusionada, desplegada y verificada en producción** con una petición real.
4. Cada fase va en su propia rama y su propio PR. **No se fusiona nada sin confirmación explícita del usuario.**
5. Si a mitad de una fase aparece algo que contradice este plan, **se para y se consulta**, en vez de improvisar. El plan se corrige en este fichero.

**Marcar cada fase como completada aquí al cerrarla, con la fecha.**

---

## Qué se trae y qué no

**Entra:** `equipos`, `prestamos`, `solicitantes`, `usuarios` (perfiles y roles), `auditoria`, `indicadores`, los reportes a Excel, y el aviso de privacidad `/privacidad`.

**No entra, por la decisión de retirar el autoservicio:**

- La feature **`solicitudes` entera** — su único origen era el QR de autoservicio. Se van su tabla, su agregado, sus 3 casos de uso, sus 3 rutas de API y sus tests. La FK va `solicitudes → prestamos`, así que quitarla es limpio y no arrastra nada.
- `/solicitar`, `/mostrador/qr` (QR por equipo), `GET /api/equipos/publico`, `POST /api/solicitudes` y `limitador.ts` (solo existía para proteger el endpoint público).

> **Consecuencia que conviene tener presente:** eso es funcionalidad construida y probada que se deja fuera. El código sigue en el historial de DataCueva, así que reactivarla más adelante sería traerla, no rehacerla.

**Se conserva `/privacidad` aunque no haya autoservicio:** `solicitantes` guarda `autorizacion_otorgada_en` y `autorizacion_version_aviso`, así que la autorización se sigue registrando, ahora en mostrador. El aviso tiene que existir y estar enlazado.

Resultado: **5 tablas nuevas**, no 6.

---

## Las tres decisiones técnicas, y por qué

**ORM: todo a Prisma.** Dos migradores sobre una misma base es la configuración de más riesgo posible aquí. El porte es barato porque la arquitectura hexagonal cumple lo que promete: los repositorios están detrás de puertos, así que se reescriben **solo los adaptadores de salida** (5 repositorios + la unidad de trabajo) y el dominio, los casos de uso y el contenedor quedan intactos. Las funciones `aFila()`/`aDominio()`, que son la mitad de cada repositorio, se copian tal cual.

**Versiones: baja DataCueva, no sube reservas.** El inventario real de rupturas es minúsculo: **cero** APIs de React 19, **10** sitios de `await params`/`cookies()`/`searchParams` (que rompen el *tipo*, no el runtime) y **6** de sintaxis Zod v4. Comprobado en runtime que `z.string().date()`, `.datetime({offset:true})`, `.email()` y `.uuid()` existen y funcionan en la Zod 3.23.8 instalada. Subir reservas a Next 16, en cambio, arrastra React 19 y con él majors de react-hook-form, Radix, sonner y FullCalendar — y obligaría a **revalidar en navegador los tres bugs que costaron análisis** (el bucle de `datesSet`, la restauración de foco del diálogo, la ventana de hidratación de `/reserva`) más la auditoría de accesibilidad de 12 pantallas. Ninguno de los tres lo detecta un typecheck.

**Pruebas: llegan, pero sin PGlite.** No hay adaptador de Prisma para PGlite compatible con Prisma 5.22 (el comunitario exige Prisma ≥ 6 salvo una versión de 2024, abandonada). Se usa **`embedded-postgres`** (Postgres real, sin Docker, con paquete para Windows x64), que además permite correr `prisma migrate deploy` íntegro: eso convierte la suite en **la primera prueba real de las migraciones antes de tocar producción**. De los 17 ficheros de test de DataCueva, **15 portan sin tocar una línea** — son TypeScript puro sobre repositorios en memoria.

---

## Fases

Regla: **cada fase deja la aplicación desplegable y funcionando.** Cada fase que toque la base usa una migración aditiva. **Cada fase se explica y se aprueba antes de empezarla.**

### ☐ Fase 0 — Fontanería. Ni una línea de DataCueva

1. ✅ **Base de datos de desarrollo** — hecho el 2026-08-11. Proyecto `vkixgpvztkvbuwamhqdv`, con las 4 migraciones aplicadas, RLS activo en las cuatro tablas y sembrado (1 sala, 6 reservas, 2 bloqueos). El `.env` local apunta ahí; producción solo vive en Vercel. **Resuelto el que era el mayor riesgo del repositorio.** Queda pendiente decidir sobre `_prisma_migrations`, que no tiene RLS en ninguno de los dos proyectos.
2. **Node 20 → 22.** `engines.node`, `.nvmrc`, `@types/node`, CI. Va en su propio PR: `nvm use` está roto en esta máquina por el espacio en `NVM_HOME` y eso come tiempo. 22.x, no 24.x — no hay margen para experimentar con Prisma 5.22.
3. **Vitest instalado con cero tests**, script `test` y paso en `ci.yml`.

*Cierra con: la app idéntica para el usuario, y la fecha límite del 2026-10-01 resuelta.*

### ☐ Fase 1 — La mitad pura de DataCueva. Sin base, sin rutas, sin UI

Traer `features/**` (`domain/`, `application/ports/`, `application/use-cases/`), `shared/**`, `reportes/**`, `test-support/{dobles,repositorios-memoria,contrato-repositorios,contexto}.ts` y los **15 tests puros**. Añadir `"target": "ES2022"` al `tsconfig.json`.

⚠️ **No activar `noUncheckedIndexedAccess`**: rompería los 93 ficheros existentes. Sin él, el código de DataCueva compila igual.

*Cierra con: `npm test` en verde con 15 ficheros y nada cableado a nada. Riesgo cero, y a partir de aquí el dominio tiene red.*

### ☐ Fase 2 — Esquema y persistencia. Sin rutas, sin UI

- 5 modelos en `schema.prisma`, en PascalCase con `@@map("equipos")` y `@map("placa_funlam")` para no renombrar nada en la base. `estado` como `String`, no enum de Prisma — igual que ya hace `Reservation.requesterRole`.
- **Una** migración que crea las 5 tablas e incluye, en el mismo fichero:
  - `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` **en las cinco**. Ninguna migración de DataCueva lo trae, y esas tablas incluyen `solicitantes` con documento, correo y teléfono. Sin esto quedan expuestas por PostgREST con la clave `anon` — el escenario exacto que ya disparó una alerta de Supabase en este proyecto.
  - El trigger PL/pgSQL que hace `auditoria` inmutable (está en `0003_trigger_auditoria.sql`; el `0002` está vacío, no copiar los dos).
- **Rediseñar el invariante de "un préstamo activo por equipo".** Hoy es un índice único parcial (`WHERE estado = 'activo'`), que Prisma no sabe expresar: cada `migrate dev` futuro generaría un `DROP INDEX` que habría que borrar a mano. Se cambia por una columna nullable `prestamoActivoEquipoId String? @unique`, puesta a `null` al devolver. La garantía de base de datos se conserva y el test que la comprueba sigue valiendo palabra por palabra.
- 5 repositorios Prisma + `UnidadDeTrabajoPrisma` (mismo `AsyncLocalStorage`, cambiando `db.transaction` por `prisma.$transaction`). Apuntar `contratoRepositorios()` a ellos: el fichero de contrato es agnóstico del ORM y no cambia.

⚠️ **`ImportarInventario` envuelve un Excel entero en una transacción.** Prisma pone `timeout` de 5 s y `maxWait` de 2 s por defecto; Drizzle no ponía ninguno. Hay que pasar `$transaction(fn, { timeout, maxWait })` o un inventario grande abortará. Y con `connection_limit=1` esa importación deja la única conexión tomada.

*Cierra con: 5 tablas vacías que nadie lee. La app pública no cambia.*

### ☐ Fase 3 — Autenticación. La peligrosa. Tres subfases, y la puerta vieja abierta todo el rato

Superficie real: **7 llamadas a `getAdminSession()` en 6 ficheros**. No es un refactor grande; es uno delicado.

**3a — Dos puertas a la vez.** Traer `IdentidadSupabase`, el puerto `ProveedorIdentidad`, el repositorio de perfiles y una página de acceso nueva. `getAdminSession(): Promise<boolean>` pasa a `getAdminActor(): Promise<{tipo:"legacy"} | {tipo:"usuario", perfil} | null>`, que acepta **o** el JWT `admin_session` **o** una sesión de Supabase con fila en `perfiles`. Crear el primer usuario, entrar por la puerta nueva y ejercitar todo el panel con la vieja todavía disponible.

Dos restricciones que no se negocian:

- **Conservar el matcher `/admin/:path*`.** El `proxy.ts` de DataCueva intercepta *todo*; adoptarlo metería una petición de red a Supabase en la landing pública que sirve el QR impreso.
- **El middleware no llama a Supabase.** Hoy solo usa `jose`: sin red, Edge puro. Comprueba únicamente la *presencia* de la cookie; la verificación real la hacen las páginas y los handlers. Eso conserva el invariante que `CLAUDE.md` ya declara y respeta la trampa de los dos runtimes con un solo `lib/auth.ts`.

**3b — Autorización y actor real.** `exigirUsuario(request, ROLES)` en los 7 sitios, con los grupos `PERSONAL` / `GESTION` / `ADMIN` que ya existen en DataCueva. Mientras la ruta vieja siga viva, se mapea a un actor sintético `administrador` para que nada cambie de comportamiento. **Aquí las acciones sobre `Reservation` empiezan a escribir en `auditoria` con nombre y apellidos**, que es el objetivo de la decisión de sesión.

**3c — Retirar la contraseña.** Solo cuando 3a y 3b lleven días en producción, y con **al menos dos perfiles `administrador`** creados. Cuatro seguros contra quedarse fuera, de menos a más independientes de la app:

1. `ADMIN_PASSWORD` sigue en Vercel hasta verificar 3c en producción; revertir es revertir un commit, no una migración.
2. Portar `crear-perfil.ts` de DataCueva a `scripts/`: crea un perfil desde terminal, sin UI.
3. **El panel de Supabase crea y resetea usuarios siempre.** Es la puerta de emergencia real y vive fuera de esta aplicación.
4. Un usuario autenticado **sin** fila en `perfiles` no debe dar 500 ni redirigir en bucle: DataCueva ya resuelve esto con una pantalla "tu cuenta aún no tiene perfil". Portarla.

⚠️ **3c va en un despliegue solo suyo.**

### ☐ Fase 4 — API de préstamos. Verificable con `curl`, sin UI

- Traer `_lib/{http,esquemas}.ts` y los handlers que sobreviven (los ~20 que quedan al quitar los tres de `solicitudes`). Aquí se aplican los 10 arreglos de `await params` y los 6 de Zod.
- **Se mantienen las rutas en `/api/equipos`, `/api/prestamos`…** en vez de moverlas a `/api/admin/**`. Esa convención existe en reservas porque el middleware no protege la API; con `exigirUsuario` por rol en cada handler deja de aportar, y mover las rutas obligaría a reescribir `api.test.ts` entero. **Queda anotado como asimetría deliberada.**
- **Dos formatos de error incompatibles conviven**: reservas usa `{error:{code,message}}`, DataCueva `{error, detalles:[…]}`. **No unificarlos ahora** — rompería el cliente existente y todas las recetas de `curl`. Anotar la deuda en `BACKLOG.md`.
- ⚠️ **`export const dynamic = "force-dynamic"` en todo `GET` que toque la base.** En Next 14 los `GET` que no leen `request` se prerenderizan en build, y el CI construye con credenciales falsas. Es la única incompatibilidad de versión que falla en silencio en vez de dar un error de tipos.
- Portar `api.test.ts` (importa los handlers directamente y sustituye el contenedor con `fijarContenedor()`, sin servidor HTTP).

*Cierra con: API completa y probable con `curl`, que es el método de verificación establecido. Ningún usuario la ve todavía.*

### ☐ Fase 5 — UI dentro de `/admin`. Una pantalla por despliegue

⚠️ **No pegar el `globals.css` de DataCueva.** Define sus propias `--texto-secundario` y compañía, y reservas tiene tokens de contraste específicos (`--azul-texto` `#00647D`, `--naranja-texto` `#9A5C00`, `--texto-secundario` `#6F7070`) que existen **porque los colores de marca no pasan WCAG AA como texto**. Sobrescribirlos rompe la auditoría en silencio.

Reconstruir cada pantalla con los componentes de reservas (`Field`, `Dialog`, `Input`, `Select`, props en español), traduciendo las clases CSS a Tailwind. Orden: **Mostrador → Tablero → Reportes → Perfiles**. Cada una desplegable por separado. Es la fase más larga en horas y la de menor riesgo: es aditiva y vive detrás de autenticación.

Al terminar, pasar **axe-core sobre el build de producción** en las pantallas nuevas, con el mismo criterio de la auditoría existente.

### ☐ Fase 6 — Cierre

- Habeas Data: anonimización y retención de 12 meses. **Vercel Cron en plan Hobby sirve aquí**: una ejecución diaria basta para anonimizar a 12 meses. (Fue el plan B que no valía para `EXPIRED`, donde el desfase se veía; aquí no.)
- `.env.example` con las variables nuevas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Actualizar `CLAUDE.md`**: dos de sus afirmaciones quedan falsas — *"Supabase se usa solo como PostgreSQL alojado, nada de su SDK, Auth ni Storage"* y *"un único administrador, una contraseña, sin sistema de usuarios"*.

---

## Trampas específicas a vigilar

- **`Promise.all` de consultas Prisma fuera de una transacción está prohibido** con `connection_limit=1` — ya provocó un `P2024` real. Al portar repositorios, no introducir lecturas paralelas dentro de un caso de uso.
- **Si `migrate dev` falla con `P1002` repetido**, sospechar del advisory lock huérfano antes que de la red, y **confirmar con el usuario** antes de tocar `pg_terminate_backend`.
- **Tras cada fusión a `main`, comprobar producción con una petición real.** Ya pasó una vez que el despliegue no salió y nada avisó.

---

## Ficheros críticos

| Fichero | Papel |
|---|---|
| `prisma/schema.prisma` | Los 5 modelos nuevos, `@@map`, el invariante rediseñado. |
| `prisma/migrations/…` | La migración con RLS en las cinco tablas + el trigger de auditoría. |
| `src/lib/auth.ts` | El punto único de la fase 3: `getAdminSession()` → `getAdminActor()`, con la restricción Edge/Node intacta. |
| `src/middleware.ts` | Conservar el matcher `/admin/:path*` y no meter red en Edge. |
| `package.json` | Node 22, Vitest, `@supabase/ssr`, `@supabase/supabase-js`, `exceljs`, `qrcode`. **No** entran `drizzle-orm`, `postgres` ni `drizzle-kit`. |
| `DataCueva:src/composicion/contenedor.ts` | La raíz de composición: sus imports marcan exactamente la frontera del porte de ORM. |
| `DataCueva:src/test-support/contrato-repositorios.ts` | Agnóstico del ORM: sobrevive intacto al cambio a Prisma. |

---

## Verificación

Por fase, además de `npm run typecheck`, `npm run lint`, `npm run build` y `npm run check:datetime`:

| Fase | Cómo se comprueba |
|---|---|
| 0 | El `.env` local apunta a la base de desarrollo: `npx prisma studio` muestra una base distinta de la de producción. Producción responde tras el despliegue de Node 22. |
| 1 | `npm test` en verde con los 15 ficheros. El build no cambia de tamaño porque nada importa ese código todavía. |
| 2 | `prisma migrate deploy` completo **contra la base de desarrollo primero**. La suite de contrato pasa contra Prisma real. Comprobar a mano que `UPDATE auditoria` falla y que dos préstamos activos del mismo equipo dan error. |
| 3 | Entrar por la puerta nueva y ejercitar **las siete acciones** del panel; luego repetir con la vieja. Comprobar que `auditoria` registra el correo real. En 3c, verificar en producción antes de borrar `ADMIN_PASSWORD` de Vercel. |
| 4 | `curl` contra cada handler nuevo, con y sin sesión, y con un rol insuficiente (debe dar 403). `api.test.ts` en verde. |
| 5 | Recorrido de teclado y **axe-core sobre el build de producción** en cada pantalla nueva. |
| 6 | Correr la anonimización a mano una vez y comprobar el resultado en la base de desarrollo antes de programar el cron. |

**Prueba de extremo a extremo al cerrar:** con la app desplegada, un administrador entra con su correo, registra un préstamo desde el mostrador, lo devuelve, y comprueba que la bitácora de auditoría atribuye **las dos acciones a su nombre**. En paralelo, una reserva del laboratorio sigue funcionando desde el QR impreso sin cambios.
