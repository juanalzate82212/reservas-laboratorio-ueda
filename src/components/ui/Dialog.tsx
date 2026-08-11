"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

/*
 * Envoltorio de @radix-ui/react-dialog con la marca aplicada. Controlado
 * siempre desde fuera (open/onOpenChange) — no expone Trigger porque cada
 * sitio de uso ya decide cuándo abrir el diálogo desde su propia lógica
 * (por ejemplo, un botón que primero valida algo).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  /*
   * Devuelve el foco a quien abrió el diálogo.
   *
   * Radix trae esa restauración de serie, pero aquí no llegaba a ocurrir: al
   * cerrar —con Escape o con el botón "Volver"— el foco caía en <body>, aunque
   * el botón que lo abrió seguía en el DOM (comprobado marcando ese nodo con
   * Playwright: seguía conectado). Para quien navega con teclado eso significa
   * perder el sitio y tener que tabular otra vez desde el principio de la
   * página, que es el defecto que WCAG 2.4.3 busca evitar.
   *
   * No sirve leer el elemento al abrir: para cuando este componente ejecuta su
   * efecto, los de Radix —que son hijos— ya movieron el foco dentro. Por eso
   * se anota de forma continua el último elemento enfocado que NO está dentro
   * de un diálogo; ese es, por definición, el que lo abrió.
   */
  const disparadorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const anotar = (evento: FocusEvent) => {
      const elemento = evento.target as HTMLElement | null;
      if (!elemento?.closest || elemento.closest('[role="dialog"]')) return;
      disparadorRef.current = elemento;
    };
    document.addEventListener("focusin", anotar);
    return () => document.removeEventListener("focusin", anotar);
  }, []);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-negro/50" />
        <RadixDialog.Content
          onCloseAutoFocus={(evento) => {
            const destino = disparadorRef.current;
            // Si ya no está en el documento, mejor dejar que Radix decida.
            if (!destino?.isConnected) return;
            evento.preventDefault();
            destino.focus();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded border border-borde bg-fondo p-6 shadow-card",
            className,
          )}
        >
          <RadixDialog.Title className="font-display text-h3 font-semibold text-texto">
            {title}
          </RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-2 text-body text-texto-secundario">
              {description}
            </RadixDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
