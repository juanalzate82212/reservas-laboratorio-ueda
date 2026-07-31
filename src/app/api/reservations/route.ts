import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { BOOKING_CONFIG } from "@/config/booking";
import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { findConflicts, hasConflicts } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { generateReservationCode } from "@/lib/reservation-code";
import { createReservationSchema } from "@/lib/validation/reservation";

/** Señal interna: la franja dejó de estar libre entre que se validó y se creó. */
class SlotUnavailableError extends Error {}

function isUniqueCodeCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("code")
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "El cuerpo de la solicitud no es JSON válido.",
    );
  }

  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const {
    roomId,
    startsAt,
    endsAt,
    requesterName,
    requesterRole,
    requesterDocId,
    requesterEmail,
    purpose,
    attendees,
  } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(endsAt);

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

  const pendientesDelCorreo = await prisma.reservation.count({
    where: { requesterEmail, status: "PENDING" },
  });
  if (pendientesDelCorreo >= BOOKING_CONFIG.maxPendingPerEmail) {
    return errorResponse(
      409,
      "TOO_MANY_PENDING",
      `Ya tienes ${BOOKING_CONFIG.maxPendingPerEmail} solicitudes en revisión con ese correo. Espera a que el administrador responda antes de enviar otra.`,
    );
  }

  try {
    // La verificación de choque y la creación van dentro de la misma
    // transacción (§5 del plan): sin esto, dos solicitudes de la misma franja
    // llegadas casi al mismo tiempo podrían pasar ambas la comprobación.
    const reservation = await prisma.$transaction(async (tx) => {
      const [reservasCandidatas, bloqueosCandidatos] = await Promise.all([
        tx.reservation.findMany({
          where: {
            roomId,
            status: { in: ["PENDING", "CONFIRMED"] },
            startsAt: { lt: end },
            endsAt: { gt: start },
          },
          select: { startsAt: true, endsAt: true, status: true },
        }),
        tx.timeBlock.findMany({
          where: {
            OR: [{ roomId }, { roomId: null }],
            kind: "BLOCKED",
            startsAt: { lt: end },
            endsAt: { gt: start },
          },
          select: { startsAt: true, endsAt: true, kind: true, reason: true },
        }),
      ]);

      const conflictos = findConflicts(
        { startsAt: start, endsAt: end },
        { reservations: reservasCandidatas, blocks: bloqueosCandidatos },
      );
      if (hasConflicts(conflictos)) {
        throw new SlotUnavailableError();
      }

      // Colisión de código: reintenta con uno nuevo en vez de fallar la
      // solicitud completa (33^5 combinaciones, pero no hay que confiar en que
      // nunca choque).
      for (let intento = 0; intento < 5; intento += 1) {
        try {
          return await tx.reservation.create({
            data: {
              code: generateReservationCode(),
              roomId,
              startsAt: start,
              endsAt: end,
              requesterName,
              requesterRole,
              requesterDocId,
              requesterEmail,
              purpose: purpose || null,
              attendees,
            },
          });
        } catch (error) {
          if (!isUniqueCodeCollision(error)) throw error;
        }
      }
      throw new Error("No se pudo generar un código de reserva único.");
    });

    return NextResponse.json({ code: reservation.code }, { status: 201 });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return errorResponse(
        409,
        "SLOT_UNAVAILABLE",
        "Esa franja acaba de ser reservada, elige otra.",
      );
    }
    throw error;
  }
}
