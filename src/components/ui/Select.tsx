"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { controlBase } from "./Input";
import { useFieldControl } from "./Field";

/*
 * <select> nativo. En móvil abre el selector del sistema, que es más usable que
 * cualquier lista propia — y la landing se abre desde un QR.
 * Radix Select se reserva para el wizard, donde hacen falta opciones ricas.
 */
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  const field = useFieldControl();

  return (
    <div className="relative">
      <select
        ref={ref}
        {...field}
        className={cn(controlBase, "h-11 appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-secundario"
      />
    </div>
  );
});
