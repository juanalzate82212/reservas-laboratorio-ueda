"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";

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

/*
 * Vista de escritorio: tabla con detalle expandible por fila.
 *
 * ⚠️ Las celdas son <td> de verdad, una por columna, y NO un solo
 * `<td colSpan={5}>` con un grid dentro. Esto último es lo que había y es lo
 * que descolocaba la tabla: la cabecera se repartía con el algoritmo de tablas
 * (por contenido) y el cuerpo con `grid-cols-[1fr_1fr_1fr_auto_auto]` (por
 * fracciones), así que los datos no caían nunca bajo su cabecera —el horario
 * aparecía debajo de "Solicitante"—. Son dos repartos independientes: no se
 * arregla ajustando anchos, porque coincidirían solo por casualidad y volverían
 * a separarse con el primer nombre largo. Con celdas reales, el navegador
 * dimensiona cabecera y cuerpo a la vez y la alineación deja de ser un ajuste
 * que mantener.
 *
 * Cada reserva ocupa DOS <tr>: la fila en sí y, si está abierta, la del
 * detalle. Ahí sí es correcto un `colSpan`, porque ese contenido sí abarca
 * todas las columnas.
 *
 * El control accesible es el <button> del chevron, con `aria-expanded` y
 * nombre propio. La fila entera sigue siendo clicable por comodidad de ratón,
 * pero eso no sustituye al botón: el teclado y los lectores de pantalla van por
 * él. Por eso el botón corta la propagación — si no, el clic dispararía también
 * el de la fila y la reserva se abriría y cerraría en el mismo gesto.
 */
export function ReservationTable({ reservations, onAction }: ReservationTableProps) {
  const [expandidaId, setExpandidaId] = useState<string | null>(null);

  const alternar = (id: string) => setExpandidaId((actual) => (actual === id ? null : id));

  return (
    <table className="hidden w-full border-collapse sm:table">
      <thead>
        <tr className="border-b border-borde text-left">
          <th scope="col" className="px-3 py-2 text-caption font-medium text-texto-secundario">
            Sala
          </th>
          <th scope="col" className="px-3 py-2 text-caption font-medium text-texto-secundario">
            Horario
          </th>
          <th scope="col" className="px-3 py-2 text-caption font-medium text-texto-secundario">
            Solicitante
          </th>
          <th scope="col" className="px-3 py-2 text-caption font-medium text-texto-secundario">
            Estado
          </th>
          <th scope="col" className="px-3 py-2">
            <span className="sr-only">Ver detalle</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {reservations.map((reservation) => {
          const abierta = expandidaId === reservation.id;
          return (
            <Fragment key={reservation.id}>
              <tr
                onClick={() => alternar(reservation.id)}
                className="cursor-pointer border-b border-borde last:border-0 hover:bg-superficie"
              >
                <td className="px-3 py-3 text-body text-texto">{reservation.room.name}</td>
                <td className="px-3 py-3 text-body text-texto">
                  {formatRange(new Date(reservation.startsAt), new Date(reservation.endsAt))}
                </td>
                <td className="px-3 py-3 text-body text-texto">{reservation.requesterName}</td>
                <td className="px-3 py-3">
                  <Badge tono={RESERVATION_STATUS_TONE[reservation.status]}>
                    {RESERVATION_STATUS_LABEL[reservation.status]}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      alternar(reservation.id);
                    }}
                    aria-expanded={abierta}
                    aria-label={`Ver detalle de la reserva de ${reservation.requesterName}`}
                    className="rounded p-1 align-middle text-texto-secundario hover:text-texto"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn("h-4 w-4 transition-transform", abierta && "rotate-180")}
                    />
                  </button>
                </td>
              </tr>

              {abierta && (
                <tr className="border-b border-borde last:border-0">
                  <td colSpan={5} className="bg-superficie px-3 py-4">
                    <div className="flex flex-col gap-4">
                      <ReservationDetail reservation={reservation} />
                      <ReservationActions
                        reservation={reservation}
                        onAction={(action) => onAction(reservation.id, action)}
                        tamano="sm"
                      />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
