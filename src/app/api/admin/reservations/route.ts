import { ReservationStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { alcanceDeSala, getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expirarReservasVencidas } from "@/lib/expiration";

// Del enum de Prisma, no a mano: un estado nuevo en el schema queda filtrable
// sin tener que acordarse de tocar esta lista.
const ESTADOS_VALIDOS = Object.values(ReservationStatus);

/*
 * A diferencia de /api/availability (pública, anonimizada), esta sí expone
 * los datos del solicitante — por eso exige sesión de admin. El middleware ya
 * protege /admin/**, pero cada handler de /api/admin/** verifica por su
 * cuenta (regla explícita del plan, ver CLAUDE.md).
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver las solicitudes.");
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const roomId = searchParams.get("roomId");

  if (status && !ESTADOS_VALIDOS.includes(status as ReservationStatus)) {
    return errorResponse(400, "VALIDATION_ERROR", "Estado no reconocido.");
  }

  // Antes de listar: la bandeja es la pantalla donde el administrador decide,
  // y no debe ofrecerle confirmar algo cuya franja ya pasó. De aquí cuelga
  // también el contador del nav, que llama a este mismo endpoint con
  // ?status=PENDING. Secuencial a propósito (ver expirarReservasVencidas).
  await expirarReservasVencidas();

  /*
   * ⚠️ El alcance va DESPUÉS del filtro del cliente, y el orden es la
   * seguridad: si `?roomId=` fuera lo último, un LAB_ADMIN podría pedir el
   * identificador de otro laboratorio y leer sus solicitudes con datos
   * personales incluidos. Así, su propia sala pisa lo que haya pedido; para un
   * SUPER_ADMIN el alcance es {} y el filtro del cliente sobrevive.
   */
  const reservations = await prisma.reservation.findMany({
    where: {
      ...(status ? { status: status as ReservationStatus } : {}),
      ...(roomId ? { roomId } : {}),
      ...alcanceDeSala(sesion),
    },
    orderBy: { startsAt: "asc" },
    include: { room: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json(reservations);
}
