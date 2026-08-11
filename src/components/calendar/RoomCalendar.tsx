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
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  Clock,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  // Envoltorio del calendario: se usa para corregir la accesibilidad de la
  // barra de navegación sobre el DOM ya montado (ver el efecto más abajo).
  const contenedorRef = useRef<HTMLDivElement>(null);
  // FullCalendar puede disparar datesSet más de una vez para el mismo rango
  // (recalculo de vista, cambio de ancho, etc.), lanzando pedidos de
  // disponibilidad solapados. Sin esto, un pedido viejo que resuelve DESPUÉS
  // de uno nuevo podía dejar "cargando" pegado en true para siempre aunque
  // los datos ya hubieran llegado — bug real reportado por el usuario. Solo
  // el pedido más reciente puede tocar el estado; uno viejo se aborta.
  const solicitudActualRef = useRef<AbortController | null>(null);
  // Causa real del bug (confirmada con Playwright, no solo por lectura de
  // código): cada `setState` de este componente (tras un fetch) hace que
  // <FullCalendar> reciba props nuevas; su wrapper de React llama
  // `resetOptions()` con un objeto de opciones recién creado en CADA
  // render, lo que hace que la memoización interna de FullCalendar para el
  // generador de rango de fechas falle siempre y reconstruya el
  // `dateProfile` — disparando `datesSet` de nuevo para el MISMO rango
  // visible. Sin este guard, eso relanza `cargarDisponibilidad`, que vuelve
  // a hacer `setState`, en un ciclo que nunca se detiene solo y deja
  // "cargando" parpadeando para siempre. Se ignora un `datesSet` cuyo rango
  // es idéntico al último que se PIDIÓ (se marca al empezar, no al
  // terminar, para bloquear también un redisparo espurio mientras la
  // petición sigue en vuelo). Si la petición para ese rango termina
  // abortada o falla, `cargarDisponibilidad` deshace la marca — si se
  // dejara marcada para siempre pase lo que pase, un primer intento
  // abortado (p. ej. por el doble montaje de efectos que React hace en
  // desarrollo) dejaría el rango bloqueado sin datos reales para siempre —
  // bug real reportado por el usuario tras el primer intento de este fix:
  // la carga inicial se quedaba sin franjas hasta cambiar de semana y
  // volver.
  const ultimoRangoRef = useRef<{ from: number; to: number } | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [reservas, setReservas] = useState<ReservationLike[]>([]);
  const [bloqueos, setBloqueos] = useState<TimeBlockLike[]>([]);
  const [festivos, setFestivos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Calculado una sola vez, antes del primer render: ver el comentario del
  // useEffect de más abajo sobre por qué esto no puede decidirse después.
  // `window` sin guard es seguro SOLO porque este componente se monta
  // exclusivamente a través de RoomAvailability.tsx, con next/dynamic
  // ssr:false — nunca se renderiza en el servidor. No importar
  // RoomCalendar directamente en un Server Component.
  const [vistaInicial] = useState<"timeGridWeek" | "timeGridDay">(() =>
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
      ? "timeGridDay"
      : "timeGridWeek",
  );
  // Espera entre el clic en una franja libre y que /reservar esté lista (ver
  // handleDateClick). `isPending` de useTransition dura exactamente eso: hasta
  // que la ruta destino terminó de resolverse, no solo hasta que se llamó a
  // push(). Un booleano propio con setState no sabría cuándo apagarse.
  //
  // Que esto re-renderice <FullCalendar> es esperado y ya está cubierto: cada
  // render hace que su wrapper llame a resetOptions() y eso puede redisparar
  // `datesSet` para el mismo rango visible, que es justo lo que ignora el
  // guard de `ultimoRangoRef`.
  const [navegando, iniciarNavegacion] = useTransition();

  const cargarDisponibilidad = useCallback(
    async (from: Date, to: Date, rango: { from: number; to: number }) => {
      solicitudActualRef.current?.abort();
      const controller = new AbortController();
      solicitudActualRef.current = controller;
      // Se marca de inmediato (no solo al terminar con éxito) para que un
      // redisparo espurio de `datesSet` para este MISMO rango, mientras esta
      // petición sigue en vuelo, no dispare un segundo fetch redundante —
      // eso pasaba con `setCargando(true)` de la línea siguiente: al ser un
      // cambio real de valor (false→true), provoca un re-render, que a su
      // vez puede volver a disparar `datesSet` antes de que este fetch
      // termine. Si esta petición concreta termina abortada o falla, se
      // "desmarca" en el catch (solo si nadie más la reemplazó ya) para
      // permitir un reintento — ver el comentario de `ultimoRangoRef`.
      ultimoRangoRef.current = rango;

      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          roomId: room.id,
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const res = await fetch(`/api/availability?${params.toString()}`, {
          signal: controller.signal,
        });
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
      } catch (err) {
        // Esta petición no llegó a buen puerto (abortada o con error real):
        // si nadie más ya reemplazó la marca de "último rango" con la suya
        // propia, se deshace para que un futuro datesSet — real o espurio —
        // para este mismo rango pueda reintentar en vez de quedar bloqueado
        // para siempre por un intento que nunca trajo datos.
        if (ultimoRangoRef.current === rango) ultimoRangoRef.current = null;
        // AbortError = una petición más nueva ya está en curso: esta ya no
        // importa, y no debe pisar el estado (error o "cargando") de la que
        // sí sigue viva.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          "No se pudo cargar la disponibilidad. Intenta de nuevo en un momento.",
        );
      } finally {
        // Solo la petición todavía vigente puede apagar el spinner — una
        // vieja que resuelve tarde (o que se abortó) no puede hacerlo,
        // aunque su `finally` se ejecute igual.
        if (solicitudActualRef.current === controller) setCargando(false);
      }
    },
    [room.id],
  );

  useEffect(() => {
    return () => solicitudActualRef.current?.abort();
  }, []);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const from = fullCalendarDateToInstant(arg.start);
      const to = fullCalendarDateToInstant(arg.end);
      const rango = { from: from.getTime(), to: to.getTime() };

      if (
        ultimoRangoRef.current &&
        ultimoRangoRef.current.from === rango.from &&
        ultimoRangoRef.current.to === rango.to
      ) {
        return; // Mismo rango que el último ya cargado con éxito: datesSet redundante, no dispara otro fetch.
      }

      void cargarDisponibilidad(from, to, rango);
    },
    [cargarDisponibilidad],
  );

  // Clic en una zona sin evento (libre, o con aviso — que va de fondo): si la
  // franja de 30 min que empieza ahí es reservable, abre el wizard con la
  // sala y la hora ya elegidas.
  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (navegando) return; // ya hay una navegación en curso: no encolar otra

      const inicio = fullCalendarDateToInstant(arg.date);
      const fin = addMinutes(inicio, 30);

      if (!fitsInSingleRange(inicio, fin)) return; // receso, fuera de jornada, festivo…

      const estado = getSlotState({ startsAt: inicio, endsAt: fin }, reservas, bloqueos);
      if (!estado.reservable) return;

      // Un router.push() suelto no da ninguna señal: hasta que el servidor
      // devuelve /reservar la pantalla se queda igual y el clic parece no
      // haber hecho nada. Suele contestar rápido, pero con la red del campus
      // o el arranque en frío de una función serverless no siempre.
      iniciarNavegacion(() => {
        router.push(`/reservar?startsAt=${encodeURIComponent(inicio.toISOString())}`);
      });
    },
    [reservas, bloqueos, router, navegando, iniciarNavegacion],
  );

  // Clic en un evento en primer plano (reservado, en revisión o bloqueado):
  // no es seleccionable, pero se explica por qué en vez de no hacer nada.
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const tipo = arg.event.extendedProps.tipo as EventoTipo;
    const mensaje = MENSAJE_NO_RESERVABLE[tipo];
    if (mensaje) toast.info(mensaje);
  }, []);

  // Solo reacciona a cambios de ancho DESPUÉS de montado (girar la pantalla,
  // achicar la ventana). La vista inicial se decide aparte, antes del primer
  // render: si aquí también se decidiera la inicial con un changeView() en
  // useEffect, ese cambio de vista dispara datesSet igual que si el usuario
  // navegara, y RoomCalendar pedía la disponibilidad DOS veces en cada carga
  // en móvil — una para la semana por defecto que nunca se llega a mostrar,
  // y otra para el día correcto.
  /*
   * FullCalendar dibuja las flechas de navegación como <span role="img"> sin
   * nombre accesible dentro del botón. axe-core lo marca como incumplimiento
   * serio (role-img-alt), y con razón: un role="img" anónimo se anuncia como
   * una imagen que nadie describió. El nombre útil ya lo lleva el botón, así
   * que el icono es decorativo y debe quedar fuera del árbol accesible.
   *
   * De paso, ese nombre pasa de `title` a `aria-label`: `title` es solo el
   * último recurso del cálculo de nombre accesible, muchos lectores no lo
   * anuncian, y en pantalla táctil no se ve nunca.
   *
   * No hay opción de FullCalendar para esto —el role va escrito en su propio
   * código— así que se corrige sobre el DOM ya montado. El observer hace falta
   * porque la barra se vuelve a dibujar al cambiar de vista (semana ↔ día al
   * girar el móvil); no entra en bucle porque solo escribe si falta.
   */
  useEffect(() => {
    const raiz = contenedorRef.current;
    if (!raiz) return;

    const corregirBarra = () => {
      raiz.querySelectorAll<HTMLElement>(".fc-toolbar button[title]").forEach((boton) => {
        const icono = boton.querySelector<HTMLElement>(".fc-icon");
        if (icono && icono.getAttribute("aria-hidden") !== "true") {
          icono.setAttribute("aria-hidden", "true");
        }
        if (!boton.getAttribute("aria-label")) {
          boton.setAttribute("aria-label", boton.title);
        }
      });
    };

    corregirBarra();
    const observer = new MutationObserver(corregirBarra);
    observer.observe(raiz, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const aplicarVista = () => {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      const vistaDeseada = mq.matches ? "timeGridDay" : "timeGridWeek";
      if (api.view.type !== vistaDeseada) api.changeView(vistaDeseada);
    };
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

      <div ref={contenedorRef} className="relative overflow-hidden rounded border border-borde">
        {(cargando || navegando) && (
          // El anillo girando es el mismo gesto de carga que Button.tsx (§5.1
          // del documento de marca) — no un spinner distinto inventado aquí.
          // La disponibilidad tarda un momento en llegar (consulta reservas +
          // bloqueos), y el grid vacío de FullCalendar por sí solo no deja
          // claro que todavía está cargando en vez de "sin nada agendado".
          // El mismo overlay cubre la espera al abrir el wizard: son dos
          // esperas distintas, pero se ven en el mismo sitio y solo puede
          // haber una a la vez, así que comparten el gesto y cambia el texto.
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-fondo/70"
          >
            <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-primary" />
            <span className="text-caption font-medium text-texto-secundario">
              {navegando ? "Abriendo el formulario…" : "Cargando disponibilidad…"}
            </span>
          </div>
        )}

        <div className={cn("transition-opacity", (cargando || navegando) && "opacity-60")}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={vistaInicial}
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
