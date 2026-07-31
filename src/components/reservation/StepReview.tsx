import { AlertTriangle } from "lucide-react";

import { formatRange } from "@/lib/datetime";
import type { ActiveRoom } from "@/lib/rooms";

export interface StepReviewProps {
  room: ActiveRoom | null;
  startsAt: string;
  endsAt: string;
  requesterName: string;
  requesterRole: string;
  requesterDocId: string;
  requesterEmail: string;
  purpose?: string;
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
  purpose,
  attendees,
  warning,
}: StepReviewProps) {
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
        <Dato etiqueta="Cargo" valor={requesterRole} />
        <Dato etiqueta="Documento" valor={requesterDocId} />
        <Dato etiqueta="Correo" valor={requesterEmail} />
        {attendees && <Dato etiqueta="Asistentes" valor={String(attendees)} />}
        {purpose && <Dato etiqueta="Motivo" valor={purpose} />}
      </dl>

      {warning && (
        <div className="flex items-start gap-2 rounded border border-accent bg-accent/10 px-4 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-hover" />
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
