import { NextResponse, type NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ESTADOS_VALIDOS = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"] as const;

/*
 * A diferencia de /api/availability (pública, anonimizada), esta sí expone
 * los datos del solicitante — por eso exige sesión de admin. El middleware ya
 * protege /admin/**, pero cada handler de /api/admin/** verifica por su
 * cuenta (regla explícita del plan, ver CLAUDE.md).
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver las solicitudes.");
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const roomId = searchParams.get("roomId");

  if (status && !ESTADOS_VALIDOS.includes(status as (typeof ESTADOS_VALIDOS)[number])) {
    return errorResponse(400, "VALIDATION_ERROR", "Estado no reconocido.");
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(status ? { status: status as (typeof ESTADOS_VALIDOS)[number] } : {}),
      ...(roomId ? { roomId } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: { room: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json(reservations);
}
