import { AlertTriangle } from "lucide-react";

import { formatRange } from "@/lib/datetime";
import type { ActiveRoom } from "@/lib/rooms";
import {
  labelForAcademicProgram,
  labelForActivityType,
  labelForRequesterRole,
} from "@/config/reservationOptions";

export interface StepReviewProps {
  room: ActiveRoom | null;
  startsAt: string;
  endsAt: string;
  requesterName: string;
  requesterRole: string;
  requesterDocId: string;
  requesterEmail: string;
  academicProgram?: string;
  activityType?: string;
  activityTypeOther?: string;
  attendees?: number;
  warning: string | null;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-texto-secundario">{etiqueta}</dt>
      <dd className="text-body text-texto">{valor}</dd>
    </div>
  );
}

export function StepReview({
  room,
  startsAt,
  endsAt,
  requesterName,
  requesterRole,
  requesterDocId,
  requesterEmail,
  academicProgram,
  activityType,
  activityTypeOther,
  attendees,
  warning,
}: StepReviewProps) {
  const actividad =
    activityType === "OTRO" && activityTypeOther
      ? activityTypeOther
      : activityType
        ? labelForActivityType(activityType)
        : "—";

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Dato etiqueta="Sala" valor={room?.name ?? "—"} />
        <Dato
          etiqueta="Horario"
          valor={
            startsAt && endsAt
              ? formatRange(new Date(startsAt), new Date(endsAt))
              : "—"
          }
        />
        <Dato etiqueta="Nombre" valor={requesterName} />
        <Dato
          etiqueta="Cargo"
          valor={requesterRole ? labelForRequesterRole(requesterRole) : "—"}
        />
        <Dato etiqueta="Documento" valor={requesterDocId} />
        <Dato etiqueta="Correo" valor={requesterEmail} />
        <Dato
          etiqueta="Programa académico"
          valor={academicProgram ? labelForAcademicProgram(academicProgram) : "—"}
        />
        <Dato etiqueta="Tipo de actividad" valor={actividad} />
        <Dato etiqueta="Asistentes estimados" valor={attendees ? String(attendees) : "—"} />
      </dl>

      {warning && (
        <div className="flex items-start gap-2 rounded border border-accent bg-accent/10 px-4 py-3">
          {/* Naranja de texto, no el de hover: este icono se lee, y el hover
              pasó a ser más claro justamente para que el botón contraste. */}
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-texto" />
          <p className="text-caption text-texto">{warning}</p>
        </div>
      )}

      <p className="text-caption text-texto-secundario">
        Tu solicitud queda sujeta a aprobación del administrador del
        laboratorio. Te recomendamos guardar el código que recibirás para
        consultar el estado más adelante.
      </p>
    </div>
  );
}
