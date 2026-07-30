"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { useFieldControl } from "./Field";

/* Clases compartidas por Input, Textarea y Select para que los tres controles
 * se vean y se enfoquen igual. Borde #E1E1E1, foco azul, error rojo (§7). */
export const controlBase = cn(
  "w-full rounded border bg-fondo px-3 text-body text-texto transition-colors",
  "placeholder:text-texto-secundario",
  "disabled:cursor-not-allowed disabled:bg-superficie disabled:text-texto-secundario",
  "border-borde aria-[invalid=true]:border-error",
);

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  const field = useFieldControl();

  return (
    <input
      ref={ref}
      {...field}
      className={cn(controlBase, "h-11", className)}
      {...props}
    />
  );
});
