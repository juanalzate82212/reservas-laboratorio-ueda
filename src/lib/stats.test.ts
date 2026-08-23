import { describe, expect, it } from "vitest";

import {
  agruparPorMes,
  calcularEstadisticas,
  etiquetaDeMes,
  horasHabilesEntre,
  mesDeBogota,
  rangoDelMes,
  ultimosMeses,
  type FilaEstadistica,
} from "@/lib/stats";

/*
 * Lo que se fija aquí es la aritmética que NO se ve mirando la pantalla: la
 * hora del día en Bogotá (el servidor corre en UTC, y un error desplaza el
 * gráfico entero 5 h — la trampa nº 3 de CLAUDE.md), las horas hábiles de un
 * mes con festivos, y el comportamiento con datos que no encajan en la lista.
 */

/** Reserva en hora LOCAL de Bogotá, convertida al instante UTC que le toca. */
function reserva(
  fecha: string,
  horaBogota: number,
  duracionHoras = 2,
  extra: Partial<FilaEstadistica> = {},
): FilaEstadistica {
  const [a, m, d] = fecha.split("-").map(Number);
  const startsAt = new Date(Date.UTC(a, m - 1, d, horaBogota + 5));
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + duracionHoras * 60 * 60 * 1000),
    status: "CONFIRMED",
    requesterRole: "DOCENTE",
    activityType: "TALLER",
    academicProgram: "INGENIERIA_SISTEMAS",
    createdAt: new Date(startsAt.getTime() - 48 * 60 * 60 * 1000),
    decidedAt: null,
    ...extra,
  };
}

const AGOSTO = rangoDelMes("2026-08");

describe("hora del día en Bogotá, no en UTC", () => {
  it("una reserva de las 08:00 de Bogotá cuenta en la hora 8", () => {
    // 08:00 en Bogotá son las 13:00 UTC. Leer los getters UTC daría 13.
    const stats = calcularEstadisticas([reserva("2026-08-03", 8)], AGOSTO);
    const ocho = stats.porHora.find((h) => h.hora === 8);
    const trece = stats.porHora.find((h) => h.hora === 13);

    expect(ocho?.total).toBe(1);
    expect(trece?.total).toBe(0);
  });

  it("cubre toda la jornada, con ceros incluidos", () => {
    const stats = calcularEstadisticas([], AGOSTO);
    expect(stats.porHora.map((h) => h.hora)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(stats.porHora.every((h) => h.total === 0)).toBe(true);
  });

  it("solo cuenta las confirmadas: la hora mide uso real, no demanda", () => {
    const stats = calcularEstadisticas(
      [
        reserva("2026-08-03", 8),
        reserva("2026-08-04", 8, 2, { status: "PENDING" }),
        reserva("2026-08-05", 8, 2, { status: "REJECTED" }),
      ],
      AGOSTO,
    );

    expect(stats.porHora.find((h) => h.hora === 8)?.total).toBe(1);
  });
});

describe("día de la semana", () => {
  it("el 3 de agosto de 2026 es lunes en Bogotá", () => {
    const stats = calcularEstadisticas([reserva("2026-08-03", 8)], AGOSTO);
    expect(stats.porDiaSemana.find((d) => d.dia === 1)?.total).toBe(1);
  });

  it("una reserva de primera hora no se cae al día anterior", () => {
    // 08:00 del lunes en Bogotá son las 13:00 UTC del lunes: no hay riesgo de
    // cruce, pero es justo el caso que un cálculo en UTC estropearía primero.
    const stats = calcularEstadisticas([reserva("2026-08-04", 8)], AGOSTO);
    expect(stats.porDiaSemana.find((d) => d.dia === 2)?.total).toBe(1);
    expect(stats.porDiaSemana.find((d) => d.dia === 1)?.total).toBe(0);
  });
});

describe("horasHabilesEntre", () => {
  it("un lunes normal abre 8 horas (4 + 4, sin el receso)", () => {
    const { desde } = rangoDelMes("2026-08");
    const lunes = new Date(Date.UTC(2026, 7, 3, 5));
    const martes = new Date(Date.UTC(2026, 7, 4, 5));
    expect(desde.getTime()).toBeLessThan(lunes.getTime());
    expect(horasHabilesEntre(lunes, martes)).toBe(8);
  });

  it("un sábado no suma nada", () => {
    const sabado = new Date(Date.UTC(2026, 7, 1, 5));
    const domingo = new Date(Date.UTC(2026, 7, 2, 5));
    expect(horasHabilesEntre(sabado, domingo)).toBe(0);
  });

  it("un festivo no suma, aunque caiga entre semana", () => {
    // 17 de agosto de 2026: Asunción, trasladada al lunes por la Ley Emiliani.
    const lunesFestivo = new Date(Date.UTC(2026, 7, 17, 5));
    const martes = new Date(Date.UTC(2026, 7, 18, 5));
    expect(horasHabilesEntre(lunesFestivo, martes)).toBe(0);
  });

  it("agosto de 2026 tiene 19 días hábiles: 152 horas", () => {
    /*
     * 21 días de lunes a viernes menos DOS festivos, y son de tipos
     * distintos a propósito: el 7 (Batalla de Boyacá) es de fecha fija, y el
     * 17 es la Asunción del sábado 15 corrida al lunes por la Ley Emiliani.
     * La primera versión de este test decía 160 porque olvidé el del 7 — el
     * cálculo estaba bien y la cuenta a mano mal, que es justo el motivo de
     * no reimplementar el calendario de festivos aquí.
     */
    expect(horasHabilesEntre(AGOSTO.desde, AGOSTO.hasta)).toBe(152);
  });

  it("el 7 de agosto de 2026 es festivo de fecha fija, y tampoco suma", () => {
    const viernesFestivo = new Date(Date.UTC(2026, 7, 7, 5));
    const sabado = new Date(Date.UTC(2026, 7, 8, 5));
    expect(horasHabilesEntre(viernesFestivo, sabado)).toBe(0);
  });
});

describe("ocupación", () => {
  it("divide horas confirmadas entre horas hábiles", () => {
    const stats = calcularEstadisticas([reserva("2026-08-03", 8, 4)], AGOSTO);
    expect(stats.ocupacion.horasReservadas).toBe(4);
    expect(stats.ocupacion.horasHabiles).toBe(152);
    expect(stats.ocupacion.indice).toBeCloseTo(4 / 152);
  });

  it("no divide por cero cuando el periodo no tiene días hábiles", () => {
    const sabado = new Date(Date.UTC(2026, 7, 1, 5));
    const domingo = new Date(Date.UTC(2026, 7, 2, 5));
    const stats = calcularEstadisticas([], { desde: sabado, hasta: domingo });
    expect(stats.ocupacion.horasHabiles).toBe(0);
    expect(stats.ocupacion.indice).toBe(0);
  });

  it("las no confirmadas no ocupan", () => {
    const stats = calcularEstadisticas(
      [reserva("2026-08-03", 8, 4, { status: "PENDING" })],
      AGOSTO,
    );
    expect(stats.ocupacion.horasReservadas).toBe(0);
  });
});

describe("totales y servicio", () => {
  it("cuenta cada estado por separado", () => {
    const stats = calcularEstadisticas(
      [
        reserva("2026-08-03", 8, 2, { status: "CONFIRMED" }),
        reserva("2026-08-04", 8, 2, { status: "CONFIRMED" }),
        reserva("2026-08-05", 8, 2, { status: "REJECTED" }),
        reserva("2026-08-06", 8, 2, { status: "CANCELLED" }),
        reserva("2026-08-07", 8, 2, { status: "EXPIRED" }),
        reserva("2026-08-10", 8, 2, { status: "PENDING" }),
      ],
      AGOSTO,
    );

    expect(stats.totales).toEqual({
      solicitadas: 6,
      confirmadas: 2,
      rechazadas: 1,
      canceladas: 1,
      vencidas: 1,
    });
  });

  it("sinRevisar son las vencidas con decidedAt nulo, no todas las vencidas", () => {
    const stats = calcularEstadisticas(
      [
        reserva("2026-08-03", 8, 2, { status: "EXPIRED", decidedAt: null }),
        reserva("2026-08-04", 8, 2, {
          status: "EXPIRED",
          decidedAt: new Date(Date.UTC(2026, 7, 4, 20)),
        }),
      ],
      AGOSTO,
    );

    expect(stats.totales.vencidas).toBe(2);
    expect(stats.servicio.sinRevisar).toBe(1);
  });

  it("el tiempo de respuesta es null si nadie decidió nada", () => {
    const stats = calcularEstadisticas([reserva("2026-08-03", 8)], AGOSTO);
    expect(stats.servicio.tiempoRespuestaHoras).toBeNull();
  });

  it("promedia las horas entre solicitar y decidir", () => {
    const inicio = new Date(Date.UTC(2026, 7, 10, 13));
    const filas: FilaEstadistica[] = [
      { ...reserva("2026-08-10", 8), createdAt: inicio, decidedAt: new Date(inicio.getTime() + 2 * 3600_000) },
      { ...reserva("2026-08-11", 8), createdAt: inicio, decidedAt: new Date(inicio.getTime() + 4 * 3600_000) },
    ];
    expect(calcularEstadisticas(filas, AGOSTO).servicio.tiempoRespuestaHoras).toBe(3);
  });

  it("nunca da un tiempo de respuesta negativo", () => {
    /*
     * Con los datos de la semilla, decidedAt y createdAt caen en el mismo
     * instante y la resta salía en -6,25e-7 h: la pantalla mostraba "-0 min".
     * Decidir antes de solicitar no significa nada, así que el suelo es cero.
     */
    const t = new Date(Date.UTC(2026, 7, 10, 13));
    const filas: FilaEstadistica[] = [
      {
        ...reserva("2026-08-10", 8),
        createdAt: t,
        decidedAt: new Date(t.getTime() - 5),
      },
    ];
    expect(calcularEstadisticas(filas, AGOSTO).servicio.tiempoRespuestaHoras).toBe(0);
  });
});

describe("rankings", () => {
  it("ordenan de mayor a menor", () => {
    const stats = calcularEstadisticas(
      [
        reserva("2026-08-03", 8, 2, { activityType: "TALLER" }),
        reserva("2026-08-04", 8, 2, { activityType: "TALLER" }),
        reserva("2026-08-05", 8, 2, { activityType: "EVALUACION" }),
      ],
      AGOSTO,
    );

    expect(stats.porActividad[0]).toEqual({ valor: "TALLER", etiqueta: "Taller", total: 2 });
    expect(stats.porActividad[1]?.total).toBe(1);
  });

  it("un cargo fuera de la lista sobrevive con su texto crudo", () => {
    // requesterRole es String, no un enum: hay filas antiguas con texto libre.
    const stats = calcularEstadisticas(
      [reserva("2026-08-03", 8, 2, { requesterRole: "Analista de Datos" })],
      AGOSTO,
    );

    expect(stats.porCargo[0]).toEqual({
      valor: "Analista de Datos",
      etiqueta: "Analista de Datos",
      total: 1,
    });
  });

  it("los rankings cuentan TODAS las solicitudes, no solo las confirmadas", () => {
    const stats = calcularEstadisticas(
      [
        reserva("2026-08-03", 8, 2, { status: "REJECTED" }),
        reserva("2026-08-04", 8, 2, { status: "PENDING" }),
      ],
      AGOSTO,
    );

    expect(stats.porActividad[0]?.total).toBe(2);
  });
});

describe("un periodo vacío no rompe nada", () => {
  it("devuelve ceros y listas utilizables", () => {
    const stats = calcularEstadisticas([], AGOSTO);
    expect(stats.totales.solicitadas).toBe(0);
    expect(stats.porCargo).toEqual([]);
    expect(stats.porDiaSemana).toHaveLength(5);
    expect(stats.porHora).toHaveLength(9);
  });
});

describe("meses", () => {
  it("mesDeBogota usa el día de Bogotá, no el UTC", () => {
    // 1 de septiembre a las 02:00 UTC son todavía las 21:00 del 31 de agosto
    // en Bogotá: el mes correcto es agosto.
    expect(mesDeBogota(new Date("2026-09-01T02:00:00.000Z"))).toBe("2026-08");
  });

  it("rangoDelMes abarca el mes local completo", () => {
    const { desde, hasta } = rangoDelMes("2026-08");
    expect(desde.toISOString()).toBe("2026-08-01T05:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-09-01T05:00:00.000Z");
  });

  it("ultimosMeses devuelve la serie en orden y cruza el año", () => {
    expect(ultimosMeses(new Date("2026-02-15T17:00:00.000Z"), 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("agruparPorMes rellena con cero los meses sin reservas", () => {
    const serie = agruparPorMes(
      [{ startsAt: new Date("2026-08-03T13:00:00.000Z") }],
      ["2026-07", "2026-08"],
    );
    expect(serie.map((p) => p.total)).toEqual([0, 1]);
  });

  it("etiquetaDeMes escribe el mes en español", () => {
    expect(etiquetaDeMes("2026-08")).toContain("agosto");
    expect(etiquetaDeMes("2026-08")).toContain("2026");
  });
});
