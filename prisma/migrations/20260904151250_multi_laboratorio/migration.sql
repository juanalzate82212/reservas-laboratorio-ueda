-- Multi-laboratorio, fase 1: identidad de laboratorio en Room, administradores
-- con usuario/contraseña, y trazabilidad de correo. Ver PLAN-MULTI-LAB.md.
--
-- ⚠️ ESCRITA A MANO. La que genera Prisma NO sirve: emite
--    `ALTER TABLE "Room" ADD COLUMN "mailKey" TEXT NOT NULL`, que falla contra
--    cualquier base con filas ("There are 1 rows in this table"). Aquí la
--    columna entra nullable, se rellena y solo entonces se marca NOT NULL.
--
-- Todo es ADITIVO: el código anterior sigue funcionando con este esquema, así
-- que se puede aplicar ANTES de desplegar.

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'LAB_ADMIN');

-- ---------------------------------------------------------------------------
-- Room: identidad del laboratorio
-- ---------------------------------------------------------------------------

ALTER TABLE "Room" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "mailFromName" TEXT,
ADD COLUMN     "shortName" TEXT;

-- Paso 1 de 3: nullable, para poder rellenarla.
ALTER TABLE "Room" ADD COLUMN "mailKey" TEXT;

-- Paso 2 de 3: la sala existente recibe su identidad real de laboratorio. Con
-- el modelo elegido (el laboratorio ES la sala) el nombre deja de ser "Sala
-- Principal" y pasa a ser el del laboratorio: `room.name` es lo que ven los
-- correos y el panel.
UPDATE "Room"
SET "slug"         = 'analitica-datos-ia',
    "name"         = 'Laboratorio de Analítica de Datos e Inteligencia Artificial',
    "shortName"    = 'Analítica de Datos e IA',
    "description"  = 'Laboratorio con equipos de cómputo para prácticas, talleres, evaluaciones y semilleros de investigación.',
    "mailKey"      = 'ANALITICA',
    "mailFromName" = 'Laboratorio de Analítica de Datos e Inteligencia Artificial',
    "contactEmail" = 'lab.analitica@amigo.edu.co'
WHERE "slug" = 'sala-principal';

-- Red de seguridad: si producción tuviera alguna otra fila (una sala retirada
-- que quedó ahí), el SET NOT NULL de abajo fallaría. Se le da una clave
-- derivada y determinista en vez de dejar la migración a medias.
UPDATE "Room"
SET "mailKey" = 'LAB_' || upper(substr(md5("id"), 1, 8))
WHERE "mailKey" IS NULL;

-- Paso 3 de 3: ya no hay nulos.
ALTER TABLE "Room" ALTER COLUMN "mailKey" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- EmailLog: de qué laboratorio salió cada correo y por qué buzón
-- ---------------------------------------------------------------------------

ALTER TABLE "EmailLog" ADD COLUMN     "fromAddress" TEXT,
ADD COLUMN     "roomId" TEXT;

-- Backfill por el único camino que existe: `reservationId` no tiene relación
-- ni clave foránea, así que el join es manual. Los correos sin reserva
-- asociada se quedan en NULL, que es correcto.
UPDATE "EmailLog" e
SET "roomId" = r."roomId"
FROM "Reservation" r
WHERE e."reservationId" = r."id"
  AND e."roomId" IS NULL;

-- ---------------------------------------------------------------------------
-- AdminUser
-- ---------------------------------------------------------------------------

CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'LAB_ADMIN',
    "roomId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- Postgres NO indexa las columnas de clave foránea por su cuenta.
CREATE INDEX "AdminUser_roomId_idx" ON "AdminUser"("roomId");
CREATE INDEX "EmailLog_roomId_idx" ON "EmailLog"("roomId");

CREATE UNIQUE INDEX "Room_mailKey_key" ON "Room"("mailKey");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-Level Security de la tabla nueva
-- ---------------------------------------------------------------------------
--
-- ⚠️ OBLIGATORIO y Prisma no lo deriva del esquema. Supabase expone toda tabla
-- de `public` por su API REST, protegida ÚNICAMENTE por RLS. Sin esto,
-- cualquiera con la llave `anon` (pública por diseño) podría leer "AdminUser"
-- entera — hashes de contraseña incluidos.
--
-- Se habilita SIN políticas, igual que las otras cuatro tablas: eso cierra el
-- canal REST por completo. La app no se ve afectada porque Prisma se conecta
-- como `postgres`, rol que ignora RLS. El linter de Supabase reportará
-- `rls_enabled_no_policy` como INFO: es el estado buscado, no un pendiente.
--
-- ⚠️ RLS NO es el mecanismo de aislamiento entre laboratorios — por lo mismo,
-- Prisma la ignora. Ese aislamiento vive en el `where` de cada handler de
-- /api/admin/** (fase 3).
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Laboratorio de Redes e Infraestructura
-- ---------------------------------------------------------------------------
--
-- ⚠️ Entra INACTIVO a propósito. `getActiveRoom()` es `rooms[0]` sobre
-- `orderBy: { slug: "asc" }`, y 'analitica-datos-ia' ordena antes que
-- 'redes-infraestructura' — pero mientras exista ese acoplamiento, activar la
-- fila desde la base podría cambiar la portada pública sin desplegar código y
-- sin un solo error. Se activa en la fase 2, cuando el portal ya exista.
--
-- El aforo es provisional: confirmarlo con el laboratorio antes de abrirlo.
INSERT INTO "Room" (
  "id", "slug", "name", "shortName", "description",
  "capacity", "hasComputers", "colorToken", "isActive",
  "mailKey", "mailFromName", "contactEmail", "createdAt"
) VALUES (
  'lab_redes_infraestructura',
  'redes-infraestructura',
  'Laboratorio de Redes e Infraestructura',
  'Redes e Infraestructura',
  'Laboratorio para prácticas de redes, conectividad e infraestructura tecnológica.',
  25,
  true,
  'azul',
  false,
  'REDES',
  'Laboratorio de Redes e Infraestructura',
  NULL,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
