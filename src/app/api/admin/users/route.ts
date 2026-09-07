import { NextResponse } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { getAdminSession, puedeAdministrarUsuarios } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createAdminUserSchema } from "@/lib/validation/adminUser";

// scrypt viene de node:crypto, que no existe en Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Campos que se devuelven de un administrador.
 *
 * ⚠️ `passwordHash` NUNCA sale de aquí. No es que sirva de mucho a quien lo
 * lea —está hasheado—, pero un hash filtrado se puede atacar sin límite de
 * intentos y fuera de nuestra vista. Lo que no se selecciona no se puede
 * devolver por accidente al añadir un campo más adelante.
 */
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

export async function GET() {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Inicia sesión para ver los administradores.",
    );
  }
  if (!puedeAdministrarUsuarios(sesion)) {
    return errorResponse(
      403,
      "FORBIDDEN",
      "Solo el administrador general puede gestionar administradores.",
    );
  }

  const usuarios = await prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: CAMPOS,
  });

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Inicia sesión para crear administradores.",
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

  const parsed = createAdminUserSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { email, name, password, role, roomId } = parsed.data;

  // El esquema ya garantiza que un LAB_ADMIN trae sala; falta comprobar que esa
  // sala existe de verdad. Secuencial, no Promise.all (connection_limit=1).
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

  const yaExiste = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true },
  });
  if (yaExiste) {
    return errorResponse(
      409,
      "EMAIL_TAKEN",
      "Ya hay un administrador con ese correo. Si estaba desactivado, reactívalo en vez de crear otro.",
    );
  }

  const usuario = await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role,
      roomId,
    },
    select: CAMPOS,
  });

  return NextResponse.json(usuario, { status: 201 });
}
