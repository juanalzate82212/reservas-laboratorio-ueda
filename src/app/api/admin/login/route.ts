import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  signAdminToken,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/adminUser";

// scrypt viene de node:crypto, que no existe en Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const { email, password } = parsed.data;

  const usuario = await prisma.adminUser.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      roomId: true,
      isActive: true,
    },
  });

  /*
   * ⚠️ UN SOLO error para los tres casos: el correo no existe, la cuenta está
   * desactivada, o la contraseña no coincide. Mismo mensaje y mismo código.
   * Distinguirlos convertiría este endpoint en un comprobador de qué correos
   * son administradores. Es el mismo criterio que en la autocancelación
   * pública, que no distingue "ese código no existe" de "ese documento no
   * coincide".
   *
   * verifyPassword() se ejecuta igualmente cuando el usuario no existe, contra
   * un hash de descarte, para no responder notoriamente más rápido a un correo
   * inexistente que a una contraseña incorrecta.
   */
  const hashDeDescarte =
    "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const coincide = await verifyPassword(
    password,
    usuario?.passwordHash ?? hashDeDescarte,
  );

  if (!usuario || !usuario.isActive || !coincide) {
    return errorResponse(
      401,
      "INVALID_CREDENTIALS",
      "Correo o contraseña incorrectos.",
    );
  }

  /*
   * Un LAB_ADMIN sin laboratorio no puede administrar nada y getAdminSession()
   * lo rechazaría en la siguiente petición: mejor no abrir la sesión y decirlo,
   * en vez de dejarlo entrar a un panel que devolverá 401 en todo.
   */
  if (usuario.role === "LAB_ADMIN" && !usuario.roomId) {
    return errorResponse(
      403,
      "ADMIN_WITHOUT_ROOM",
      "Tu cuenta no tiene un laboratorio asignado. Pide al administrador general que te asigne uno.",
    );
  }

  const token = await signAdminToken(usuario);
  cookies().set(ADMIN_SESSION_COOKIE, token, adminCookieOptions());

  // No bloquea la respuesta si falla: es un dato de conveniencia, no parte del
  // inicio de sesión.
  await prisma.adminUser
    .update({ where: { id: usuario.id }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
