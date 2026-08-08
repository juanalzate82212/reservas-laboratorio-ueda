/*
 * Opciones de programa académico y tipo de actividad del formulario de
 * reserva. Fuente única para el <select> del wizard, el esquema de Zod
 * (lib/validation/reservation.ts) y el paso de revisión — así el valor
 * guardado en BD, la etiqueta en pantalla y la validación nunca se
 * desincronizan. Los `value` deben coincidir exactamente con los enums
 * `AcademicProgram` y `ActivityType` de prisma/schema.prisma.
 */

/*
 * El cargo es la excepción de este archivo: se guarda como `String` en
 * `Reservation.requesterRole`, NO como enum de Prisma como los otros dos.
 *
 * Por qué: el campo nació siendo texto libre y las filas anteriores tienen
 * valores que no traducen a esta lista ("Analista de Datos", y algunos de
 * prueba). Migrar a enum obligaría a inventarles un mapeo o a perderlos, y no
 * compraría nada: la única escritura pasa por Zod, que valida contra esta
 * misma lista, y el canal REST de Supabase está cerrado por RLS.
 *
 * Consecuencia práctica: `labelForRequesterRole` devuelve el valor tal cual si
 * no lo reconoce, y así las reservas antiguas siguen legibles.
 */
export const REQUESTER_ROLES = [
  { value: "DOCENTE", label: "Docente" },
  { value: "ESTUDIANTE", label: "Estudiante" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "COORDINADOR", label: "Coordinador" },
  { value: "INVESTIGADOR", label: "Investigador" },
  { value: "EXTERNO", label: "Externo" },
  // A diferencia de ACTIVITY_TYPES, "Otro" aquí NO pide detalle (decidido).
  { value: "OTRO", label: "Otro" },
] as const;

export const ACADEMIC_PROGRAMS = [
  { value: "INGENIERIA_SISTEMAS", label: "Ingeniería en Sistemas" },
  { value: "INGENIERIA_CIVIL", label: "Ingeniería Civil" },
  { value: "ARQUITECTURA", label: "Arquitectura" },
  {
    value: "TECNOLOGIA_DESARROLLO_SOFTWARE",
    label: "Tecnología en Desarrollo de Software",
  },
  {
    value: "ESPECIALIZACION_BIG_DATA_BI",
    label: "Especialización en Big Data e Inteligencia de Negocios",
  },
  {
    value: "INGENIERIA_SISTEMAS_APARTADO",
    label: "Ingeniería de Sistemas – Apartadó",
  },
] as const;

export const ACTIVITY_TYPES = [
  { value: "CLASE_PRACTICA", label: "Clase práctica" },
  { value: "TALLER", label: "Taller" },
  { value: "EVALUACION", label: "Evaluación" },
  { value: "PROYECTO_AULA", label: "Proyecto de aula" },
  { value: "SEMILLERO_INVESTIGACION", label: "Semillero de investigación" },
  { value: "OTRO", label: "Otro" },
] as const;

export type AcademicProgramValue = (typeof ACADEMIC_PROGRAMS)[number]["value"];
export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number]["value"];
export type RequesterRoleValue = (typeof REQUESTER_ROLES)[number]["value"];

export const ACTIVITY_TYPE_OTRO: ActivityTypeValue = "OTRO";

export function labelForAcademicProgram(value: string): string {
  return ACADEMIC_PROGRAMS.find((p) => p.value === value)?.label ?? value;
}

export function labelForActivityType(value: string): string {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.label ?? value;
}

/** Devuelve el valor crudo si no lo reconoce: las reservas antiguas guardan texto libre. */
export function labelForRequesterRole(value: string): string {
  return REQUESTER_ROLES.find((r) => r.value === value)?.label ?? value;
}
