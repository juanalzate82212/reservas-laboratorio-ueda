/*
 * Adaptador entre los instantes UTC reales de la API y las fechas "de pared"
 * que consume FullCalendar.
 *
 * RoomCalendar configura FullCalendar con timeZone="UTC" y le pasa cadenas
 * ISO sin sufijo de zona que ya representan la hora de Bogotá
 * (toBogotaWallClockIso). Eso evita que el navegador de quien mira la
 * pantalla reconvierta las horas según su propia zona: el calendario muestra
 * siempre hora de Bogotá, sin importar dónde esté.
 *
 * Contrapartida: los Date que construye FullCalendar internamente (datesSet,
 * headers de día) tienen los campos de Bogotá metidos en los getters UTC.
 * Esta función deshace el truco para recuperar el instante real, el único
 * formato que entiende la API. No usar fuera del límite con FullCalendar.
 */
import { fromBogota } from "./datetime";

export function fullCalendarDateToInstant(fcDate: Date): Date {
  const iso = fcDate.toISOString(); // "2026-08-03T08:00:00.000Z" es hora de Bogotá disfrazada de UTC
  return fromBogota(iso.slice(0, 10), iso.slice(11, 16));
}

/** Clave de día ("2026-08-03") de una fecha "de pared" de FullCalendar. */
export function fullCalendarDayKey(fcDate: Date): string {
  return fcDate.toISOString().slice(0, 10);
}
