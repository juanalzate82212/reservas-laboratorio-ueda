import { z } from "zod";

/*
 * A diferencia de una reserva, un TimeBlock lo crea el admin y puede
 * abarcar varios días (ej. "semana de receso") o cruzar el receso de
 * 12:00–13:00 (ej. un cierre de jornada completa) — no reutiliza
 * fitsInSingleRange ni isAlignedToSlot de lib/datetime.ts, que son reglas
 * específicas de la grilla de reserva del público.
 */
export const createTimeBlockSchema = z
  .object({
    roomId: z.string().min(1).nullable(),
    startsAt: z
      .string({ required_error: "Falta la fecha y hora de inicio." })
      .datetime({ message: "La fecha de inicio no tiene un formato válido." }),
    endsAt: z
      .string({ required_error: "Falta la fecha y hora de fin." })
      .datetime({ message: "La fecha de fin no tiene un formato válido." }),
    kind: z.enum(["BLOCKED", "WARNING"], {
      required_error: "Selecciona el tipo de franja.",
      invalid_type_error: "Tipo de franja no reconocido.",
    }),
    reason: z
      .string({ required_error: "Escribe el motivo." })
      .trim()
      .min(3, "El motivo debe tener al menos 3 caracteres.")
      .max(300, "El motivo es demasiado largo."),
  })
  .refine((data) => new Date(data.startsAt) < new Date(data.endsAt), {
    message: "La fecha de fin debe ser posterior a la de inicio.",
    path: ["endsAt"],
  });

export type CreateTimeBlockInput = z.infer<typeof createTimeBlockSchema>;
