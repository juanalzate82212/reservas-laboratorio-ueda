"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Field cablea la accesibilidad del control que envuelve: genera el id, lo
 * enlaza con el <label>, y apunta aria-describedby a la ayuda y al error.
 * Los controles (Input, Textarea, Select) leen ese contexto, así que el sitio
 * de uso queda limpio y no se puede olvidar el enlace:
 *
 *   <Field label="Correo institucional" error={errors.correo?.message}>
 *     <Input {...register("correo")} />
 *   </Field>
 */
type FieldContexto = {
  id: string;
  describedBy?: string;
  invalido: boolean;
};

const FieldCtx = createContext<FieldContexto | null>(null);

/** Props que un control debe esparcir para quedar correctamente etiquetado. */
export function useFieldControl() {
  const ctx = useContext(FieldCtx);
  if (!ctx) return {};
  return {
    id: ctx.id,
    "aria-describedby": ctx.describedBy,
    "aria-invalid": ctx.invalido || undefined,
  };
}

export interface FieldProps {
  label: string;
  children: ReactNode;
  /** Texto de ayuda permanente bajo el control. */
  ayuda?: string;
  /** Mensaje de error. Su presencia marca el control como inválido. */
  error?: string;
  /** Marca el campo como opcional (preferimos eso a marcar los obligatorios). */
  opcional?: boolean;
  className?: string;
}

export function Field({
  label,
  children,
  ayuda,
  error,
  opcional = false,
  className,
}: FieldProps) {
  const uid = useId();
  const id = `${uid}-control`;
  const ayudaId = `${uid}-ayuda`;
  const errorId = `${uid}-error`;

  const describedBy =
    [ayuda ? ayudaId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <FieldCtx.Provider value={{ id, describedBy, invalido: Boolean(error) }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-body font-medium text-texto">
          {label}
          {opcional && (
            <span className="ml-1 font-normal text-texto-secundario">
              (opcional)
            </span>
          )}
        </label>

        {children}

        {ayuda && (
          <p id={ayudaId} className="text-caption text-texto-secundario">
            {ayuda}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="text-caption text-error">
            {error}
          </p>
        )}
      </div>
    </FieldCtx.Provider>
  );
}
