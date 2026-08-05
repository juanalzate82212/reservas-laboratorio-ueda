import { addDays, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import {
  BOOKING_CONFIG,
  type OpeningRange,
  type WeekdayIndex,
} from "@/config/booking";
import { HOLIDAYS_CO } from "@/config/holidays";

/*
 * Toda fecha se almacena en UTC y se presenta en America/Bogota.
 *
 * La regla que evita el 90% de los errores: NUNCA construir un Date a partir de
 * una cadena sin zona explícita. `new Date("2026-08-03 08:00")` significa cosas
 * distintas en tu portátil (UTC-5) y en Vercel (UTC), y el bug solo aparece
 * después de desplegar. Para pasar de hora de Bogotá a UTC se usa
 * `fromBogota()`; para leer componentes en hora de Bogotá, las funciones de
 * aquí, que no dependen de la zona del sistema.
 *
 * Colombia no aplica horario de verano (siempre UTC-5), así que ninguna
 * conversión es ambigua. Aun así se usa la zona por nombre y no un desfase fijo:
 * si eso cambiara, cambiaría en un solo lugar.
 */
const TZ = BOOKING_CONFIG.timeZone;

const openingHours = BOOKING_CONFIG.openingHours as Record<
  WeekdayIndex,
  readonly OpeningRange[]
>;

/** Clave de día en hora de Bogotá: "2026-08-03". */
export function toBogotaDayKey(instant: Date): string {
  return formatInTimeZone(instant, TZ, "yyyy-MM-dd");
}

/**
 * Hora de pared de Bogotá para ese instante.
 *
 * Devuelve un Date desplazado cuyos getters LOCALES (getHours, getDate…) dan la
 * hora de Bogotá. Sirve para leer o formatear; **no lo guardes ni lo compares
 * con instantes reales**, porque como instante absoluto es incorrecto.
 */
export function toBogota(instant: Date): Date {
  return toZonedTime(instant, TZ);
}

/**
 * Hora de pared de Bogotá → instante UTC.
 * `fromBogota("2026-08-03", "08:00")` → 2026-08-03T13:00:00.000Z
 */
export function fromBogota(dayKey: string, time: string): Date {
  return fromZonedTime(`${dayKey}T${time}:00`, TZ);
}

/** Día de la semana en Bogotá, 0 = domingo (como los indexa openingHours). */
export function getBogotaWeekday(instant: Date): WeekdayIndex {
  // "i" da 1..7 (lunes..domingo); el módulo lo lleva a 0..6 con domingo = 0.
  const iso = Number(formatInTimeZone(instant, TZ, "i"));
  return (iso % 7) as WeekdayIndex;
}

export function isHoliday(instant: Date): boolean {
  const dayKey = toBogotaDayKey(instant);
  const year = Number(dayKey.slice(0, 4));
  return HOLIDAYS_CO[year]?.includes(dayKey) ?? false;
}

export function isWeekend(instant: Date): boolean {
  const dow = getBogotaWeekday(instant);
  return dow === 0 || dow === 6;
}

/**
 * Jornadas de atención del día en que cae ese instante.
 *
 * Devuelve [] para sábados, domingos y festivos. Esta es la única puerta por la
 * que pasan los días cerrados: generación de slots, validación del servidor y
 * pintado del calendario consumen esta función, así que cerrar un día no exige
 * lógica extra en ninguna capa.
 */
export function getOpeningRangesFor(instant: Date): OpeningRange[] {
  if (isHoliday(instant)) return [];
  return [...(openingHours[getBogotaWeekday(instant)] ?? [])];
}

/** ¿Está el día abierto? Azúcar sobre getOpeningRangesFor. */
export function isOpenDay(instant: Date): boolean {
  return getOpeningRangesFor(instant).length > 0;
}

/**
 * ¿La reserva cabe COMPLETA dentro de UNA sola jornada?
 *
 * Rechaza 11:00–14:00 aunque ambos extremos estén en horario de atención: eso
 * cruzaría el receso de 12:00–13:00. Como los límites de cada jornada se
 * calculan sobre el día de `start`, también rechaza cualquier reserva que se
 * extienda al día siguiente.
 */
export function fitsInSingleRange(start: Date, end: Date): boolean {
  if (!(start.getTime() < end.getTime())) return false;

  const dayKey = toBogotaDayKey(start);

  return getOpeningRangesFor(start).some((range) => {
    const rangeStart = fromBogota(dayKey, range.start);
    const rangeEnd = fromBogota(dayKey, range.end);
    return start >= rangeStart && end <= rangeEnd;
  });
}

/** ¿El inicio está alineado a la granularidad de la grilla (30 min)? */
export function isAlignedToSlot(start: Date): boolean {
  const minutosDelDia =
    Number(formatInTimeZone(start, TZ, "H")) * 60 +
    Number(formatInTimeZone(start, TZ, "m"));
  const segundos = Number(formatInTimeZone(start, TZ, "s"));
  return segundos === 0 && minutosDelDia % BOOKING_CONFIG.slotMinutes === 0;
}

export type Slot = { startsAt: Date; endsAt: Date };

/**
 * Franjas de 30 min de un día, en UTC. El receso 12:00–13:00 no aparece
 * porque no pertenece a ninguna jornada, y un día cerrado devuelve [].
 */
export function generateSlots(instant: Date): Slot[] {
  const dayKey = toBogotaDayKey(instant);
  const slots: Slot[] = [];

  for (const range of getOpeningRangesFor(instant)) {
    const rangeEnd = fromBogota(dayKey, range.end);
    let cursor = fromBogota(dayKey, range.start);

    while (cursor < rangeEnd) {
      const next = addMinutes(cursor, BOOKING_CONFIG.slotMinutes);
      if (next > rangeEnd) break;
      slots.push({ startsAt: cursor, endsAt: next });
      cursor = next;
    }
  }

  return slots;
}

/**
 * Ventana en la que se puede reservar, medida desde `now`.
 * Se calcula sobre instantes absolutos, así que da igual la zona del servidor.
 */
export function getBookingWindow(now: Date = new Date()) {
  return {
    earliest: addMinutes(now, BOOKING_CONFIG.minAdvanceMinutes),
    latest: addDays(now, BOOKING_CONFIG.maxAdvanceDays),
  };
}

export function isWithinBookingWindow(
  start: Date,
  now: Date = new Date(),
): boolean {
  const { earliest, latest } = getBookingWindow(now);
  return start >= earliest && start <= latest;
}

/** "lunes 3 de agosto, 08:00–10:00" — para UI y correos. */
export function formatRange(start: Date, end: Date): string {
  const dia = formatInTimeZone(start, TZ, "EEEE d 'de' MMMM", { locale: es });
  const desde = formatInTimeZone(start, TZ, "HH:mm");
  const hasta = formatInTimeZone(end, TZ, "HH:mm");
  return `${dia}, ${desde}–${hasta}`;
}

/** "3 de agosto de 2026, 08:00" — formato largo con año, para correos. */
export function formatDateTime(instant: Date): string {
  return formatInTimeZone(instant, TZ, "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });
}

/**
 * ISO "de pared" en hora de Bogotá, sin sufijo de zona: "2026-08-03T08:00:00".
 * Solo para alimentar a FullCalendar (ver src/lib/fullcalendar.ts), que se
 * configura con timeZone="UTC" para tratar esta cadena como literal en vez de
 * reconvertirla según la zona del navegador de quien mira la pantalla.
 */
export function toBogotaWallClockIso(instant: Date): string {
  return formatInTimeZone(instant, TZ, "yyyy-MM-dd'T'HH:mm:ss");
}

export type ClosedDay = {
  /** Clave de día en hora de Bogotá: "2026-08-08". */
  date: string;
  /** Categoría, no prosa — a diferencia de TimeBlock.reason, que sí es libre. */
  reason: "WEEKEND" | "HOLIDAY";
};

/**
 * Días sin atención (fin de semana u festivo) dentro de [from, to).
 * Usado por GET /api/availability para que el calendario los etiquete.
 */
export function getClosedDaysInRange(from: Date, to: Date): ClosedDay[] {
  const closedDays: ClosedDay[] = [];
  const seen = new Set<string>();
  let cursor = from;

  while (cursor < to) {
    const dayKey = toBogotaDayKey(cursor);
    if (!seen.has(dayKey)) {
      seen.add(dayKey);
      if (!isOpenDay(cursor)) {
        closedDays.push({
          date: dayKey,
          reason: isHoliday(cursor) ? "HOLIDAY" : "WEEKEND",
        });
      }
    }
    // Colombia no tiene horario de verano, así que sumar 24h en UTC siempre
    // avanza exactamente un día calendario en Bogotá.
    cursor = addDays(cursor, 1);
  }

  return closedDays;
}
