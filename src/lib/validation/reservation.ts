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

/** Un solo texto para el tope de aforo, lo aplique el cliente o el servidor. */
export function mensajeAforoExcedido(maxAttendees: number): string {
  return `Esta sala admite hasta ${maxAttendees} asistentes.`;
}

const camposReserva = z.object({
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
  // errorMap, y NO required_error/invalid_type_error: el <select> arranca en
  // "" (su <option> de marcador), así que al enviar sin elegir llega un
  // string FUERA de la lista, no un campo ausente. Zod clasifica eso como
  // `invalid_enum_value`, el único de los tres casos que required_error e
  // invalid_type_error no cubren — por ahí se colaba el mensaje por defecto
  // "Invalid enum value. Expected 'INGENIERIA_SISTEMAS' | … received ''".
  // errorMap cubre los tres de una vez, y Zod prohíbe combinarlo con los
  // otros dos, así que va solo.
  academicProgram: z.enum(PROGRAMAS_ACADEMICOS, {
    errorMap: () => ({ message: "Selecciona tu programa académico." }),
  }),
  activityType: z.enum(TIPOS_ACTIVIDAD, {
    errorMap: () => ({ message: "Selecciona el tipo de actividad." }),
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
  //
  // No lleva `.max()` fijo: el tope real es el aforo de la sala, que sale de
  // la BD. Ver buildCreateReservationSchema().
  attendees: z.preprocess(
    (valor) => (valor === "" || valor === null ? undefined : valor),
    z.coerce
      .number({
        invalid_type_error: "Indica el número estimado de asistentes.",
      })
      .int("El número de asistentes debe ser un número entero.")
      .positive("El número de asistentes debe ser mayor que cero."),
  ),
  responsibilityAccepted: z
    .boolean({
      required_error: "Debes aceptar la responsabilidad sobre el uso del espacio.",
    })
    .refine((valor) => valor === true, {
      message: "Debes aceptar la responsabilidad sobre el uso del espacio para continuar.",
    }),
});

/*
 * El tope de asistentes es el aforo de la sala (`Room.capacity`), no una
 * constante: depende de la BD, así que por la regla de arriba no puede vivir
 * dentro del esquema como los demás límites. De ahí la fábrica:
 *
 * - El cliente ya recibe la sala, así que construye el esquema con su aforo
 *   y avisa mientras se llena el formulario, sin esperar al envío.
 * - El servidor usa el esquema sin aforo y comprueba la capacidad en
 *   POST /api/reservations, donde ya consulta la sala — junto al resto de
 *   reglas que necesitan la BD. Esa es la comprobación que manda.
 *
 * La redacción del mensaje sale de mensajeAforoExcedido() en ambos casos.
 */
export function buildCreateReservationSchema(
  opciones: { maxAttendees?: number } = {},
) {
  return camposReserva.superRefine((data, ctx) => {
    if (data.activityType === "OTRO" && !data.activityTypeOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activityTypeOther"],
        message: "Describe brevemente la actividad.",
      });
    }

    if (
      opciones.maxAttendees !== undefined &&
      data.attendees > opciones.maxAttendees
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attendees"],
        message: mensajeAforoExcedido(opciones.maxAttendees),
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
}

/** Sin tope de aforo: lo aplica el Route Handler, que sí conoce la sala. */
export const createReservationSchema = buildCreateReservationSchema();

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
