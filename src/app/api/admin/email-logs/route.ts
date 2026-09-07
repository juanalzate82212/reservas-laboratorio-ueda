import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { alcanceDeSala, getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver los correos.");
  }

  /*
   * Los correos llevan `roomId` desde la fase 1; antes no había por dónde
   * acotarlos. Un correo con roomId null (anterior al backfill, o sin reserva
   * asociada) NO lo ve un LAB_ADMIN: ante la duda, se cierra, porque el cuerpo
   * del correo trae nombre y datos del solicitante.
   */
  const logs = await prisma.emailLog.findMany({
    where: alcanceDeSala(sesion),
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json(logs);
}
