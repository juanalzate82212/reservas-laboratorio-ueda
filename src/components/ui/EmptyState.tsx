import type { ReactNode } from "react";

import { ArcoDecorativo } from "@/components/brand/ArcoDecorativo";
import { cn } from "@/lib/utils";

/*
 * Estado vacío = invitación a actuar, no adorno (§9 del documento de marca).
 * El texto explica qué falta y la acción dice exactamente qué hace.
 */
export interface EmptyStateProps {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  className?: string;
}

export function EmptyState({
  titulo,
  descripcion,
  accion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded border border-borde bg-superficie px-6 py-12 text-center",
        className,
      )}
    >
      <ArcoDecorativo className="absolute -right-6 -top-6 h-24 w-24 opacity-30" />

      <div className="relative flex flex-col items-center gap-2">
        <h3 className="font-display text-h3 font-medium text-texto">{titulo}</h3>
        {descripcion && (
          <p className="max-w-prose text-body text-texto-secundario">
            {descripcion}
          </p>
        )}
        {accion && <div className="mt-4">{accion}</div>}
      </div>
    </div>
  );
}
