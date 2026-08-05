"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatRange } from "@/lib/datetime";
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_TONE } from "@/lib/reservationStatus";
import { cn } from "@/lib/utils";

import type { AdminReservationAction } from "./ConfirmActionDialog";
import { ReservationActions } from "./ReservationActions";
import { ReservationDetail } from "./ReservationDetail";
import type { AdminReservation } from "./types";

export interface ReservationCardProps {
  reservation: AdminReservation;
  onAction: (id: string, action: AdminReservationAction) => void;
}

/** Vista móvil: una tarjeta por solicitud, expandible. */
export function ReservationCard({ reservation, onAction }: ReservationCardProps) {
  const [abierta, setAbierta] = useState(false);

  return (
    <Card className="sm:hidden">
      <CardBody className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex flex-col gap-1">
            <span className="font-display text-body-l font-semibold text-texto">
              {reservation.room.name}
            </span>
            <span className="text-caption text-texto-secundario">
              {formatRange(new Date(reservation.startsAt), new Date(reservation.endsAt))}
            </span>
            <span className="text-body text-texto">{reservation.requesterName}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tono={RESERVATION_STATUS_TONE[reservation.status]}>
              {RESERVATION_STATUS_LABEL[reservation.status]}
            </Badge>
            <ChevronDown
              aria-hidden
              className={cn("h-4 w-4 text-texto-secundario transition-transform", abierta && "rotate-180")}
            />
          </div>
        </button>

        {abierta && (
          <div className="flex flex-col gap-4 border-t border-borde pt-3">
            <ReservationDetail reservation={reservation} />
            <ReservationActions
              reservation={reservation}
              onAction={(action) => onAction(reservation.id, action)}
              tamano="sm"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
