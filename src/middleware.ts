import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/auth";

/*
 * Protege /admin/**, excepto /admin/login (para no redirigir en bucle).
 * No es la única defensa: cada handler de /api/admin/** verifica la sesión
 * por su cuenta también (§2.8 del plan) — este middleware protege las
 * PÁGINAS, no sustituye esa comprobación en la API.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const sesionValida = await verifyAdminToken(token);
  const enLogin = request.nextUrl.pathname === "/admin/login";

  if (enLogin) {
    // Ya autenticado y visitando login: no tiene sentido volver a pedirlo.
    if (sesionValida) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!sesionValida) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
