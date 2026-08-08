import { NextResponse } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { prisma } from "@/lib/db";
import { enviarCorreo, enviarCorreoAlLaboratorio } from "@/lib/mail/mailer";
import { requesterCancelAdminTemplate, selfCancelTemplate } from "@/lib/mail/templates";
import { normalizeReservationCode } from "@/lib/reservation-code";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservationStatus";
import { cancelReservationSchema } from "@/lib/validation/reservation";

// Nodemailer no corre en Edge Runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Cancelación por parte del propio solicitante. Sin sesión: la llave son dos
 * datos que solo tiene quien reservó — el código (que solo se muestra al
 * enviar la solicitud) y el número de documento con el que la hizo.
 *
 * El documento por sí solo no es un secreto: alguien cercano puede conocerlo.
 * Lo que protege es la combinación, más el acuse por correo al solicitante,
 * que convierte una cancelación no autorizada en algo visible al momento en
 * vez de una sorpresa el día de la actividad.
 */
export async function POST(
  request: Request,
  { params }: { params: { code: string } },
) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "El cuerpo de la solicitud no es JSON válido.",
    );
  }

  const parsed = cancelReservationSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const code = normalizeReservationCode(params.code);

  const reservation = await prisma.reservation.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      startsAt: true,
      endsAt: true,
      requesterDocId: true,
      requesterEmail: true,
      requesterName: true,
      academicProgram: true,
      activityType: true,
      activityTypeOther: true,
      attendees: true,
      room: { select: { name: true } },
    },
  });

  // Mismo error para "ese código no existe" y "ese documento no coincide". Si
  // fueran distintos, este endpoint respondería si un código existe o no, y
  // eso convertiría el espacio de códigos en algo que se puede recorrer.
  if (!reservation || reservation.requesterDocId !== parsed.data.requesterDocId) {
    return errorResponse(
      404,
      "RESERVATION_NOT_FOUND",
      "No pudimos verificar esos datos. Revisa el código y el número de documento con el que solicitaste.",
    );
  }

  // A partir de aquí quien pregunta ya demostró ser el solicitante, así que
  // sí se puede ser específico sobre por qué no se puede cancelar.
  if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
    return errorResponse(
      409,
      "INVALID_TRANSITION",
      `Esta reserva ya no se puede cancelar: está ${RESERVATION_STATUS_LABEL[reservation.status].toLowerCase()}.`,
    );
  }

  if (reservation.startsAt.getTime() <= Date.now()) {
    return errorResponse(
      409,
      "CANCELLATION_WINDOW_CLOSED",
      "Esta reserva ya empezó, así que no se puede cancelar. Si no vas a usar el espacio, avísale al laboratorio.",
    );
  }

  // Compare-and-set: el estado va en el WHERE, no solo en la comprobación de
  // arriba. Si el administrador confirma o rechaza entre una cosa y la otra,
  // esto no toca ninguna fila en vez de pisar su decisión.
  const { count } = await prisma.reservation.updateMany({
    where: { id: reservation.id, status: { in: ["PENDING", "CONFIRMED"] } },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
  if (count === 0) {
    return errorResponse(
      409,
      "INVALID_TRANSITION",
      "Esta reserva acaba de cambiar de estado. Vuelve a consultarla para ver cómo quedó.",
    );
  }

  const datosPlantilla = {
    code: reservation.code,
    roomName: reservation.room.name,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    requesterName: reservation.requesterName,
    academicProgram: reservation.academicProgram,
    activityType: reservation.activityType,
    activityTypeOther: reservation.activityTypeOther,
    attendees: reservation.attendees,
  };

  // Igual que en el panel: la cancelación ya quedó escrita, así que el correo
  // no puede deshacerla ni bloquearla. Secuenciales, nunca en paralelo — cada
  // envío escribe su EmailLog y con connection_limit=1 competirían por la
  // única conexión.
  const acuse = await enviarCorreo({
    reservationId: reservation.id,
    to: reservation.requesterEmail,
    ...selfCancelTemplate(datosPlantilla),
  });

  await enviarCorreoAlLaboratorio({
    reservationId: reservation.id,
    ...requesterCancelAdminTemplate(datosPlantilla),
  });

  return NextResponse.json({
    code: reservation.code,
    status: "CANCELLED",
    emailStatus: acuse,
  });
}
