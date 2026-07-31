import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/*
 * Sin request ni cookies/headers, Next.js trataría este handler como
 * candidato a pre-renderizarse en build time —lo que ejecutaría esta consulta
 * contra la base de datos durante `next build`, no en cada petición—. Aparte
 * de que eso rompería el build con las credenciales falsas de CI, cachear la
 * lista de salas estáticamente es incorrecto: si el admin desactiva una sala,
 * no se vería hasta el próximo deploy.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = await prisma.room.findMany({
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

  return NextResponse.json(rooms);
}
