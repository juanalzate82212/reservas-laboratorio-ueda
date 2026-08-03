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

  // Las tres consultas van en paralelo, no la comprobación de sala seguida de
  // las otras dos: cada round-trip a Supabase pesa (más aún bajo el pooler de
  // transacción, que envuelve cada consulta en BEGIN/DEALLOCATE ALL/COMMIT),
  // y esperar la sala antes de lanzar el resto solo suma latencia en serie
  // sin necesidad — roomId ya viene de /api/rooms, no de un formulario.
  const [room, reservations, timeBlocks] = await Promise.all([
    prisma.room.findFirst({
      where: { id: roomId, isActive: true },
      select: { id: true },
    }),
    // A y B se solapan si A.startsAt < B.endsAt && B.startsAt < A.endsAt.
    prisma.reservation.findMany({
      where: {
        roomId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: hasta },
        endsAt: { gt: desde },
      },
      select: { startsAt: true, endsAt: true, status: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeBlock.findMany({
      where: {
        OR: [{ roomId }, { roomId: null }],
        startsAt: { lt: hasta },
        endsAt: { gt: desde },
      },
      select: { startsAt: true, endsAt: true, kind: true, reason: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  if (!room) {
    return errorResponse(
      404,
      "ROOM_NOT_FOUND",
      "La sala indicada no existe o no está activa.",
    );
  }

  return NextResponse.json({
    reservations,
    timeBlocks,
    closedDays: getClosedDaysInRange(desde, hasta),
  });
}
