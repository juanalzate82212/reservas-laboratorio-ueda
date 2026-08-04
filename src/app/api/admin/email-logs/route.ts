import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver los correos.");
  }

  const logs = await prisma.emailLog.findMany({
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json(logs);
}
