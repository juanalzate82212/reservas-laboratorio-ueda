import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Variantes según §7 del documento de marca.
 * Ojo con `accent`: sobre naranja el texto va oscuro (#2E2E2E), nunca blanco —
 * el naranja no da contraste suficiente con blanco para texto pequeño.
 * El naranja señala UNA sola cosa por pantalla: no repartir botones `accent`.
 */
const variantes = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border border-primary bg-transparent text-primary hover:bg-primary-soft active:bg-azul-200",
  accent: "bg-accent text-texto hover:bg-accent-hover active:bg-accent-hover",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  danger: "bg-error text-white hover:brightness-95 active:brightness-90",
} as const;

/* h-11 = 44px: objetivo táctil mínimo. La landing se abre desde un QR. */
const tamanos = {
  sm: "h-9 gap-1.5 px-3 text-caption",
  md: "h-11 gap-2 px-4 text-body",
  lg: "h-12 gap-2 px-6 text-body-l",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof variantes;
  tamano?: keyof typeof tamanos;
  cargando?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variante = "primary",
      tamano = "md",
      cargando = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        aria-busy={cargando || undefined}
        className={cn(
          "inline-flex items-center justify-center rounded font-medium transition-colors",
          "disabled:pointer-events-none disabled:opacity-50",
          variantes[variante],
          tamanos[tamano],
          className,
        )}
        {...props}
      >
        {cargando && (
          // El anillo girando es el gesto de marca (§5.1 del documento).
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    );
  },
);
