import type { ReservationStatus } from "@prisma/client";

import type { BadgeProps } from "@/components/ui/Badge";

/*
 * Compartido entre /reserva/[codigo] (público) y el panel de administrador:
 * un solo lugar para la etiqueta en español y el tono del Badge de cada
 * estado, así las dos pantallas nunca muestran colores o textos distintos
 * para el mismo estado.
 */
export const RESERVATION_STATUS_TONE = {
  PENDING: "revision",
  CONFIRMED: "exito",
  REJECTED: "error",
  CANCELLED: "neutral",
  // Gris propio, distinto del de "Cancelada": las dos son inactivas, pero no
  // significan lo mismo y no deben leerse como el mismo estado.
  EXPIRED: "bloqueado",
} as const satisfies Record<ReservationStatus, BadgeProps["tono"]>;

export const RESERVATION_STATUS_LABEL = {
  PENDING: "En revisión",
  CONFIRMED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
} as const satisfies Record<ReservationStatus, string>;
