"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatRange } from "@/lib/datetime";

export interface TimeBlockConflict {
  id: string;
  code: string;
  requesterName: string;
  startsAt: string;
  endsAt: string;
  room: { name: string };
}

export interface TimeBlockConflictDialogProps {
  conflicts: TimeBlockConflict[] | null;
  onCerrar: () => void;
}

/** §8 del plan: al bloquear sobre reservas existentes, mostrar la lista en vez de un error genérico. */
export function TimeBlockConflictDialog({ conflicts, onCerrar }: TimeBlockConflictDialogProps) {
  const cantidad = conflicts?.length ?? 0;

  return (
    <Dialog
      open={conflicts !== null}
      onOpenChange={(open) => {
        if (!open) onCerrar();
      }}
      title={`Hay ${cantidad} reserva${cantidad === 1 ? "" : "s"} en ese horario`}
      description="Cancélalas primero desde la bandeja de solicitudes, o elige otro rango de fechas."
    >
      {conflicts && (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {conflicts.map((c) => (
              <li
                key={c.id}
                className="rounded border border-borde bg-superficie px-3 py-2 text-caption text-texto"
              >
                <span className="font-medium">{c.code}</span> · {c.room.name} ·{" "}
                {formatRange(new Date(c.startsAt), new Date(c.endsAt))} · {c.requesterName}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button type="button" variante="ghost" onClick={onCerrar}>
              Entendido
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
