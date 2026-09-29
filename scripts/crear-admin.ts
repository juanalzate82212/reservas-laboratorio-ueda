import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

/*
 * Crea o actualiza un administrador del panel.
 *
 * POR QUÉ EXISTE: la migración que crea la tabla `AdminUser` no puede sembrar
 * ninguno, porque hashear una contraseña necesita Node y una migración es SQL.
 * Y `prisma db seed` no vale para producción: borra `Reservation` y `TimeBlock`
 * completas. Sin este script, desplegar la autenticación multiusuario dejaría
 * el panel de producción sin nadie que pueda entrar.
 *
 * Es idempotente: si el correo ya existe, actualiza (contraseña incluida, si se
 * pasa una). No borra ni toca ninguna otra tabla.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." \
 *   ADMIN_ROLE=SUPER_ADMIN npx tsx scripts/crear-admin.ts
 *
 * Para un encargado de laboratorio:
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." \
 *   ADMIN_ROLE=LAB_ADMIN ADMIN_ROOM_SLUG=redes-infraestructura \
 *   npx tsx scripts/crear-admin.ts
 */
const prisma = new PrismaClient();

const LARGO_MINIMO = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();
  const role = (process.env.ADMIN_ROLE ?? "SUPER_ADMIN").trim();
  const roomSlug = process.env.ADMIN_ROOM_SLUG?.trim();

  /*
   * A qué base apunta, ANTES de escribir nada. Este script está pensado para
   * ejecutarse también contra producción, así que no basta con confiar en que
   * quien lo lanza sepa qué tiene en el entorno: se imprime el identificador
   * del proyecto para que se pueda comprobar de un vistazo.
   */
  const proyecto = (process.env.DATABASE_URL ?? "").match(/postgres\.([a-z0-9]{20})/)?.[1];
  console.log(`Base de datos: proyecto ${proyecto ?? "(no reconocido)"}`);

  if (!email || !password || !name) {
    throw new Error(
      "Faltan variables. Requiere ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NAME.",
    );
  }
  if (role !== "SUPER_ADMIN" && role !== "LAB_ADMIN") {
    throw new Error(`ADMIN_ROLE debe ser SUPER_ADMIN o LAB_ADMIN, no "${role}".`);
  }
  if (password.length < LARGO_MINIMO) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`);
  }

  /*
   * Un encargado SIEMPRE tiene laboratorio, y un administrador general nunca.
   * Es la misma regla que aplica el esquema Zod del CRUD: sin ella entraría en
   * la base un encargado sin laboratorio, y getAdminSession() le negaría la
   * sesión — se habría creado una cuenta que no puede entrar.
   */
  let roomId: string | null = null;
  if (role === "LAB_ADMIN") {
    if (!roomSlug) {
      throw new Error("Un LAB_ADMIN necesita ADMIN_ROOM_SLUG.");
    }
    const sala = await prisma.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true, name: true },
    });
    if (!sala) {
      throw new Error(`No existe ningún laboratorio con el slug "${roomSlug}".`);
    }
    roomId = sala.id;
    console.log(`Laboratorio: ${sala.name}`);
  } else if (roomSlug) {
    throw new Error(
      "Un SUPER_ADMIN es transversal: no se le asigna laboratorio. Quita ADMIN_ROOM_SLUG.",
    );
  }

  const passwordHash = await hashPassword(password);

  const existente = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true },
  });

  const usuario = await prisma.adminUser.upsert({
    where: { email },
    update: { name, role, roomId, passwordHash, isActive: true },
    create: { email, name, role, roomId, passwordHash },
    select: { id: true, email: true, role: true },
  });

  console.log(
    `${existente ? "Actualizado" : "Creado"}: ${usuario.email} (${usuario.role})`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
