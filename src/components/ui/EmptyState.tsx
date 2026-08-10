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
  /*
   * Nivel del encabezado. Por defecto h3, que es lo correcto cuando esto es un
   * bloque DENTRO de una página que ya tiene su h1. Las pantallas de estado
   * (404, error) son la página entera, así que ahí el título sí es el h1: sin
   * esta prop tendrían que duplicar el markup del componente solo por cambiar
   * una etiqueta. El tamaño visual no cambia con el nivel — lo pide la
   * semántica, no el diseño.
   */
  nivelTitulo?: "h1" | "h3";
  className?: string;
}

export function EmptyState({
  titulo,
  descripcion,
  accion,
  nivelTitulo: Titulo = "h3",
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
        <Titulo className="font-display text-h3 font-medium text-texto">{titulo}</Titulo>
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
