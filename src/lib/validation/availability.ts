import { z } from "zod";

/*
 * GET /api/availability es público y sin autenticación. Sin un tope al rango
 * from–to, cualquiera podría pedir un rango de siglos y forzar a
 * getClosedDaysInRange() a iterar día por día indefinidamente. 92 días (~3
 * meses) cubre de sobra cualquier vista de calendario razonable.
 */
const RANGO_MAXIMO_DIAS = 92;

export const availabilityQuerySchema = z
  .object({
    roomId: z
      .string({ required_error: "Falta indicar la sala (roomId)." })
      .min(1, "Falta indicar la sala (roomId)."),
    from: z
      .string({ required_error: "Falta el parámetro «from»." })
      .datetime({
        message:
          "«from» debe ser una fecha ISO 8601 en UTC, por ejemplo 2026-08-03T00:00:00.000Z.",
      }),
    to: z
      .string({ required_error: "Falta el parámetro «to»." })
      .datetime({
        message:
          "«to» debe ser una fecha ISO 8601 en UTC, por ejemplo 2026-08-10T00:00:00.000Z.",
      }),
  })
  .refine((data) => new Date(data.from) < new Date(data.to), {
    message: "«from» debe ser anterior a «to».",
    path: ["to"],
  })
  .refine(
    (data) => {
      const dias =
        (new Date(data.to).getTime() - new Date(data.from).getTime()) /
        86_400_000;
      return dias <= RANGO_MAXIMO_DIAS;
    },
    {
      message: `El rango entre «from» y «to» no puede superar ${RANGO_MAXIMO_DIAS} días.`,
      path: ["to"],
    },
  );

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
