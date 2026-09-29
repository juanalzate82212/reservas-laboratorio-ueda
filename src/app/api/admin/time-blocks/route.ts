import { NextResponse } from "next/server";

import { errorResponse, validationErrorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTimeBlockSchema } from "@/lib/validation/timeBlock";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver las franjas.");
  }

  /*
   * ⚠️ Aquí el alcance NO es alcanceDeSala(): un LAB_ADMIN tiene que VER las
   * franjas globales (roomId null) porque le cierran su propio calendario, y
   * ocultarlas le haría ver huecos libres que en realidad no lo están.
   *
   * Ver no es tocar: crearlas y borrarlas sí queda reservado al SUPER_ADMIN
   * (ver POST aquí abajo y DELETE en [id]/route.ts). La UI las marca como
   * globales y no ofrece el botón de eliminar.
   */
  const timeBlocks = await prisma.timeBlock.findMany({
    where:
      sesion.role === "SUPER_ADMIN"
        ? {}
        : { OR: [{ roomId: sesion.roomId }, { roomId: null }] },
    orderBy: { startsAt: "asc" },
    include: { room: { select: { id: true, name: true } } },
  });

  return NextResponse.json(timeBlocks);
}

export async function POST(request: Request) {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para crear franjas.");
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse(400, "VALIDATION_ERROR", "El cuerpo de la solicitud no es JSON válido.");
  }

  const parsed = createTimeBlockSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { roomId, startsAt, endsAt, kind, reason } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  /*
   * Una franja global (roomId null) cierra el calendario de TODOS los
   * laboratorios, incluidos los que quien la crea no administra. Por eso es lo
   * único que un LAB_ADMIN no puede crear: es la decisión explícita del
   * usuario, y sin ella el aislamiento se podría saltar por la puerta de al
   * lado — no leyendo datos ajenos, pero sí bloqueando laboratorios ajenos.
   *
   * 403 y no 404: aquí no se está revelando la existencia de nada, y quien lo
   * intenta merece saber por qué no puede.
   */
  if (sesion.role === "LAB_ADMIN") {
    if (!roomId) {
      return errorResponse(
        403,
        "GLOBAL_TIME_BLOCK_FORBIDDEN",
        "Una franja para todos los laboratorios solo la puede crear el administrador general.",
      );
    }
    if (roomId !== sesion.roomId) {
      return errorResponse(
        403,
        "ROOM_FORBIDDEN",
        "Solo puedes crear franjas de tu propio laboratorio.",
      );
    }
  }

  if (roomId) {
    const room = await prisma.room.findFirst({ where: { id: roomId, isActive: true }, select: { id: true } });
    if (!room) {
      return errorResponse(404, "ROOM_NOT_FOUND", "La sala indicada no existe o no está activa.");
    }
  }

  // Solo BLOCKED puede chocar con una reserva — WARNING sigue siendo
  // reservable (§8 del plan), así que no tiene sentido bloquear su creación
  // por solapamiento.
  if (kind === "BLOCKED") {
    const conflictos = await prisma.reservation.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: { lt: end },
        endsAt: { gt: start },
        // roomId null = franja global: choca con reservas de CUALQUIER sala.
        ...(roomId ? { roomId } : {}),
      },
      select: {
        id: true,
        code: true,
        requesterName: true,
        startsAt: true,
        endsAt: true,
        room: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    if (conflictos.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "TIME_BLOCK_CONFLICT",
            message: `Hay ${conflictos.length} reserva${conflictos.length > 1 ? "s" : ""} en ese horario. Cancélalas primero o elige otro rango.`,
          },
          conflicts: conflictos,
        },
        { status: 409 },
      );
    }
  }

  const timeBlock = await prisma.timeBlock.create({
    data: { roomId, startsAt: start, endsAt: end, kind, reason },
    include: { room: { select: { id: true, name: true } } },
  });

  return NextResponse.json(timeBlock, { status: 201 });
}
