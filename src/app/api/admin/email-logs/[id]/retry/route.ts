import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { alcanceDeSala, getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reintentarCorreo } from "@/lib/mail/mailer";

// Nodemailer no corre en Edge Runtime (§7 del plan).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para reintentar el envío.");
  }

  /*
   * Comprobar el alcance ANTES de reintentar: reintentarCorreo() vuelve a
   * enviar el correo de verdad, así que sin esto un LAB_ADMIN podría relanzar
   * correos de otro laboratorio a sus solicitantes. Secuencial, no Promise.all
   * (connection_limit=1).
   */
  const log = await prisma.emailLog.findFirst({
    where: { id: params.id, ...alcanceDeSala(sesion) },
    select: { id: true },
  });
  if (!log) {
    return errorResponse(404, "EMAIL_LOG_NOT_FOUND", "No encontramos ese registro de correo.");
  }

  const status = await reintentarCorreo(params.id);
  if (status === null) {
    return errorResponse(404, "EMAIL_LOG_NOT_FOUND", "No encontramos ese registro de correo.");
  }

  return NextResponse.json({ status });
}
