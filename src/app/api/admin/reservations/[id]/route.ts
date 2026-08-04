import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enviarCorreo } from "@/lib/mail/mailer";
import { cancelTemplate, confirmTemplate, rejectTemplate } from "@/lib/mail/templates";

// Nodemailer no corre en Edge Runtime (§7 del plan).
export const runtime = "nodejs";

/*
 * Transiciones permitidas (§6 del plan):
 *   PENDING   → CONFIRMED | REJECTED
 *   CONFIRMED → CANCELLED
 *   REJECTED / CANCELLED → (final)
 *
 * A diferencia del plan original, el admin no escribe un motivo: la acción
 * solo pide confirmación en la UI ("¿Estás seguro de...?"), pedido explícito
 * del usuario. `adminNote` sigue existiendo en el modelo (nullable) por si
 * una fase futura decide capturarlo, pero esta ruta no lo exige ni lo pide.
 */
const ACTION_TARGET: Record<"CONFIRM" | "REJECT" | "CANCEL", "CONFIRMED" | "REJECTED" | "CANCELLED"> = {
  CONFIRM: "CONFIRMED",
  REJECT: "REJECTED",
  CANCEL: "CANCELLED",
};

const ALLOWED_FROM: Record<"CONFIRM" | "REJECT" | "CANCEL", "PENDING" | "CONFIRMED"> = {
  CONFIRM: "PENDING",
  REJECT: "PENDING",
  CANCEL: "CONFIRMED",
};

const patchSchema = z.object({
  action: z.enum(["CONFIRM", "REJECT", "CANCEL"], {
    required_error: "Falta indicar la acción.",
    invalid_type_error: "Acción no reconocida.",
  }),
});

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para gestionar solicitudes.");
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(400, "VALIDATION_ERROR", "El cuerpo de la solicitud no es JSON válido.");
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { action } = parsed.data;

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!reservation) {
    return errorResponse(404, "RESERVATION_NOT_FOUND", "No encontramos esa solicitud.");
  }

  if (reservation.status !== ALLOWED_FROM[action]) {
    return errorResponse(
      409,
      "INVALID_TRANSITION",
      `Esa acción no aplica: la solicitud está en estado "${reservation.status}".`,
    );
  }

  const updated = await prisma.reservation.update({
    where: { id: params.id },
    data: { status: ACTION_TARGET[action], decidedAt: new Date() },
    include: { room: { select: { id: true, name: true, slug: true } } },
  });

  // El correo nunca bloquea la transición: la reserva ya quedó escrita
  // arriba. Si el envío falla, la respuesta sigue siendo 200 con
  // emailStatus: "FAILED" — el admin puede reintentar desde /admin/correos.
  const datosPlantilla = {
    code: updated.code,
    roomName: updated.room.name,
    startsAt: updated.startsAt,
    endsAt: updated.endsAt,
    requesterName: updated.requesterName,
    academicProgram: updated.academicProgram,
    activityType: updated.activityType,
    activityTypeOther: updated.activityTypeOther,
    attendees: updated.attendees,
    adminNote: updated.adminNote,
  };

  let plantilla: { subject: string; html: string };
  if (action === "CONFIRM") {
    const avisoSolapado = await prisma.timeBlock.findFirst({
      where: {
        OR: [{ roomId: updated.roomId }, { roomId: null }],
        kind: "WARNING",
        startsAt: { lt: updated.endsAt },
        endsAt: { gt: updated.startsAt },
      },
      select: { reason: true },
    });
    plantilla = confirmTemplate(datosPlantilla, avisoSolapado?.reason);
  } else if (action === "REJECT") {
    plantilla = rejectTemplate(datosPlantilla);
  } else {
    plantilla = cancelTemplate(datosPlantilla);
  }

  const emailStatus = await enviarCorreo({
    reservationId: updated.id,
    to: updated.requesterEmail,
    subject: plantilla.subject,
    html: plantilla.html,
  });

  return NextResponse.json({ ...updated, emailStatus });
}
