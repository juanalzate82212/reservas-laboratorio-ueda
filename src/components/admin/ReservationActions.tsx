import { Button } from "@/components/ui/Button";

import type { AdminReservationAction } from "./ConfirmActionDialog";
import type { AdminReservation } from "./types";

export interface ReservationActionsProps {
  reservation: AdminReservation;
  onAction: (action: AdminReservationAction) => void;
  tamano?: "sm" | "md";
}

/** Qué botones aplican según el estado — refleja las transiciones del §6 del plan. */
export function ReservationActions({
  reservation,
  onAction,
  tamano = "sm",
}: ReservationActionsProps) {
  if (reservation.status === "PENDING") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          tamano={tamano}
          onClick={() => onAction("CONFIRM")}
        >
          Confirmar
        </Button>
        <Button
          type="button"
          variante="danger"
          tamano={tamano}
          onClick={() => onAction("REJECT")}
        >
          Rechazar
        </Button>
      </div>
    );
  }

  if (reservation.status === "CONFIRMED") {
    return (
      <Button type="button" variante="danger" tamano={tamano} onClick={() => onAction("CANCEL")}>
        Cancelar
      </Button>
    );
  }

  return null;
}
