"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface EmailLog {
  id: string;
  reservationId: string | null;
  to: string;
  subject: string;
  body: string;
  status: "SENT" | "FAILED" | "LOGGED";
  error: string | null;
  sentAt: string;
}

const TONO_ESTADO: Record<EmailLog["status"], BadgeProps["tono"]> = {
  SENT: "exito",
  FAILED: "error",
  LOGGED: "neutral",
};

const ETIQUETA_ESTADO: Record<EmailLog["status"], string> = {
  SENT: "Enviado",
  FAILED: "Falló",
  LOGGED: "Registrado (sin SMTP)",
};

export interface EmailLogRowProps {
  log: EmailLog;
  onReintentar: (id: string) => void;
  reintentando: boolean;
}

/*
 * La vista previa del HTML va en un <iframe sandbox="" srcDoc=...>, no en
 * dangerouslySetInnerHTML: el body de un correo se generó a partir de datos
 * que escribió alguien externo por el formulario público (nombre, "otro"
 * tipo de actividad...). Aunque las plantillas ya escapan esos valores
 * (lib/mail/templates.ts), el iframe sandboxed es una segunda capa —
 * sandbox="" sin ningún token deshabilita scripts, forms y same-origin, así
 * que aunque algo se escapara mal no podría ejecutar nada en la sesión del
 * admin que lo está mirando.
 */
export function EmailLogRow({ log, onReintentar, reintentando }: EmailLogRowProps) {
  const [abierto, setAbierto] = useState(false);
  const puedeReintentar = log.status !== "SENT";

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex flex-col gap-1">
            <span className="text-body font-medium text-texto">{log.subject}</span>
            <span className="text-caption text-texto-secundario">
              Para: {log.to} · {formatDateTime(new Date(log.sentAt))}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tono={TONO_ESTADO[log.status]}>{ETIQUETA_ESTADO[log.status]}</Badge>
            <ChevronDown
              aria-hidden
              className={cn("h-4 w-4 text-texto-secundario transition-transform", abierto && "rotate-180")}
            />
          </div>
        </button>

        {abierto && (
          <div className="flex flex-col gap-3 border-t border-borde pt-3">
            {log.error && (
              <p className="text-caption text-error">Error: {log.error}</p>
            )}
            <iframe
              title={`Vista previa: ${log.subject}`}
              sandbox=""
              srcDoc={log.body}
              className="h-64 w-full rounded border border-borde bg-white"
            />
            {puedeReintentar && (
              <Button
                type="button"
                variante="secondary"
                tamano="sm"
                cargando={reintentando}
                onClick={() => onReintentar(log.id)}
                className="self-start"
              >
                Reintentar envío
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
