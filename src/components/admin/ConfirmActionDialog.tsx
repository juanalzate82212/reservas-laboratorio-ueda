"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export type AdminReservationAction = "CONFIRM" | "REJECT" | "CANCEL";

const COPY: Record<
  AdminReservationAction,
  { titulo: string; nota: string; etiquetaBoton: string; variante: "primary" | "danger" }
> = {
  CONFIRM: {
    titulo: "¿Confirmar esta solicitud?",
    nota: "Quedará reservada y ocupará ese horario en el calendario público.",
    etiquetaBoton: "Confirmar solicitud",
    variante: "primary",
  },
  REJECT: {
    titulo: "¿Rechazar esta solicitud?",
    nota: "El solicitante no podrá usar este horario. Esta acción no se puede deshacer.",
    etiquetaBoton: "Rechazar solicitud",
    variante: "danger",
  },
  CANCEL: {
    titulo: "¿Cancelar esta reserva?",
    nota: "El horario volverá a estar disponible. Esta acción no se puede deshacer.",
    etiquetaBoton: "Cancelar reserva",
    variante: "danger",
  },
};

export interface ConfirmActionDialogProps {
  action: AdminReservationAction | null;
  /** "Sala Principal · lunes 3 de agosto, 08:00–10:00 · Ana María Restrepo" */
  resumen: string;
  cargando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export function ConfirmActionDialog({
  action,
  resumen,
  cargando,
  onCancelar,
  onConfirmar,
}: ConfirmActionDialogProps) {
  const copy = action ? COPY[action] : null;

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) onCancelar();
      }}
      title={copy?.titulo ?? ""}
      description={resumen}
    >
      {copy && (
        <div className="flex flex-col gap-4">
          <p className="text-caption text-texto-secundario">{copy.nota}</p>
          <div className="flex justify-end gap-3">
            <Button type="button" variante="ghost" onClick={onCancelar} disabled={cargando}>
              Volver
            </Button>
            <Button
              type="button"
              variante={copy.variante}
              cargando={cargando}
              onClick={onConfirmar}
            >
              {copy.etiquetaBoton}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
