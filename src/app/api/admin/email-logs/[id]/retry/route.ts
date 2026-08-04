import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { reintentarCorreo } from "@/lib/mail/mailer";

// Nodemailer no corre en Edge Runtime (§7 del plan).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para reintentar el envío.");
  }

  const status = await reintentarCorreo(params.id);
  if (status === null) {
    return errorResponse(404, "EMAIL_LOG_NOT_FOUND", "No encontramos ese registro de correo.");
  }

  return NextResponse.json({ status });
}
