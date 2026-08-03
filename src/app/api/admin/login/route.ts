import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { ADMIN_SESSION_COOKIE, adminCookieOptions, signAdminToken } from "@/lib/auth";

const loginSchema = z.object({
  password: z.string().min(1, "Ingresa la contraseña."),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "El cuerpo de la solicitud no es JSON válido.",
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Falta de configuración del servidor, no un error del usuario.
    return errorResponse(
      500,
      "SERVER_MISCONFIGURED",
      "El servidor no tiene una contraseña de administrador configurada.",
    );
  }

  if (parsed.data.password !== adminPassword) {
    return errorResponse(401, "INVALID_CREDENTIALS", "Contraseña incorrecta.");
  }

  const token = await signAdminToken();
  cookies().set(ADMIN_SESSION_COOKIE, token, adminCookieOptions());

  return NextResponse.json({ ok: true });
}
