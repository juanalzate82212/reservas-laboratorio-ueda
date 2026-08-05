/*
 * Festivos de Colombia. Fechas en hora local de Bogotá, formato YYYY-MM-DD.
 *
 * Base legal: Ley 51 de 1983 ("Ley Emiliani"), que traslada al lunes siguiente
 * todos los festivos salvo los de fecha fija (1 ene, 1 may, 20 jul, 7 ago,
 * 8 dic, 25 dic) y los ligados a la Semana Santa (Jueves y Viernes Santo).
 *
 * El laboratorio no atiende festivos, pero eso NO se modela como TimeBlock:
 * `getOpeningRangesFor()` devuelve [] en estos días, así que la generación de
 * slots, la validación del servidor y el pintado del calendario lo heredan sin
 * lógica extra. Los cierres excepcionales (mantenimiento, jornadas
 * institucionales) sí van como TimeBlock creado por el admin.
 */
export const HOLIDAYS_CO: Record<number, string[]> = {
  // 2026 — 19 festivos. Verificado recalculando la Pascua (5 de abril de 2026)
  // y aplicando los traslados de la Ley Emiliani día por día.
  2026: [
    "2026-01-01", // Año Nuevo
    "2026-01-12", // Reyes Magos (6 ene, martes → lunes)
    "2026-03-23", // San José (19 mar, jueves → lunes)
    "2026-04-02", // Jueves Santo
    "2026-04-03", // Viernes Santo
    "2026-05-01", // Día del Trabajo
    "2026-05-18", // Ascensión (Pascua +43)
    "2026-06-08", // Corpus Christi (Pascua +64)
    "2026-06-15", // Sagrado Corazón (Pascua +71)
    "2026-06-29", // San Pedro y San Pablo (29 jun cae lunes)
    "2026-07-13", // Virgen de Chiquinquirá (9 jul, jueves → lunes) — Ley 2578 de 2026
    "2026-07-20", // Independencia
    "2026-08-07", // Batalla de Boyacá
    "2026-08-17", // Asunción (15 ago, sábado → lunes)
    "2026-10-12", // Día de la Raza (12 oct cae lunes)
    "2026-11-02", // Todos los Santos (1 nov, domingo → lunes)
    "2026-11-16", // Independencia de Cartagena (11 nov, miércoles → lunes)
    "2026-12-08", // Inmaculada Concepción
    "2026-12-25", // Navidad
  ],
  // 2027: [...]  ← añadir antes de que termine 2026
};

/**
 * ¿Tenemos datos para ese año? Si no, cualquier consulta de festivos daría
 * "no es festivo" para TODO el año, y el laboratorio aceptaría reservas un día
 * en que está cerrado. Por eso se avisa en vez de fallar en silencio.
 */
export function hasHolidayDataFor(year: number): boolean {
  return Array.isArray(HOLIDAYS_CO[year]) && HOLIDAYS_CO[year].length > 0;
}

/** Años cubiertos, para mostrarlos en el aviso del panel de administración. */
export function coveredHolidayYears(): number[] {
  return Object.keys(HOLIDAYS_CO)
    .map(Number)
    .sort((a, b) => a - b);
}

// Aviso al arrancar (§5.1 del plan). Un fallo silencioso aquí no se descubre
// hasta que alguien llega a un laboratorio cerrado.
const anioActual = new Date().getFullYear();
if (!hasHolidayDataFor(anioActual)) {
  console.warn(
    `[festivos] No hay festivos cargados para ${anioActual}. ` +
      `Se aceptarán reservas en días festivos hasta que se añadan a src/config/holidays.ts. ` +
      `Años cubiertos: ${coveredHolidayYears().join(", ") || "ninguno"}.`,
  );
}
