import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { alcanceDeSala, getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const sesion = await getAdminSession();
  if (!sesion) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para eliminar franjas.");
  }

  /*
   * ⚠️ Alcance ESTRICTO, al revés que en el GET de la lista: allí un LAB_ADMIN
   * ve las franjas globales porque le afectan, pero aquí no puede borrarlas
   * —alcanceDeSala() exige `roomId` igual al suyo, y una global lo tiene null,
   * así que no casa— ni tocar las de otro laboratorio. Solo el SUPER_ADMIN, con
   * alcance vacío, borra cualquiera.
   *
   * Antes esto borraba por id a secas.
   */
  const timeBlock = await prisma.timeBlock.findFirst({
    where: { id: params.id, ...alcanceDeSala(sesion) },
    select: { id: true },
  });
  if (!timeBlock) {
    return errorResponse(404, "TIME_BLOCK_NOT_FOUND", "No encontramos esa franja.");
  }

  await prisma.timeBlock.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
