/*
 * Fuente única de las reglas de negocio (§5 del plan).
 * Ninguna regla de horario, duración o límite se escribe a mano en un
 * componente ni en un handler: todo se lee de aquí.
 */
export const BOOKING_CONFIG = {
  timeZone: "America/Bogota",

  // Horario de atención: DOS jornadas por día, con receso de 12:00 a 13:00.
  // Clave = día de la semana (0 = domingo). Array vacío = cerrado.
  openingHours: {
    0: [], // domingo — cerrado
    1: [
      { start: "08:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ],
    2: [
      { start: "08:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ],
    3: [
      { start: "08:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ],
    4: [
      { start: "08:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ],
    5: [
      { start: "08:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ],
    6: [], // sábado — cerrado
  },

  slotMinutes: 30, // granularidad de la grilla
  allowedDurations: [30, 60, 90, 120, 150, 180, 210, 240], // minutos (30 min a 4 h)
  minAdvanceMinutes: 60, // mínimo 1 h de anticipación
  maxAdvanceDays: 60, // máximo 2 meses
  maxPendingPerEmail: 3,
  emailDomain: "amigo.edu.co",
} as const;

/** Una franja de atención dentro de un día, en hora local de Bogotá. */
export type OpeningRange = { start: string; end: string };

/** Día de la semana con 0 = domingo, tal como los indexa `openingHours`. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
