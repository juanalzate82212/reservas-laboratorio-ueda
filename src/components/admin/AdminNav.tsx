"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { ADMIN_RESERVATIONS_CHANGED_EVENT } from "./adminEvents";

/* Las cuatro secciones del panel. Todas existen como páginas. */
const ENLACES = [
  { href: "/admin", label: "Solicitudes" },
  { href: "/admin/franjas", label: "Franjas" },
  { href: "/admin/correos", label: "Correos" },
  { href: "/admin/qr", label: "QR" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarConteo() {
      try {
        const res = await fetch("/api/admin/reservations?status=PENDING");
        if (!res.ok || cancelado) return;
        const data: unknown[] = await res.json();
        if (!cancelado) setPendientes(data.length);
      } catch {
        // Silencioso: el contador es un realce, no algo crítico para operar.
      }
    }

    cargarConteo();
    window.addEventListener(ADMIN_RESERVATIONS_CHANGED_EVENT, cargarConteo);
    return () => {
      cancelado = true;
      window.removeEventListener(ADMIN_RESERVATIONS_CHANGED_EVENT, cargarConteo);
    };
  }, []);

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
              /*
               * Blanco pleno, no white/80: atenuado quedaba en 3.72 sobre el
               * azul (#CCE5EB efectivo) y AA pide 4.5. La sección activa ya se
               * distingue por el subrayado naranja y por aria-current, así que
               * la opacidad era una pista redundante que además rompía el
               * contraste de las otras tres.
               */
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-caption font-medium text-white transition-colors hover:bg-white/10",
              activo && "border-b-2 border-accent",
            )}
          >
            {enlace.label}
            {enlace.href === "/admin" && !!pendientes && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-semibold leading-none text-texto">
                {pendientes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
