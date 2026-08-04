import { NextResponse } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTimeBlockSchema } from "@/lib/validation/timeBlock";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver las franjas.");
  }

  const timeBlocks = await prisma.timeBlock.findMany({
    orderBy: { startsAt: "asc" },
    include: { room: { select: { id: true, name: true } } },
  });

  return NextResponse.json(timeBlocks);
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para crear franjas.");
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(400, "VALIDATION_ERROR", "El cuerpo de la solicitud no es JSON válido.");
  }

  const parsed = createTimeBlockSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { roomId, startsAt, endsAt, kind, reason } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (roomId) {
    const room = await prisma.room.findFirst({ where: { id: roomId, isActive: true }, select: { id: true } });
    if (!room) {
      return errorResponse(404, "ROOM_NOT_FOUND", "La sala indicada no existe o no está activa.");
    }
  }

  // Solo BLOCKED puede chocar con una reserva — WARNING sigue siendo
  // reservable (§8 del plan), así que no tiene sentido bloquear su creación
  // por solapamiento.
  if (kind === "BLOCKED") {
    const conflictos = await prisma.reservation.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: end },
        endsAt: { gt: start },
        // roomId null = franja global: choca con reservas de CUALQUIER sala.
        ...(roomId ? { roomId } : {}),
      },
      select: {
        id: true,
        code: true,
        requesterName: true,
        startsAt: true,
        endsAt: true,
        room: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    if (conflictos.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "TIME_BLOCK_CONFLICT",
            message: `Hay ${conflictos.length} reserva${conflictos.length > 1 ? "s" : ""} en ese horario. Cancélalas primero o elige otro rango.`,
          },
          conflicts: conflictos,
        },
        { status: 409 },
      );
    }
  }

  const timeBlock = await prisma.timeBlock.create({
    data: { roomId, startsAt: start, endsAt: end, kind, reason },
    include: { room: { select: { id: true, name: true } } },
  });

  return NextResponse.json(timeBlock, { status: 201 });
}
