"use client";

import { addMinutes } from "date-fns";
import { AlertTriangle, Ban, CalendarCheck, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { BOOKING_CONFIG } from "@/config/booking";
import {
  findConflicts,
  getSlotState,
  hasConflicts,
  overlaps,
  type ReservationLike,
  type TimeBlockLike,
} from "@/lib/availability";
import {
  fitsInSingleRange,
  fromBogota,
  generateSlots,
  isWithinBookingWindow,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";

type RespuestaDisponibilidad = {
  reservations: Array<{
    startsAt: string;
    endsAt: string;
    status: "PENDING" | "CONFIRMED";
  }>;
  timeBlocks: Array<{
    startsAt: string;
    endsAt: string;
    kind: "BLOCKED" | "WARNING";
    reason: string;
  }>;
};

export interface StepDateTimeProps {
  roomId: string;
  selectedDate: string; // "2026-08-05"
  startsAt: string; // ISO, o "" si no hay hora elegida
  endsAt: string; // ISO, o "" si no hay duración elegida
  onChange: (args: { startsAt: string; endsAt: string; warning: string | null }) => void;
  errorStartsAt?: string;
}

function formatDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${minutos} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

export function StepDateTime({
  roomId,
  selectedDate,
  startsAt,
  endsAt,
  onChange,
  errorStartsAt,
}: StepDateTimeProps) {
  const [reservas, setReservas] = useState<ReservationLike[]>([]);
  const [bloqueos, setBloqueos] = useState<TimeBlockLike[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !selectedDate) return;
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const from = fromBogota(selectedDate, "00:00");
        const to = addMinutes(from, 24 * 60);
        const params = new URLSearchParams({
          roomId,
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        if (!res.ok) throw new Error("No se pudo cargar la disponibilidad.");
        const data: RespuestaDisponibilidad = await res.json();
        if (cancelado) return;

        setReservas(
          data.reservations.map((r) => ({
            startsAt: new Date(r.startsAt),
            endsAt: new Date(r.endsAt),
            status: r.status,
          })),
        );
        setBloqueos(
          data.timeBlocks.map((b) => ({
            startsAt: new Date(b.startsAt),
            endsAt: new Date(b.endsAt),
            kind: b.kind,
            reason: b.reason,
          })),
        );
      } catch {
        if (!cancelado) {
          setError("No se pudo cargar la disponibilidad. Intenta de nuevo.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [roomId, selectedDate]);

  if (!roomId || !selectedDate) {
    return (
      <p className="text-body text-texto-secundario">
        Elige una sala y un día para ver los horarios disponibles.
      </p>
    );
  }

  if (cargando) {
    return <p className="text-body text-texto-secundario">Cargando horarios…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-caption text-error">
        {error}
      </p>
    );
  }

  const slots = generateSlots(fromBogota(selectedDate, "08:00"));

  if (slots.length === 0) {
    return (
      <EmptyState
        titulo="Ese día no hay atención"
        descripcion="Es fin de semana o festivo. Elige otro día."
      />
    );
  }

  const inicioElegido = startsAt ? new Date(startsAt) : null;
  const finElegido = endsAt ? new Date(endsAt) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-body font-medium text-texto">Elige la hora de inicio</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const estado = getSlotState(slot, reservas, bloqueos);
            const elegido = inicioElegido?.getTime() === slot.startsAt.getTime();
            const etiquetaHora = slot.startsAt.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Bogota",
            });

            return (
              <button
                key={slot.startsAt.toISOString()}
                type="button"
                disabled={!estado.reservable}
                aria-pressed={elegido}
                title={estado.motivo}
                onClick={() =>
                  onChange({
                    startsAt: slot.startsAt.toISOString(),
                    endsAt: "",
                    warning: null,
                  })
                }
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded border px-2 py-1.5 text-caption transition-colors",
                  estado.reservable
                    ? "cursor-pointer border-borde hover:border-primary"
                    : "cursor-not-allowed border-borde bg-superficie text-texto-secundario",
                  estado.estado === "AVISO" && "border-accent bg-accent/10",
                  elegido && "border-primary bg-primary-soft",
                )}
              >
                <span className="font-medium">{etiquetaHora}</span>
                {estado.estado === "RESERVADO" && (
                  <CalendarCheck aria-hidden className="h-3 w-3" />
                )}
                {estado.estado === "EN_REVISION" && <Clock aria-hidden className="h-3 w-3" />}
                {estado.estado === "BLOQUEADO" && <Ban aria-hidden className="h-3 w-3" />}
                {estado.estado === "AVISO" && (
                  <AlertTriangle aria-hidden className="h-3 w-3" />
                )}
              </button>
            );
          })}
        </div>
        {errorStartsAt && (
          <p role="alert" className="text-caption text-error">
            {errorStartsAt}
          </p>
        )}
      </div>

      {inicioElegido && (
        <div className="flex flex-col gap-2">
          <span className="text-body font-medium text-texto">Elige la duración</span>
          <div className="flex flex-wrap gap-2">
            {BOOKING_CONFIG.allowedDurations.map((minutos) => {
              const fin = addMinutes(inicioElegido, minutos);
              const cabe =
                fitsInSingleRange(inicioElegido, fin) &&
                isWithinBookingWindow(inicioElegido);
              const conflictos = findConflicts(
                { startsAt: inicioElegido, endsAt: fin },
                { reservations: reservas, blocks: bloqueos },
              );
              const disponible = cabe && !hasConflicts(conflictos);
              const avisoActivo = bloqueos.find(
                (b) =>
                  b.kind === "WARNING" &&
                  overlaps({ startsAt: inicioElegido, endsAt: fin }, b),
              );
              const elegida = finElegido?.getTime() === fin.getTime();

              return (
                <button
                  key={minutos}
                  type="button"
                  disabled={!disponible}
                  aria-pressed={elegida}
                  onClick={() =>
                    onChange({
                      startsAt: inicioElegido.toISOString(),
                      endsAt: fin.toISOString(),
                      warning: avisoActivo?.reason ?? null,
                    })
                  }
                  className={cn(
                    "rounded-pill border px-3 py-1.5 text-caption font-medium transition-colors",
                    disponible
                      ? "cursor-pointer border-borde hover:border-primary"
                      : "cursor-not-allowed border-borde bg-superficie text-texto-secundario",
                    elegida && "border-primary bg-primary-soft",
                  )}
                >
                  {formatDuracion(minutos)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
