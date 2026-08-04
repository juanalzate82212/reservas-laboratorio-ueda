/*
 * Opciones de programa académico y tipo de actividad del formulario de
 * reserva. Fuente única para el <select> del wizard, el esquema de Zod
 * (lib/validation/reservation.ts) y el paso de revisión — así el valor
 * guardado en BD, la etiqueta en pantalla y la validación nunca se
 * desincronizan. Los `value` deben coincidir exactamente con los enums
 * `AcademicProgram` y `ActivityType` de prisma/schema.prisma.
 */

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

export const ACTIVITY_TYPE_OTRO: ActivityTypeValue = "OTRO";

export function labelForAcademicProgram(value: string): string {
  return ACADEMIC_PROGRAMS.find((p) => p.value === value)?.label ?? value;
}

export function labelForActivityType(value: string): string {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.label ?? value;
}
