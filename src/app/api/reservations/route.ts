import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { BOOKING_CONFIG } from "@/config/booking";
import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { findConflicts, hasConflicts } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { expirarReservasVencidas } from "@/lib/expiration";
import { enviarCorreoAlLaboratorio } from "@/lib/mail/mailer";
import { newRequestAdminTemplate } from "@/lib/mail/templates";
import { generateReservationCode } from "@/lib/reservation-code";
import {
  createReservationSchema,
  mensajeAforoExcedido,
} from "@/lib/validation/reservation";

// Nodemailer no corre en Edge Runtime. Hace falta desde que este handler avisa
// al laboratorio de cada solicitud nueva.
export const runtime = "nodejs";

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
    academicProgram,
    activityType,
    activityTypeOther,
    attendees,
    responsibilityAccepted,
  } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const room = await prisma.room.findFirst({
    where: { id: roomId, isActive: true },
    select: { id: true, capacity: true, name: true },
  });
  if (!room) {
    return errorResponse(
      404,
      "ROOM_NOT_FOUND",
      "La sala indicada no existe o no está activa.",
    );
  }

  // El aforo sale de la BD, así que no cabe en el esquema de Zod compartido:
  // va aquí, con el resto de reglas que necesitan consultar. Esta es la
  // comprobación que manda — el cliente hace la suya con la capacidad que
  // recibió, pero pudo cambiar desde entonces, y de todos modos el servidor
  // no confía en el cliente.
  if (attendees > room.capacity) {
    return errorResponse(
      400,
      "ATTENDEES_EXCEED_CAPACITY",
      mensajeAforoExcedido(room.capacity),
    );
  }

  // Antes de contar: una solicitud cuya franja ya pasó no puede seguir
  // ocupando cupo. Sin esto, a quien se le vencieran 3 sin revisar quedaba
  // bloqueado de forma permanente, sin poder solicitar nunca más con ese
  // correo. Secuencial a propósito (ver expirarReservasVencidas).
  await expirarReservasVencidas();

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
              academicProgram,
              activityType,
              activityTypeOther: activityType === "OTRO" ? activityTypeOther || null : null,
              attendees,
              responsibilityAccepted,
            },
          });
        } catch (error) {
          if (!isUniqueCodeCollision(error)) throw error;
        }
      }
      throw new Error("No se pudo generar un código de reserva único.");
    });

    /*
     * Aviso al laboratorio, FUERA de la transacción y con la reserva ya
     * escrita. Dentro, una conexión SMTP lenta retendría la única conexión del
     * pool (connection_limit=1) mientras dura el envío.
     *
     * Tampoco puede impedir que la solicitud exista: enviarCorreo() nunca
     * lanza —registra FAILED en EmailLog y sigue—, así que el 201 se mantiene
     * pase lo que pase con el correo. Se espera en vez de lanzarlo al aire
     * porque en serverless la función puede congelarse en cuanto responde, y
     * un envío a medias no terminaría nunca.
     */
    try {
      await enviarCorreoAlLaboratorio({
        reservationId: reservation.id,
        ...newRequestAdminTemplate(
          {
            code: reservation.code,
            roomName: room.name,
            startsAt: reservation.startsAt,
            endsAt: reservation.endsAt,
            requesterName: reservation.requesterName,
            academicProgram: reservation.academicProgram,
            activityType: reservation.activityType,
            activityTypeOther: reservation.activityTypeOther,
            attendees: reservation.attendees,
          },
          reservation.requesterEmail,
        ),
      });
    } catch (error) {
      // enviarCorreo() ya atrapa los fallos de ENVÍO y los registra como
      // FAILED, pero el propio EmailLog.create puede fallar y esa excepción sí
      // saldría. Sin este guard, un problema al registrar el correo devolvería
      // 500 con la reserva ya creada: el solicitante creería que no se envió y
      // al reintentar chocaría con su propia franja.
      console.error("[correo] No se pudo avisar al laboratorio:", error);
    }

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
