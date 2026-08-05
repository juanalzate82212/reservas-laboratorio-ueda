import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { getPublicReservationByCode } from "@/lib/reservations";

/*
 * Consulta pública por código: nunca expone el documento y nunca el correo
 * completo (ver Privacidad en CLAUDE.md). Es la única forma de recuperar el
 * estado de una solicitud si se pierde la pantalla de éxito — no hay correo
 * de acuse en el MVP.
 */
export async function GET(
  _request: Request,
  { params }: { params: { code: string } },
) {
  const reservation = await getPublicReservationByCode(params.code);

  if (!reservation) {
    return errorResponse(
      404,
      "RESERVATION_NOT_FOUND",
      "No encontramos ninguna reserva con ese código.",
    );
  }

  return NextResponse.json(reservation);
}
