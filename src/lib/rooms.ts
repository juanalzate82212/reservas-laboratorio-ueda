import type { Room } from "@prisma/client";

import { prisma } from "./db";

export type ActiveRoom = Pick<
  Room,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "capacity"
  | "hasComputers"
  | "colorToken"
>;

/*
 * Compartida entre GET /api/rooms y la landing (Server Component): así el
 * criterio de "sala activa" y los campos expuestos no pueden desalinearse
 * entre el endpoint y la página que llama a Prisma directamente.
 */
export async function getActiveRooms(): Promise<ActiveRoom[]> {
  return prisma.room.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      capacity: true,
      hasComputers: true,
      colorToken: true,
    },
  });
}

/*
 * Solo Sala Principal es reservable (decisión de producto: se retiró Sala de
 * Reuniones). `Room` sigue siendo un modelo genérico por si vuelve a hacer
 * falta una segunda sala — esta función solo asume que, de las salas
 * activas, la primera es la que hay que mostrar.
 */
export async function getActiveRoom(): Promise<ActiveRoom | null> {
  const rooms = await getActiveRooms();
  return rooms[0] ?? null;
}
