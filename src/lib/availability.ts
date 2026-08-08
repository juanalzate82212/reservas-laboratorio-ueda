/*
 * Disponibilidad: solapamiento, conflictos y estado visual de una franja.
 *
 * Los tipos son estructurales a propósito (no se importan los de Prisma) para
 * que este módulo sirva igual en el servidor y en el cliente, y para poder
 * probarlo con objetos literales.
 */

export type Interval = { startsAt: Date; endsAt: Date };

/*
 * Espejo del enum ReservationStatus del schema. No se importa de Prisma por lo
 * dicho arriba, pero tampoco puede desincronizarse en silencio: los handlers
 * pasan resultados de Prisma a findConflicts(), así que si el schema gana un
 * estado que falte aquí, esas llamadas dejan de compilar. Fue lo que ocurrió
 * al añadir EXPIRED.
 */
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type ReservationLike = Interval & { status: ReservationStatus };

export type TimeBlockLike = Interval & {
  kind: "BLOCKED" | "WARNING";
  reason: string;
};

/**
 * Dos intervalos se solapan si cada uno empieza antes de que el otro termine.
 *
 * Usar EXACTAMENTE esta condición. Con `<=` en vez de `<`, dos reservas
 * consecutivas (09:00–10:00 y 10:00–11:00) se considerarían en conflicto, que
 * es el error clásico de bordes en este tipo de sistemas.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Estados que OCUPAN la franja. `PENDING` ocupa igual que `CONFIRMED`: es un
 * bloqueo blando que evita que dos personas soliciten la misma hora mientras
 * el administrador decide.
 */
const ESTADOS_QUE_OCUPAN: readonly ReservationStatus[] = ["PENDING", "CONFIRMED"];

export function ocupaFranja(reserva: { status: ReservationStatus }): boolean {
  return ESTADOS_QUE_OCUPAN.includes(reserva.status);
}

export type Conflictos<R extends ReservationLike, B extends TimeBlockLike> = {
  reservations: R[];
  blocks: B[];
};

/**
 * Todo lo que impide reservar `candidate`. Devuelve las colisiones en vez de un
 * booleano para poder decirle al usuario qué choca exactamente.
 *
 * Los TimeBlock de tipo WARNING no son conflicto: la franja sigue siendo
 * reservable, solo lleva un aviso (típicamente "sin préstamo de equipos").
 */
export function findConflicts<
  R extends ReservationLike,
  B extends TimeBlockLike,
>(
  candidate: Interval,
  { reservations = [], blocks = [] }: { reservations?: R[]; blocks?: B[] },
): Conflictos<R, B> {
  return {
    reservations: reservations.filter(
      (r) => ocupaFranja(r) && overlaps(candidate, r),
    ),
    blocks: blocks.filter(
      (b) => b.kind === "BLOCKED" && overlaps(candidate, b),
    ),
  };
}

export function hasConflicts(conflictos: {
  reservations: unknown[];
  blocks: unknown[];
}): boolean {
  return conflictos.reservations.length > 0 || conflictos.blocks.length > 0;
}

/**
 * Estado de una franja para pintarla. El orden importa: lo que impide reservar
 * gana sobre lo que solo avisa.
 */
export type SlotState =
  | "LIBRE"
  | "BLOQUEADO"
  | "RESERVADO"
  | "EN_REVISION"
  | "AVISO";

export type SlotStateResult = {
  estado: SlotState;
  /** Texto del TimeBlock, cuando aplica. Se muestra al usuario. */
  motivo?: string;
  /** ¿Se puede seleccionar? AVISO sí es seleccionable; BLOQUEADO no. */
  reservable: boolean;
};

export function getSlotState(
  slot: Interval,
  reservations: ReservationLike[] = [],
  blocks: TimeBlockLike[] = [],
): SlotStateResult {
  const bloqueo = blocks.find(
    (b) => b.kind === "BLOCKED" && overlaps(slot, b),
  );
  if (bloqueo) {
    return { estado: "BLOQUEADO", motivo: bloqueo.reason, reservable: false };
  }

  const confirmada = reservations.find(
    (r) => r.status === "CONFIRMED" && overlaps(slot, r),
  );
  if (confirmada) return { estado: "RESERVADO", reservable: false };

  const pendiente = reservations.find(
    (r) => r.status === "PENDING" && overlaps(slot, r),
  );
  if (pendiente) return { estado: "EN_REVISION", reservable: false };

  const aviso = blocks.find((b) => b.kind === "WARNING" && overlaps(slot, b));
  if (aviso) {
    return { estado: "AVISO", motivo: aviso.reason, reservable: true };
  }

  return { estado: "LIBRE", reservable: true };
}
