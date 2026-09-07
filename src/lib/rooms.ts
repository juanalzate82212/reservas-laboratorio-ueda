import type { Room } from "@prisma/client";
import { cache } from "react";

import { prisma } from "./db";

/*
 * Los campos de un laboratorio que pueden viajar al navegador.
 *
 * ⚠️ `mailKey` y `mailFromName` NO están aquí a propósito: son de resolución
 * de buzón en el servidor y no tienen nada que hacer en el cliente. Este tipo
 * lo devuelve GET /api/rooms, que es público y sin sesión.
 */
export type ActiveRoom = Pick<
  Room,
  | "id"
  | "slug"
  | "name"
  | "shortName"
  | "description"
  | "capacity"
  | "hasComputers"
  | "colorToken"
  | "contactEmail"
>;

const CAMPOS_PUBLICOS = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  description: true,
  capacity: true,
  hasComputers: true,
  colorToken: true,
  contactEmail: true,
} as const;

/*
 * Compartida entre GET /api/rooms y las páginas que llaman a Prisma directo
 * (Server Components): así el criterio de "laboratorio activo" y los campos
 * expuestos no pueden desalinearse entre el endpoint y la página.
 */
export async function getActiveRooms(): Promise<ActiveRoom[]> {
  return prisma.room.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
    select: CAMPOS_PUBLICOS,
  });
}

/*
 * Un laboratorio por su slug, que es lo que lleva la URL /laboratorio/[slug].
 * Devuelve null también para los inactivos: un laboratorio que aún no abre no
 * debe ser alcanzable escribiendo su slug a mano, así que quien llama responde
 * notFound() sin distinguir "no existe" de "todavía no está abierto".
 */
export const getRoomBySlug = cache(
  async (slug: string): Promise<ActiveRoom | null> =>
    prisma.room.findFirst({
      where: { slug, isActive: true },
      select: CAMPOS_PUBLICOS,
    }),
);

/*
 * Aquí vivía `getActiveRoom()`, que devolvía `rooms[0]` de los activos. Era el
 * acoplamiento a "un solo laboratorio": mientras existió, activar una fila
 * desde la base podía cambiar QUÉ laboratorio mostraba la portada, sin
 * desplegar código y sin un solo error.
 *
 * Se retiró al construir el portal. Para una página de laboratorio se usa
 * getRoomBySlug(), que toma el laboratorio de la URL en vez de adivinarlo.
 */
