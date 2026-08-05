import { z } from "zod";

import { BOOKING_CONFIG } from "@/config/booking";
import {
  ACADEMIC_PROGRAMS,
  ACTIVITY_TYPES,
  type AcademicProgramValue,
  type ActivityTypeValue,
} from "@/config/reservationOptions";
import { fitsInSingleRange, isAlignedToSlot, isWithinBookingWindow } from "@/lib/datetime";

/*
 * Reglas de campo del §5 del plan, compartidas entre cliente (RHF vía
 * @hookform/resolvers) y servidor (POST /api/reservations las revalida
 * siempre — el servidor no confía en el cliente ni cuando el formulario ya
 * validó). Lo que NO cabe aquí porque depende de la base de datos —sala
 * activa, solapamientos, límite de pendientes por correo— vive en el Route
 * Handler.
 *
 * Las reglas 6, 7, 8 y 9 del §5 sí caben aquí: son puramente funciones de
 * startsAt/endsAt, sin necesitar la BD. Reutilizan lib/datetime.ts en vez de
 * reimplementar la aritmética de horarios.
 */

const nombreTieneNombreYApellido = (valor: string) =>
  valor.trim().split(/\s+/).filter(Boolean).length >= 2;

const DURACIONES_PERMITIDAS: readonly number[] = BOOKING_CONFIG.allowedDurations;

// z.enum exige una tupla no vacía de literales — la derivamos de la misma
// lista que alimenta el <select>, así los dos nunca se desincronizan.
const PROGRAMAS_ACADEMICOS = ACADEMIC_PROGRAMS.map((p) => p.value) as [
  AcademicProgramValue,
  ...AcademicProgramValue[],
];
const TIPOS_ACTIVIDAD = ACTIVITY_TYPES.map((t) => t.value) as [
  ActivityTypeValue,
  ...ActivityTypeValue[],
];

export const createReservationSchema = z
  .object({
    roomId: z
      .string({ required_error: "Falta indicar la sala." })
      .min(1, "Falta indicar la sala."),
    startsAt: z
      .string({ required_error: "Falta la hora de inicio." })
      .datetime({ message: "La hora de inicio no tiene un formato válido." }),
    endsAt: z
      .string({ required_error: "Falta la hora de fin." })
      .datetime({ message: "La hora de fin no tiene un formato válido." }),
    requesterName: z
      .string({ required_error: "Escribe tu nombre completo." })
      .trim()
      .min(5, "El nombre debe tener al menos 5 caracteres.")
      .refine(nombreTieneNombreYApellido, "Escribe tu nombre y apellido."),
    requesterRole: z
      .string({ required_error: "Indica tu cargo." })
      .trim()
      .min(2, "Indica tu cargo."),
    requesterDocId: z
      .string({ required_error: "Indica tu número de documento." })
      .regex(
        /^\d{6,12}$/,
        "El documento debe tener entre 6 y 12 dígitos, sin puntos ni espacios.",
      ),
    requesterEmail: z
      .string({ required_error: "Escribe tu correo institucional." })
      .trim()
      .toLowerCase()
      .email("Escribe un correo válido.")
      .refine(
        (correo) => correo.endsWith(`@${BOOKING_CONFIG.emailDomain}`),
        `Usa tu correo institucional (@${BOOKING_CONFIG.emailDomain}) para solicitar una reserva.`,
      ),
    academicProgram: z.enum(PROGRAMAS_ACADEMICOS, {
      required_error: "Selecciona tu programa académico.",
      invalid_type_error: "Selecciona tu programa académico.",
    }),
    activityType: z.enum(TIPOS_ACTIVIDAD, {
      required_error: "Selecciona el tipo de actividad.",
      invalid_type_error: "Selecciona el tipo de actividad.",
    }),
    activityTypeOther: z
      .string()
      .trim()
      .max(200, "La descripción es demasiado larga.")
      .optional()
      .or(z.literal("")),
    // preprocess: un <input type="number"> vacío llega como "", y
    // Number("") es 0 (no NaN) — sin este paso, un campo vacío pasaría la
    // coerción como 0 en vez de fallar la validación de obligatoriedad.
    attendees: z.preprocess(
      (valor) => (valor === "" || valor === null ? undefined : valor),
      z.coerce
        .number({
          invalid_type_error: "Indica el número estimado de asistentes.",
        })
        .int("El número de asistentes debe ser un número entero.")
        .positive("El número de asistentes debe ser mayor que cero.")
        .max(200, "El número de asistentes parece demasiado alto."),
    ),
    responsibilityAccepted: z
      .boolean({
        required_error: "Debes aceptar la responsabilidad sobre el uso del espacio.",
      })
      .refine((valor) => valor === true, {
        message: "Debes aceptar la responsabilidad sobre el uso del espacio para continuar.",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.activityType === "OTRO" && !data.activityTypeOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activityTypeOther"],
        message: "Describe brevemente la actividad.",
      });
    }

    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);

    if (!(start.getTime() < end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "La hora de fin debe ser posterior a la de inicio.",
      });
      return; // el resto de comprobaciones asume start < end
    }

    const duracionMinutos = (end.getTime() - start.getTime()) / 60_000;
    if (!DURACIONES_PERMITIDAS.includes(duracionMinutos)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message:
          "Elige una duración entre 30 minutos y 4 horas, en pasos de 30 minutos.",
      });
    }

    if (!isAlignedToSlot(start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "La hora de inicio debe ajustarse a la grilla de 30 minutos.",
      });
    }

    if (!fitsInSingleRange(start, end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message:
          "Ese horario no está disponible: cae fuera de la jornada, cruza el receso de 12:00 a 13:00, o el día no tiene atención.",
      });
    }

    if (!isWithinBookingWindow(start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: `Elige un horario con al menos ${BOOKING_CONFIG.minAdvanceMinutes} minutos de anticipación y máximo ${BOOKING_CONFIG.maxAdvanceDays} días.`,
      });
    }
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
