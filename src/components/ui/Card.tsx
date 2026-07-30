import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `sutil` usa el fondo #F5F5F5 para zonas alternas. */
  fondo?: "blanco" | "sutil";
}

export function Card({
  className,
  fondo = "blanco",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded border border-borde shadow-card",
        fondo === "sutil" ? "bg-superficie" : "bg-fondo",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  titulo,
  descripcion,
  accion,
  className,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-borde px-5 py-4",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-h3 font-medium text-texto">{titulo}</h3>
        {descripcion && (
          <p className="text-caption text-texto-secundario">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}
