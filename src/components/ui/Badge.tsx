import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Los tonos siguen el código de colores del calendario (§8 del plan).
 * Cada estado lleva refuerzo no cromático además del color —borde punteado,
 * icono, texto— porque el color por sí solo excluye a quien no lo distingue.
 */
const tonos = {
  neutral: "bg-superficie text-texto-secundario border-borde",
  info: "bg-primary text-white border-primary",
  revision: "bg-azul-50 text-azul-900 border-azul-500 border-dashed",
  advertencia: "bg-accent text-texto border-accent",
  bloqueado: "bg-superficie text-texto-secundario border-gris",
  exito: "bg-exito text-white border-exito",
  error: "bg-error text-white border-error",
} as const;

export interface BadgeProps {
  children: ReactNode;
  tono?: keyof typeof tonos;
  /** Icono a la izquierda: refuerzo no cromático del estado. */
  icono?: ReactNode;
  className?: string;
}

export function Badge({
  children,
  tono = "neutral",
  icono,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-caption font-medium",
        tonos[tono],
        className,
      )}
    >
      {icono}
      {children}
    </span>
  );
}
