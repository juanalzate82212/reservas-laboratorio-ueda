import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

/*
 * El logo vive en la cabecera o en el pie, nunca flotando en el contenido
 * (§4.3). Dos tratamientos válidos: fondo blanco con logo en positivo, o banda
 * azul con logo en blanco.
 */
export interface HeaderProps {
  variante?: "blanco" | "azul";
  /** Navegación o acciones a la derecha. */
  children?: ReactNode;
  className?: string;
}

export function Header({
  variante = "blanco",
  children,
  className,
}: HeaderProps) {
  const enAzul = variante === "azul";

  return (
    <header
      className={cn(
        "w-full border-b",
        enAzul ? "border-primary-active bg-primary" : "border-borde bg-fondo",
        className,
      )}
    >
      {/* py-3 protege el área de reserva alrededor del logo (§4.2). */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="rounded"
          aria-label="Ir al inicio de Reservas Laboratorio de Estrategia del Dato y Analítica"
        >
          <Logo
            variante={enAzul ? "blanco" : "positivo"}
            className="hidden sm:inline-flex"
          />
          <Logo
            variante={enAzul ? "blanco" : "positivo"}
            compacto
            className="sm:hidden"
          />
        </Link>

        {children && (
          <nav className="flex items-center gap-2">{children}</nav>
        )}
      </div>
    </header>
  );
}
