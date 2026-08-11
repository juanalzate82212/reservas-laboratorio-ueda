import { describe, expect, it } from "vitest";

import {
  findConflicts,
  getSlotState,
  ocupaFranja,
  overlaps,
  type ReservationLike,
  type TimeBlockLike,
} from "@/lib/availability";

/*
 * Primer test del repositorio, y a la vez la prueba de que el arnés funciona:
 * si el alias `@/*` de vitest.config.ts no resolviera, este fichero ni
 * importaría.
 *
 * No es un test de relleno. `lib/availability.ts` dice en su cabecera que sus
 * tipos son estructurales "para poder probarlo con objetos literales", así que
 * era el sitio obvio para empezar. Lo que se fija aquí son las reglas que
 * CLAUDE.md declara explícitamente, que son justo las que un refactor
 * distraído rompería sin que el typecheck se entere.
 */

/** Hora local de Bogotá, escrita como el instante UTC que le corresponde. */
function hora(h: number, m = 0): Date {
  return new Date(Date.UTC(2026, 7, 3, h + 5, m));
}

const franja = (desde: number, hasta: number) => ({
  startsAt: hora(desde),
  endsAt: hora(hasta),
});

const reserva = (
  desde: number,
  hasta: number,
  status: ReservationLike["status"],
): ReservationLike => ({ ...franja(desde, hasta), status });

const bloque = (
  desde: number,
  hasta: number,
  kind: TimeBlockLike["kind"],
  reason = "mantenimiento",
): TimeBlockLike => ({ ...franja(desde, hasta), kind, reason });

describe("overlaps", () => {
  it("dos franjas consecutivas NO solapan", () => {
    // El error clásico de bordes: con `<=` esto daría true y 10:00 quedaría
    // inservible para todo el mundo.
    expect(overlaps(franja(9, 10), franja(10, 11))).toBe(false);
  });

  it("solapan si una empieza dentro de la otra", () => {
    expect(overlaps(franja(9, 11), franja(10, 12))).toBe(true);
  });

  it("solapan si una contiene a la otra", () => {
    expect(overlaps(franja(9, 12), franja(10, 11))).toBe(true);
  });

  it("es simétrico", () => {
    expect(overlaps(franja(10, 12), franja(9, 11))).toBe(true);
  });
});

describe("ocupaFranja", () => {
  // PENDING ocupa igual que CONFIRMED: es el bloqueo blando que evita que dos
  // personas soliciten la misma hora mientras el administrador decide.
  it.each([
    ["PENDING", true],
    ["CONFIRMED", true],
    ["REJECTED", false],
    ["CANCELLED", false],
    ["EXPIRED", false],
  ] as const)("%s ocupa: %s", (status, esperado) => {
    expect(ocupaFranja({ status })).toBe(esperado);
  });
});

describe("findConflicts", () => {
  it("un AVISO no es conflicto: la franja sigue siendo reservable", () => {
    const conflictos = findConflicts(franja(9, 10), {
      blocks: [bloque(9, 10, "WARNING", "sin préstamo de equipos")],
    });

    expect(conflictos.blocks).toHaveLength(0);
  });

  it("un BLOQUEADO que solapa sí es conflicto", () => {
    const conflictos = findConflicts(franja(9, 10), {
      blocks: [bloque(8, 12, "BLOCKED")],
    });

    expect(conflictos.blocks).toHaveLength(1);
  });

  it("ignora las reservas que no ocupan, aunque solapen", () => {
    const conflictos = findConflicts(franja(9, 10), {
      reservations: [
        reserva(9, 10, "CANCELLED"),
        reserva(9, 10, "EXPIRED"),
        reserva(9, 10, "PENDING"),
      ],
    });

    expect(conflictos.reservations).toHaveLength(1);
    expect(conflictos.reservations[0]?.status).toBe("PENDING");
  });

  it("sin reservas ni bloqueos no hay nada que impida reservar", () => {
    expect(findConflicts(franja(9, 10), {})).toEqual({
      reservations: [],
      blocks: [],
    });
  });
});

describe("getSlotState", () => {
  it("libre cuando no hay nada", () => {
    expect(getSlotState(franja(9, 10))).toEqual({
      estado: "LIBRE",
      reservable: true,
    });
  });

  it("lo que impide reservar gana sobre lo que solo avisa", () => {
    const estado = getSlotState(
      franja(9, 10),
      [reserva(9, 10, "CONFIRMED")],
      [bloque(9, 10, "WARNING")],
    );

    expect(estado.estado).toBe("RESERVADO");
  });

  it("un bloqueo gana incluso sobre una reserva confirmada", () => {
    const estado = getSlotState(
      franja(9, 10),
      [reserva(9, 10, "CONFIRMED")],
      [bloque(9, 10, "BLOCKED", "mantenimiento eléctrico")],
    );

    expect(estado).toEqual({
      estado: "BLOQUEADO",
      motivo: "mantenimiento eléctrico",
      reservable: false,
    });
  });

  it("AVISO es seleccionable y arrastra su motivo", () => {
    const estado = getSlotState(
      franja(9, 10),
      [],
      [bloque(9, 10, "WARNING", "sin préstamo de equipos")],
    );

    expect(estado).toEqual({
      estado: "AVISO",
      motivo: "sin préstamo de equipos",
      reservable: true,
    });
  });

  it("una pendiente deja la franja en revisión, no reservable", () => {
    const estado = getSlotState(franja(9, 10), [reserva(9, 10, "PENDING")]);

    expect(estado).toEqual({ estado: "EN_REVISION", reservable: false });
  });

  it("una reserva adyacente no afecta a la franja siguiente", () => {
    const estado = getSlotState(franja(10, 11), [reserva(9, 10, "CONFIRMED")]);

    expect(estado.estado).toBe("LIBRE");
  });
});
