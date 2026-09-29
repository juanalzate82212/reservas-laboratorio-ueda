import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { SesionAdminProvider } from "@/components/admin/SesionAdminProvider";
import { Logo } from "@/components/brand/Logo";
import { getAdminSession } from "@/lib/auth";

/*
 * Shell del panel: banda azul con el logo en blanco (variante del top bar del
 * §7 del documento de marca), navegación entre secciones y botón de salir.
 *
 * Resuelve la sesión una sola vez y la reparte por contexto, para que las
 * pantallas (Client Components) sepan qué pintar según el rol sin pedirla cada
 * una por su cuenta.
 *
 * No necesita `force-dynamic`: getAdminSession() lee cookies(), y eso ya saca
 * a la página del renderizado estático.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  /*
   * El middleware ya bloquea /admin/** sin sesión, pero comprueba solo la FIRMA
   * del token. Esta comprobación relee al usuario, así que a quien fue
   * desactivado se le cierra el panel en la siguiente navegación en vez de
   * cuando caduque su token, hasta 8 h después.
   */
  const sesion = await getAdminSession();
  if (!sesion) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-superficie">
      <header className="border-b border-primary-active bg-primary print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="rounded"
            aria-label="Ir a la bandeja de solicitudes"
          >
            <Logo variante="blanco" compacto className="sm:hidden" />
            <Logo variante="blanco" className="hidden sm:inline-flex" />
          </Link>

          <AdminNav esSuperAdmin={sesion.role === "SUPER_ADMIN"} />

          <AdminLogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        <SesionAdminProvider sesion={sesion}>{children}</SesionAdminProvider>
      </main>
    </div>
  );
}
