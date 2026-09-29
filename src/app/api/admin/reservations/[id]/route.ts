import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { alcanceDeSala, getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  enviarCorreo,
  enviarCorreoAlLaboratorio,
  type DescripcionInvitacion,
} from "@/lib/mail/mailer";
import {
  cancelAdminTemplate,
  cancelTemplate,
  confirmAdminTemplate,
  confirmTemplate,
  rejectTemplate,
} from "@/lib/mail/templates";

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
const ACTION_TARGET: Record<
  "CONFIRM" | "REJECT" | "CANCEL",
  "CONFIRMED" | "REJECTED" | "CANCELLED"
> = {
  CONFIRM: "CONFIRMED",
  REJECT: "REJECTED",
  CANCEL: "CANCELLED",
};

const ALLOWED_FROM: Record<
  "CONFIRM" | "REJECT" | "CANCEL",
  "PENDING" | "CONFIRMED"
> = {
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
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Inicia sesión para gestionar solicitudes.",
    );
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "El cuerpo de la solicitud no es JSON válido.",
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { action } = parsed.data;

  /*
   * findFirst con el alcance, no findUnique por id: una solicitud de otro
   * laboratorio tiene que ser indistinguible de una que no existe.
   *
   * Responde 404 y no 403 a propósito. Un 403 confirmaría que ese id existe, y
   * con eso se puede recorrer el espacio de identificadores y contar las
   * solicitudes ajenas. Mismo criterio que la autocancelación pública, que no
   * distingue "ese código no existe" de "ese documento no coincide".
   */
  const reservation = await prisma.reservation.findFirst({
    where: { id: params.id, ...alcanceDeSala(sesion) },
    select: { id: true, status: true },
  });
  if (!reservation) {
    return errorResponse(
      404,
      "RESERVATION_NOT_FOUND",
      "No encontramos esa solicitud.",
    );
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
    include: {
      room: { select: { id: true, name: true, slug: true, mailKey: true } },
    },
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

  /*
   * Qué invitación de calendario acompaña a la decisión.
   *
   * Solo CONFIRM y CANCEL tienen una. REJECT sale de PENDING, y una solicitud
   * pendiente nunca llegó a tener evento: mandar un CANCEL de algo que no se
   * creó no retira nada y ensucia el buzón del solicitante.
   *
   * El CANCEL solo puede venir de CONFIRMED —lo impone ALLOWED_FROM—, así que
   * aquí sí es seguro asumir que hubo invitación antes.
   */
  const invitacion: DescripcionInvitacion | undefined =
    action === "REJECT"
      ? undefined
      : {
          metodo: action === "CONFIRM" ? "REQUEST" : "CANCEL",
          reserva: {
            code: updated.code,
            roomName: updated.room.name,
            startsAt: updated.startsAt,
            endsAt: updated.endsAt,
            activityType: updated.activityType,
            activityTypeOther: updated.activityTypeOther,
          },
          solicitante: {
            nombre: updated.requesterName,
            correo: updated.requesterEmail,
          },
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

  /*
   * ⚠️ try/catch, además del que ya tiene el mailer. enviarCorreo() atrapa los
   * fallos de ENVÍO, pero el EmailLog.create de dentro de su propio `catch`
   * puede fallar por su cuenta —y esa excepción sí sale—, convirtiendo un 200
   * con la reserva YA TRANSICIONADA en un 500. El administrador vería un error,
   * volvería a intentarlo y se encontraría con un 409 de transición inválida,
   * sin entender que la primera vez sí funcionó.
   *
   * Era el único de los cuatro handlers de correo sin esta guarda.
   */
  let emailStatus: Awaited<ReturnType<typeof enviarCorreo>> | null = null;
  try {
    emailStatus = await enviarCorreo({
      reservationId: updated.id,
      roomId: updated.roomId,
      mailKey: updated.room.mailKey,
      to: updated.requesterEmail,
      subject: plantilla.subject,
      html: plantilla.html,
      invitacion,
    });

    /*
     * Y la copia del laboratorio, con la MISMA invitación. Es lo único que
     * mete el evento en su calendario: aparecer como ATTENDEE en el correo
     * del solicitante no le entrega nada.
     *
     * Secuencial, después del primero: cada envío escribe su EmailLog y con
     * connection_limit=1 en paralelo competirían por la única conexión.
     *
     * Al rechazar no se manda: no hay evento que poner ni que quitar.
     */
    if (invitacion) {
      await enviarCorreoAlLaboratorio({
        reservationId: updated.id,
        roomId: updated.roomId,
        mailKey: updated.room.mailKey,
        ...(action === "CONFIRM"
          ? confirmAdminTemplate(datosPlantilla)
          : cancelAdminTemplate(datosPlantilla)),
        invitacion,
      });
    }
  } catch (error) {
    console.error(
      "[correo] Falló el correo de una decisión del administrador:",
      error,
    );
  }

  return NextResponse.json({ ...updated, emailStatus });
}
