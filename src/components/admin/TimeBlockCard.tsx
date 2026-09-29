"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDateTime, formatRange, toBogotaDayKey } from "@/lib/datetime";

export interface TimeBlock {
  id: string;
  roomId: string | null;
  startsAt: string;
  endsAt: string;
  kind: "BLOCKED" | "WARNING";
  reason: string;
  room: { id: string; name: string } | null;
}

const TONO_TIPO = { BLOCKED: "bloqueado", WARNING: "advertencia" } as const;
const ETIQUETA_TIPO = { BLOCKED: "Bloqueada", WARNING: "Aviso" } as const;

/*
 * A diferencia de una reserva (siempre dentro de un solo día, por regla de
 * negocio), una franja de admin puede abarcar varios días — formatRange()
 * asume un solo día y mostraría una fecha de inicio con una hora de fin sin
 * contexto, así que aquí se cae a un formato largo con fecha en ambos
 * extremos cuando el rango cruza medianoche.
 */
function formatBlockRange(start: Date, end: Date): string {
  const mismoDia = toBogotaDayKey(start) === toBogotaDayKey(end);
  return mismoDia
    ? formatRange(start, end)
    : `${formatDateTime(start)} – ${formatDateTime(end)}`;
}

export interface TimeBlockCardProps {
  timeBlock: TimeBlock;
  onEliminar: (id: string) => void;
  /** Si quien mira puede eliminar ESTA franja. Ver DELETE /api/admin/time-blocks/[id]. */
  puedeEliminar?: boolean;
}

export function TimeBlockCard({
  timeBlock,
  onEliminar,
  puedeEliminar = true,
}: TimeBlockCardProps) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-body-l font-semibold text-texto">
              {timeBlock.room?.name ?? "Todos los laboratorios"}
            </span>
            <Badge tono={TONO_TIPO[timeBlock.kind]}>
              {ETIQUETA_TIPO[timeBlock.kind]}
            </Badge>
          </div>
          <span className="text-caption text-texto-secundario">
            {formatBlockRange(
              new Date(timeBlock.startsAt),
              new Date(timeBlock.endsAt),
            )}
          </span>
          <p className="text-body text-texto">{timeBlock.reason}</p>
        </div>

        {/*
          Una franja global la VE el encargado de un laboratorio, porque le
          cierra su propio calendario, pero no la puede eliminar: afecta a
          laboratorios que no administra. En vez del botón se explica quién la
          gestiona, que es más útil que un botón que devuelve 404.
        */}
        {puedeEliminar ? (
          <Button
            type="button"
            variante="danger"
            tamano="sm"
            onClick={() => onEliminar(timeBlock.id)}
            className="self-start"
          >
            Eliminar
          </Button>
        ) : (
          <span className="self-start text-caption text-texto-secundario">
            La gestiona el administrador general
          </span>
        )}
      </CardBody>
    </Card>
  );
}
