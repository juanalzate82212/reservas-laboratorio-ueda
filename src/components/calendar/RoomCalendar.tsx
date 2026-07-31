"use client";

import type {
  DatesSetArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { addMinutes } from "date-fns";
import { AlertTriangle, Ban, CalendarCheck, Clock, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  getSlotState,
  type ReservationLike,
  type TimeBlockLike,
} from "@/lib/availability";
import { fitsInSingleRange, toBogotaWallClockIso } from "@/lib/datetime";
import { fullCalendarDateToInstant, fullCalendarDayKey } from "@/lib/fullcalendar";
import type { ActiveRoom } from "@/lib/rooms";
import { cn } from "@/lib/utils";

type AvailabilityResponse = {
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
  closedDays: Array<{ date: string; reason: "WEEKEND" | "HOLIDAY" }>;
};

type EventoTipo = "RESERVADO" | "EN_REVISION" | "AVISO" | "BLOQUEADO";

/* La landing se abre desde un QR: en pantallas angostas, un solo día a la vez. */
const MOBILE_BREAKPOINT = 640; // Tailwind `sm`

const MENSAJE_NO_RESERVABLE: Partial<Record<EventoTipo, string>> = {
  RESERVADO: "Ese horario ya está reservado.",
  EN_REVISION: "Ese horario tiene una solicitud en revisión.",
  BLOQUEADO: "Esa franja está bloqueada por el administrador.",
};

function siguienteDia(dayKey: string): string {
  const fecha = new Date(`${dayKey}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

export function RoomCalendar({ room }: { room: ActiveRoom }) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [reservas, setReservas] = useState<ReservationLike[]>([]);
  const [bloqueos, setBloqueos] = useState<TimeBlockLike[]>([]);
  const [festivos, setFestivos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDisponibilidad = useCallback(
    async (from: Date, to: Date) => {
      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          roomId: room.id,
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        if (!res.ok) {
          throw new Error("No se pudo cargar la disponibilidad.");
        }
        const data: AvailabilityResponse = await res.json();

        const reservasCrudas: ReservationLike[] = data.reservations.map((r) => ({
          startsAt: new Date(r.startsAt),
          endsAt: new Date(r.endsAt),
          status: r.status,
        }));
        const bloqueosCrudos: TimeBlockLike[] = data.timeBlocks.map((b) => ({
          startsAt: new Date(b.startsAt),
          endsAt: new Date(b.endsAt),
          kind: b.kind,
          reason: b.reason,
        }));

        const eventosReservas: EventInput[] = data.reservations.map((r) => ({
          start: toBogotaWallClockIso(new Date(r.startsAt)),
          end: toBogotaWallClockIso(new Date(r.endsAt)),
          classNames: [
            r.status === "CONFIRMED" ? "fc-evento-reservado" : "fc-evento-revision",
          ],
          extendedProps: {
            tipo: (r.status === "CONFIRMED"
              ? "RESERVADO"
              : "EN_REVISION") satisfies EventoTipo,
          },
        }));

        // BLOQUEADO se queda en primer plano (no es seleccionable: clicar ahí
        // debe capturar el clic, no dejarlo pasar a la grilla). AVISO, en
        // cambio, SÍ es reservable (§5 del plan), así que va como evento de
        // fondo: no intercepta el clic y la grilla sigue respondiendo con la
        // franja exacta de 30 min que se tocó, igual que en una zona libre.
        const eventosBloqueos: EventInput[] = data.timeBlocks
          .filter((b) => b.kind === "BLOCKED")
          .map((b) => ({
            start: toBogotaWallClockIso(new Date(b.startsAt)),
            end: toBogotaWallClockIso(new Date(b.endsAt)),
            classNames: ["fc-evento-bloqueado"],
            extendedProps: { tipo: "BLOQUEADO" satisfies EventoTipo },
          }));

        const eventosAvisos: EventInput[] = data.timeBlocks
          .filter((b) => b.kind === "WARNING")
          .map((b) => ({
            start: toBogotaWallClockIso(new Date(b.startsAt)),
            end: toBogotaWallClockIso(new Date(b.endsAt)),
            display: "background",
            classNames: ["fc-evento-aviso"],
            extendedProps: {
              tipo: "AVISO" satisfies EventoTipo,
              motivo: b.reason,
            },
          }));

        const diasFestivos = data.closedDays.filter((d) => d.reason === "HOLIDAY");
        const eventosFestivos: EventInput[] = diasFestivos.map((d) => ({
          start: `${d.date}T00:00:00`,
          end: `${siguienteDia(d.date)}T00:00:00`,
          display: "background",
          classNames: ["fc-dia-festivo"],
        }));

        setReservas(reservasCrudas);
        setBloqueos(bloqueosCrudos);
        setEvents([
          ...eventosReservas,
          ...eventosBloqueos,
          ...eventosAvisos,
          ...eventosFestivos,
        ]);
        setFestivos(new Set(diasFestivos.map((d) => d.date)));
      } catch {
        setError(
          "No se pudo cargar la disponibilidad. Intenta de nuevo en un momento.",
        );
      } finally {
        setCargando(false);
      }
    },
    [room.id],
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      void cargarDisponibilidad(
        fullCalendarDateToInstant(arg.start),
        fullCalendarDateToInstant(arg.end),
      );
    },
    [cargarDisponibilidad],
  );

  // Clic en una zona sin evento (libre, o con aviso — que va de fondo): si la
  // franja de 30 min que empieza ahí es reservable, abre el wizard con la
  // sala y la hora ya elegidas.
  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      const inicio = fullCalendarDateToInstant(arg.date);
      const fin = addMinutes(inicio, 30);

      if (!fitsInSingleRange(inicio, fin)) return; // receso, fuera de jornada, festivo…

      const estado = getSlotState({ startsAt: inicio, endsAt: fin }, reservas, bloqueos);
      if (!estado.reservable) return;

      router.push(
        `/reservar?roomId=${encodeURIComponent(room.id)}&startsAt=${encodeURIComponent(inicio.toISOString())}`,
      );
    },
    [reservas, bloqueos, room.id, router],
  );

  // Clic en un evento en primer plano (reservado, en revisión o bloqueado):
  // no es seleccionable, pero se explica por qué en vez de no hacer nada.
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const tipo = arg.event.extendedProps.tipo as EventoTipo;
    const mensaje = MENSAJE_NO_RESERVABLE[tipo];
    if (mensaje) toast.info(mensaje);
  }, []);

  // Vista por defecto según el ancho de pantalla, y al cruzar el punto de corte.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const aplicarVista = () => {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      const vistaDeseada = mq.matches ? "timeGridDay" : "timeGridWeek";
      if (api.view.type !== vistaDeseada) api.changeView(vistaDeseada);
    };
    aplicarVista();
    mq.addEventListener("change", aplicarVista);
    return () => mq.removeEventListener("change", aplicarVista);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-h3 font-medium text-texto">{room.name}</h3>
        <span className="text-caption text-texto-secundario">
          Aforo {room.capacity} · {room.hasComputers ? "con equipos" : "sin equipos"}
        </span>
      </div>

      {error && (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      )}

      <div
        className={cn(
          "overflow-hidden rounded border border-borde transition-opacity",
          cargando && "opacity-60",
        )}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: "prev,next", center: "title", right: "today" }}
          locale={esLocale}
          timeZone="UTC"
          // "now" también en hora de Bogotá disfrazada de UTC: si no, el
          // indicador de hora actual y la vista inicial usarían la hora real
          // del servidor/navegador, desalineada 5h del resto de la grilla.
          now={() => toBogotaWallClockIso(new Date())}
          nowIndicator
          slotMinTime="08:00:00"
          slotMaxTime="17:00:00"
          allDaySlot={false}
          weekends={false}
          editable={false}
          selectable={false}
          height="auto"
          businessHours={[
            { daysOfWeek: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "12:00" },
            { daysOfWeek: [1, 2, 3, 4, 5], startTime: "13:00", endTime: "17:00" },
          ]}
          events={events}
          eventContent={renderEventContent}
          dayHeaderClassNames={(arg: DayHeaderContentArg) =>
            festivos.has(fullCalendarDayKey(arg.date)) ? ["fc-dia-festivo-header"] : []
          }
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
        />
      </div>
    </div>
  );
}

const ICONOS: Record<EventoTipo, LucideIcon> = {
  RESERVADO: CalendarCheck,
  EN_REVISION: Clock,
  AVISO: AlertTriangle,
  BLOQUEADO: Ban,
};

const ETIQUETAS: Partial<Record<EventoTipo, string>> = {
  RESERVADO: "Reservado",
  EN_REVISION: "En revisión",
  BLOQUEADO: "No disponible",
  // AVISO no tiene etiqueta fija: usa el motivo del TimeBlock.
};

function renderEventContent(arg: EventContentArg) {
  // Los eventos festivos (fc-dia-festivo) no llevan extendedProps.tipo: son
  // solo el tinte de fondo, la etiqueta "Festivo" va en el header del día.
  // Sin este guard, ICONOS[undefined] da undefined y <Icono .../> con un tipo
  // de componente undefined hace que React truene al renderizar.
  const tipo = arg.event.extendedProps.tipo as EventoTipo | undefined;
  if (!tipo) return null;

  const motivo = arg.event.extendedProps.motivo as string | undefined;
  const Icono = ICONOS[tipo];
  const texto = ETIQUETAS[tipo] ?? motivo ?? "";

  return (
    <div
      title={motivo}
      className="flex items-center gap-1 overflow-hidden px-1 py-0.5 text-caption"
    >
      <Icono aria-hidden className="h-3 w-3 shrink-0" />
      <span className="truncate">{texto}</span>
    </div>
  );
}
