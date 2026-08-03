"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/*
 * Secciones del panel (§9, Fases 5-8 del plan). Franjas/Correos/QR todavía no
 * existen como páginas — el enlace está listo, la Fase que lo construye lo
 * completa.
 */
const ENLACES = [
  { href: "/admin", label: "Solicitudes" },
  { href: "/admin/franjas", label: "Franjas" },
  { href: "/admin/correos", label: "Correos" },
  { href: "/admin/qr", label: "QR" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {ENLACES.map((enlace) => {
        const activo = pathname === enlace.href;
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "rounded px-3 py-1.5 text-caption font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white",
              activo && "border-b-2 border-accent text-white",
            )}
          >
            {enlace.label}
          </Link>
        );
      })}
    </nav>
  );
}
