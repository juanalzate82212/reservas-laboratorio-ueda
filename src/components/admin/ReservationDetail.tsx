import {
  labelForAcademicProgram,
  labelForActivityType,
} from "@/config/reservationOptions";
import { formatDateTime } from "@/lib/datetime";

import type { AdminReservation } from "./types";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-texto-secundario">{etiqueta}</dt>
      <dd className="text-body text-texto">{valor}</dd>
    </div>
  );
}

/** Todos los datos del solicitante — la parte expandible de la fila/tarjeta. */
export function ReservationDetail({ reservation }: { reservation: AdminReservation }) {
  const actividad =
    reservation.activityType === "OTRO" && reservation.activityTypeOther
      ? reservation.activityTypeOther
      : labelForActivityType(reservation.activityType);

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <Dato etiqueta="Cargo" valor={reservation.requesterRole} />
        <Dato etiqueta="Documento" valor={reservation.requesterDocId} />
        <Dato etiqueta="Correo" valor={reservation.requesterEmail} />
        <Dato
          etiqueta="Programa académico"
          valor={labelForAcademicProgram(reservation.academicProgram)}
        />
        <Dato etiqueta="Tipo de actividad" valor={actividad} />
        <Dato etiqueta="Asistentes estimados" valor={String(reservation.attendees)} />
        <Dato etiqueta="Solicitada el" valor={formatDateTime(new Date(reservation.createdAt))} />
      </dl>

      {reservation.adminNote && (
        <div className="rounded border border-borde bg-superficie px-4 py-3">
          <p className="text-caption font-medium text-texto-secundario">
            Nota del administrador
          </p>
          <p className="text-body text-texto">{reservation.adminNote}</p>
        </div>
      )}
    </div>
  );
}
