import { NextResponse } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { getAdminSession, puedeAdministrarUsuarios } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { updateAdminUserSchema } from "@/lib/validation/adminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPOS = {
  id: true,
  email: true,
  name: true,
  role: true,
  roomId: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  room: { select: { id: true, name: true } },
} as const;

/*
 * No hay DELETE a propósito: un administrador se DESACTIVA, no se borra.
 * Borrarlo perdería el rastro de quién decidió sobre las solicitudes que ya
 * resolvió, y `isActive: false` ya corta el acceso de inmediato —
 * getAdminSession() relee la fila en cada petición, así que la sesión abierta
 * deja de valer sin esperar a que caduque el token.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Inicia sesión para gestionar administradores.",
    );
  }
  if (!puedeAdministrarUsuarios(sesion)) {
    return errorResponse(
      403,
      "FORBIDDEN",
      "Solo el administrador general puede gestionar administradores.",
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

  const parsed = updateAdminUserSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { name, role, roomId, isActive, password } = parsed.data;

  const objetivo = await prisma.adminUser.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!objetivo) {
    return errorResponse(
      404,
      "ADMIN_USER_NOT_FOUND",
      "No encontramos ese administrador.",
    );
  }

  /*
   * ⚠️ Nadie puede desactivarse ni degradarse a sí mismo, y esto es lo que
   * impide dejar la aplicación sin ningún administrador general: como quien
   * ejecuta esto ES un SUPER_ADMIN activo, protegerlo de sí mismo garantiza
   * que siempre quede al menos uno. Sin esta regla, el último podría quitarse
   * el rol y nadie —tampoco él— podría volver a entrar a arreglarlo.
   *
   * Degradar o desactivar a OTRO sí se puede: siempre queda quien lo hizo.
   */
  if (objetivo.id === sesion.userId) {
    if (!isActive) {
      return errorResponse(
        409,
        "CANNOT_DEACTIVATE_SELF",
        "No puedes desactivar tu propia cuenta. Pídeselo a otro administrador general.",
      );
    }
    if (role !== "SUPER_ADMIN") {
      return errorResponse(
        409,
        "CANNOT_DEMOTE_SELF",
        "No puedes quitarte a ti mismo el rol de administrador general.",
      );
    }
  }

  if (roomId) {
    const sala = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });
    if (!sala) {
      return errorResponse(
        404,
        "ROOM_NOT_FOUND",
        "El laboratorio indicado no existe.",
      );
    }
  }

  const usuario = await prisma.adminUser.update({
    where: { id: params.id },
    data: {
      name,
      role,
      roomId,
      isActive,
      // Vacío o ausente = no se toca. Es el caso normal al editar cualquier
      // otro campo, y evita pedir la contraseña para cambiar un nombre.
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
    select: CAMPOS,
  });

  return NextResponse.json(usuario);
}
