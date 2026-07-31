/*
 * Verificador de los casos límite de fecha y hora (aceptación de la Fase 1).
 *
 * Correrlo con DOS zonas distintas y comparar:
 *   npm run check:datetime                 (tu zona local, UTC-5)
 *   TZ=UTC npm run check:datetime          (como corre Vercel)
 *
 * Si algún resultado cambia entre ambas ejecuciones, hay una conversión que
 * depende de la zona del sistema: exactamente el fallo que funciona en local y
 * rompe en producción con 5 horas de desfase.
 */
import {
  fitsInSingleRange,
  formatRange,
  fromBogota,
  generateSlots,
  getBookingWindow,
  getOpeningRangesFor,
  isAlignedToSlot,
  isHoliday,
  isWithinBookingWindow,
  toBogotaDayKey,
} from "../src/lib/datetime";
import { overlaps } from "../src/lib/availability";

let fallos = 0;
let total = 0;

function comprobar(descripcion: string, real: unknown, esperado: unknown) {
  total += 1;
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  const ok = a === b;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? "  ok  " : " FALLA"}  ${descripcion.padEnd(58)} ${ok ? a : `${a}  ≠ esperado ${b}`}`,
  );
}

function titulo(t: string) {
  console.log(`\n── ${t} ${"─".repeat(Math.max(0, 62 - t.length))}`);
}

// Días de referencia (2026): lunes hábil, sábado, y dos festivos trasladados.
const LUNES = "2026-08-03";
const SABADO = "2026-08-08";
const FESTIVO_REYES = "2026-01-12"; // 6 ene (martes) → lunes
const FESTIVO_CHIQUINQUIRA = "2026-07-13"; // 9 jul (jueves) → lunes, Ley 2578 de 2026
const MARTES_TRAS_FESTIVO = "2026-01-13";

console.log(`Zona horaria del proceso: ${process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone}`);

titulo("Conversión Bogotá → UTC (Colombia es UTC-5 todo el año)");
comprobar("08:00 en Bogotá", fromBogota(LUNES, "08:00").toISOString(), "2026-08-03T13:00:00.000Z");
comprobar("12:00 en Bogotá", fromBogota(LUNES, "12:00").toISOString(), "2026-08-03T17:00:00.000Z");
comprobar("13:00 en Bogotá", fromBogota(LUNES, "13:00").toISOString(), "2026-08-03T18:00:00.000Z");
comprobar("17:00 en Bogotá", fromBogota(LUNES, "17:00").toISOString(), "2026-08-03T22:00:00.000Z");
comprobar("ida y vuelta conserva el día", toBogotaDayKey(fromBogota(LUNES, "08:00")), LUNES);
comprobar(
  "23:30 de Bogotá sigue siendo el mismo día local",
  toBogotaDayKey(fromBogota(LUNES, "23:30")),
  LUNES,
);

titulo("Jornadas de un día hábil");
comprobar("dos jornadas el lunes", getOpeningRangesFor(fromBogota(LUNES, "08:00")).length, 2);
const slotsLunes = generateSlots(fromBogota(LUNES, "08:00"));
comprobar("16 franjas de 30 min (8 mañana + 8 tarde)", slotsLunes.length, 16);
comprobar("primera empieza 08:00", slotsLunes[0]?.startsAt.toISOString(), "2026-08-03T13:00:00.000Z");
comprobar("última termina 17:00", slotsLunes.at(-1)?.endsAt.toISOString(), "2026-08-03T22:00:00.000Z");
comprobar(
  "ninguna franja dentro del receso 12:00–13:00",
  slotsLunes.filter((s) =>
    overlaps(s, {
      startsAt: fromBogota(LUNES, "12:00"),
      endsAt: fromBogota(LUNES, "13:00"),
    }),
  ).length,
  0,
);

titulo("El receso 12:00–13:00 parte el día en dos");
comprobar("08:00–10:00 cabe", fitsInSingleRange(fromBogota(LUNES, "08:00"), fromBogota(LUNES, "10:00")), true);
comprobar("08:00–12:00 cabe (jornada completa)", fitsInSingleRange(fromBogota(LUNES, "08:00"), fromBogota(LUNES, "12:00")), true);
comprobar("13:00–17:00 cabe (jornada completa)", fitsInSingleRange(fromBogota(LUNES, "13:00"), fromBogota(LUNES, "17:00")), true);
comprobar("11:00–14:00 NO cabe (cruza el receso)", fitsInSingleRange(fromBogota(LUNES, "11:00"), fromBogota(LUNES, "14:00")), false);
comprobar("12:00–13:00 NO cabe (es el receso)", fitsInSingleRange(fromBogota(LUNES, "12:00"), fromBogota(LUNES, "13:00")), false);
comprobar("16:00–18:00 NO cabe (pasa el cierre)", fitsInSingleRange(fromBogota(LUNES, "16:00"), fromBogota(LUNES, "18:00")), false);
comprobar("07:30–09:00 NO cabe (antes de abrir)", fitsInSingleRange(fromBogota(LUNES, "07:30"), fromBogota(LUNES, "09:00")), false);
comprobar("fin anterior al inicio NO cabe", fitsInSingleRange(fromBogota(LUNES, "10:00"), fromBogota(LUNES, "09:00")), false);
comprobar(
  "16:00 del lunes a 09:00 del martes NO cabe",
  fitsInSingleRange(fromBogota(LUNES, "16:00"), fromBogota("2026-08-04", "09:00")),
  false,
);

titulo("Fines de semana y festivos cierran el día solos");
comprobar("sábado sin jornadas", getOpeningRangesFor(fromBogota(SABADO, "08:00")).length, 0);
comprobar("sábado sin franjas", generateSlots(fromBogota(SABADO, "08:00")).length, 0);
comprobar("sábado 08:00–10:00 NO cabe", fitsInSingleRange(fromBogota(SABADO, "08:00"), fromBogota(SABADO, "10:00")), false);
comprobar("Reyes trasladado es festivo", isHoliday(fromBogota(FESTIVO_REYES, "10:00")), true);
comprobar("Reyes trasladado sin franjas", generateSlots(fromBogota(FESTIVO_REYES, "08:00")).length, 0);
comprobar("Chiquinquirá (Ley 2578) es festivo", isHoliday(fromBogota(FESTIVO_CHIQUINQUIRA, "10:00")), true);
comprobar("Chiquinquirá sin franjas", generateSlots(fromBogota(FESTIVO_CHIQUINQUIRA, "08:00")).length, 0);
comprobar("el 6 de enero (fecha original) NO es festivo", isHoliday(fromBogota("2026-01-06", "10:00")), false);
comprobar("el martes siguiente sí abre", generateSlots(fromBogota(MARTES_TRAS_FESTIVO, "08:00")).length, 16);
comprobar(
  "festivo a las 23:00 locales sigue siendo festivo",
  isHoliday(fromBogota(FESTIVO_REYES, "23:00")),
  true,
);

titulo("Alineación a la granularidad de 30 min");
comprobar("08:00 alineado", isAlignedToSlot(fromBogota(LUNES, "08:00")), true);
comprobar("08:30 alineado", isAlignedToSlot(fromBogota(LUNES, "08:30")), true);
comprobar("08:15 NO alineado", isAlignedToSlot(fromBogota(LUNES, "08:15")), false);

titulo("Solapamiento (bordes)");
const a = { startsAt: fromBogota(LUNES, "09:00"), endsAt: fromBogota(LUNES, "10:00") };
const b = { startsAt: fromBogota(LUNES, "10:00"), endsAt: fromBogota(LUNES, "11:00") };
const c = { startsAt: fromBogota(LUNES, "09:30"), endsAt: fromBogota(LUNES, "10:30") };
comprobar("09:00–10:00 y 10:00–11:00 NO solapan", overlaps(a, b), false);
comprobar("09:00–10:00 y 09:30–10:30 sí solapan", overlaps(a, c), true);
comprobar("solapamiento es simétrico", overlaps(c, a), overlaps(a, c));

titulo("Anticipación mínima y ventana máxima");
// Instante fijo para que el resultado no dependa de cuándo se ejecute.
const ahora = new Date("2026-08-03T13:00:00.000Z"); // lunes 08:00 en Bogotá
const ventana = getBookingWindow(ahora);
comprobar("mínimo = ahora + 60 min", ventana.earliest.toISOString(), "2026-08-03T14:00:00.000Z");
comprobar("máximo = ahora + 60 días", ventana.latest.toISOString(), "2026-10-02T13:00:00.000Z");
comprobar("dentro de 30 min: fuera de ventana", isWithinBookingWindow(new Date("2026-08-03T13:30:00.000Z"), ahora), false);
comprobar("dentro de 60 min: justo en el límite", isWithinBookingWindow(new Date("2026-08-03T14:00:00.000Z"), ahora), true);
comprobar("a 61 días: fuera de ventana", isWithinBookingWindow(new Date("2026-10-03T13:00:00.000Z"), ahora), false);

titulo("Formato visible al usuario");
comprobar(
  "rango en español",
  formatRange(fromBogota(LUNES, "08:00"), fromBogota(LUNES, "10:00")),
  "lunes 3 de agosto, 08:00–10:00",
);

console.log(
  `\n${fallos === 0 ? "TODO CORRECTO" : "HAY FALLOS"} — ${total - fallos}/${total} comprobaciones pasan.\n`,
);

process.exit(fallos === 0 ? 0 : 1);
