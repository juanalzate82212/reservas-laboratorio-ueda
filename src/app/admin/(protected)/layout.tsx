import Link from "next/link";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/brand/Logo";

/*
 * Shell del panel: banda azul con el logo en blanco (variante del top bar del
 * §7 del documento de marca), navegación entre secciones y botón de salir.
 * Las secciones en sí (bandeja, franjas, correos, QR) llegan en las Fases
 * 6-8 — aquí solo va el marco común.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
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

          <AdminNav />

          <AdminLogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
