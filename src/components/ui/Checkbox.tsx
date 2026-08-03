"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/*
 * Checkbox con su propia etiqueta y error: a diferencia de Input/Textarea/
 * Select no usa Field, porque su layout (caja + texto al lado) es distinto
 * del de un control con label encima. El foco visible lo hereda del estilo
 * global :focus-visible de globals.css.
 */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, error, className, id, ...props }, ref) {
    const uid = useId();
    const controlId = id ?? `${uid}-checkbox`;
    const errorId = `${uid}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={controlId}
            type="checkbox"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 rounded border border-borde text-primary accent-primary transition-colors",
              "aria-[invalid=true]:border-error",
              className,
            )}
            {...props}
          />
          <label htmlFor={controlId} className="text-body text-texto">
            {label}
          </label>
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-caption text-error">
            {error}
          </p>
        )}
      </div>
    );
  },
);
