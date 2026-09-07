import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/auth";

/*
 * Protege /admin/**, excepto /admin/login (para no redirigir en bucle).
 * No es la única defensa: cada handler de /api/admin/** verifica la sesión por
 * su cuenta también — este middleware protege las PÁGINAS, no sustituye esa
 * comprobación en la API.
 *
 * Corre en Edge, así que solo puede usar verifyAdminToken (firma del token),
 * nunca getAdminSession(), que toca la base de datos.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const sesion = await verifyAdminToken(token);
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    // Ya autenticado y visitando login: no tiene sentido volver a pedirlo.
    if (sesion) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!sesion) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  /*
   * Gestionar administradores es transversal: solo el SUPER_ADMIN.
   *
   * ⚠️ Esto lee el ROL DEL TOKEN, que es una foto del momento del login y puede
   * haber envejecido hasta 8 h (a alguien degradado a LAB_ADMIN le seguiría
   * abriendo la página). No es un agujero: es comodidad de navegación. La
   * decisión que manda la toman los handlers de /api/admin/users/**, que releen
   * el usuario de la base con getAdminSession(). Sin sesión válida en la API,
   * la página se queda vacía y con 401.
   *
   * En Edge no se puede consultar la base, así que esta es la comprobación más
   * fuerte posible aquí.
   */
  if (pathname.startsWith("/admin/usuarios") && sesion.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
