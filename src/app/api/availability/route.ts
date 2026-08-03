import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { prisma } from "@/lib/db";
import { getClosedDaysInRange } from "@/lib/datetime";
import { availabilityQuerySchema } from "@/lib/validation/availability";

/*
 * Endpoint público. NUNCA devolver datos personales de una reserva: solo
 * startsAt, endsAt y status. Las reservas PENDING ocupan la franja igual que
 * las CONFIRMED, así que ambas cuentan como "ocupado" para este endpoint.
 */
export async function GET(request: NextRequest) {
  const parsed = availabilityQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { roomId, from, to } = parsed.data;
  const desde = new Date(from);
  const hasta = new Date(to);

  // Secuencial a propósito, NO Promise.all: DATABASE_URL lleva
  // connection_limit=1 (obligatorio con el pooler de transacción — ver
  // CLAUDE.md). Cada llamada al cliente `prisma` normal (a diferencia de un
  // `tx` dentro de $transaction, que reutiliza una sola conexión ya
  // reservada) intenta adquirir SU PROPIA conexión del pool; con el límite en
  // 1, lanzar varias a la vez las hace competir por esa única conexión y
  // agotar el `pool_timeout` (10 s) en vez de simplemente esperar su turno.
  // Consultar la sala primero también evita las otras dos consultas cuando
  // el roomId no existe.
  const room = await prisma.room.findFirst({
    where: { id: roomId, isActive: true },
    select: { id: true },
  });
  if (!room) {
    return errorResponse(
      404,
      "ROOM_NOT_FOUND",
      "La sala indicada no existe o no está activa.",
    );
  }

  // A y B se solapan si A.startsAt < B.endsAt && B.startsAt < A.endsAt.
  const reservations = await prisma.reservation.findMany({
    where: {
      roomId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: hasta },
      endsAt: { gt: desde },
    },
    select: { startsAt: true, endsAt: true, status: true },
    orderBy: { startsAt: "asc" },
  });
  const timeBlocks = await prisma.timeBlock.findMany({
    where: {
      OR: [{ roomId }, { roomId: null }],
      startsAt: { lt: hasta },
      endsAt: { gt: desde },
    },
    select: { startsAt: true, endsAt: true, kind: true, reason: true },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({
    reservations,
    timeBlocks,
    closedDays: getClosedDaysInRange(desde, hasta),
  });
}
