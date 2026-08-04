import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para eliminar franjas.");
  }

  const timeBlock = await prisma.timeBlock.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!timeBlock) {
    return errorResponse(404, "TIME_BLOCK_NOT_FOUND", "No encontramos esa franja.");
  }

  await prisma.timeBlock.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
