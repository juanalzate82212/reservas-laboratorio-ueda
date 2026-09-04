import type { Room } from "@prisma/client";

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
export async function getRoomBySlug(slug: string): Promise<ActiveRoom | null> {
  return prisma.room.findFirst({
    where: { slug, isActive: true },
    select: CAMPOS_PUBLICOS,
  });
}

/*
 * ⚠️ ESTO ES EL ACOPLAMIENTO A "UN SOLO LABORATORIO" y desaparece en la fase 2
 * (ver PLAN-MULTI-LAB.md). Devuelve el primero de los activos por orden de
 * slug, lo que era correcto cuando solo había uno reservable.
 *
 * Con dos laboratorios se vuelve una trampa: activar una fila desde la base
 * puede cambiar QUÉ laboratorio muestra la portada, sin desplegar código y sin
 * error alguno. Por eso el laboratorio de Redes entra inactivo hasta que el
 * portal exista y estas tres llamadas (app/page.tsx, app/reservar/page.tsx y
 * la copia en cliente de admin/calendario) se hayan retirado.
 *
 * NO usarla en código nuevo: para una página de laboratorio, getRoomBySlug().
 */
export async function getActiveRoom(): Promise<ActiveRoom | null> {
  const rooms = await getActiveRooms();
  return rooms[0] ?? null;
}
