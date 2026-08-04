"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { formatRange } from "@/lib/datetime";
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_TONE } from "@/lib/reservationStatus";
import { cn } from "@/lib/utils";

import type { AdminReservationAction } from "./ConfirmActionDialog";
import { ReservationActions } from "./ReservationActions";
import { ReservationDetail } from "./ReservationDetail";
import type { AdminReservation } from "./types";

export interface ReservationTableProps {
  reservations: AdminReservation[];
  onAction: (id: string, action: AdminReservationAction) => void;
}

/** Vista de escritorio: tabla con detalle expandible por fila. */
export function ReservationTable({ reservations, onAction }: ReservationTableProps) {
  const [expandidaId, setExpandidaId] = useState<string | null>(null);

  return (
    <table className="hidden w-full border-collapse sm:table">
      <thead>
        <tr className="border-b border-borde text-left">
          <th className="px-3 py-2 text-caption font-medium text-texto-secundario">Sala</th>
          <th className="px-3 py-2 text-caption font-medium text-texto-secundario">Horario</th>
          <th className="px-3 py-2 text-caption font-medium text-texto-secundario">Solicitante</th>
          <th className="px-3 py-2 text-caption font-medium text-texto-secundario">Estado</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {reservations.map((reservation) => {
          const abierta = expandidaId === reservation.id;
          return (
            <tr key={reservation.id} className="border-b border-borde last:border-0">
              <td colSpan={5} className="p-0">
                <button
                  type="button"
                  onClick={() => setExpandidaId(abierta ? null : reservation.id)}
                  aria-expanded={abierta}
                  className="grid w-full grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-3 px-3 py-3 text-left hover:bg-superficie"
                >
                  <span className="text-body text-texto">{reservation.room.name}</span>
                  <span className="text-body text-texto">
                    {formatRange(new Date(reservation.startsAt), new Date(reservation.endsAt))}
                  </span>
                  <span className="text-body text-texto">{reservation.requesterName}</span>
                  <Badge tono={RESERVATION_STATUS_TONE[reservation.status]}>
                    {RESERVATION_STATUS_LABEL[reservation.status]}
                  </Badge>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "h-4 w-4 text-texto-secundario transition-transform",
                      abierta && "rotate-180",
                    )}
                  />
                </button>

                {abierta && (
                  <div className="flex flex-col gap-4 border-t border-borde bg-superficie px-3 py-4">
                    <ReservationDetail reservation={reservation} />
                    <ReservationActions
                      reservation={reservation}
                      onAction={(action) => onAction(reservation.id, action)}
                      tamano="sm"
                    />
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
