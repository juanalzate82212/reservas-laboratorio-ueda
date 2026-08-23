/*
 * Agregación de estadísticas del panel. Función PURA de un array de filas:
 * no toca Prisma, no conoce la petición, y por eso se puede probar con
 * literales igual que `lib/availability.ts`.
 *
 * Vive separada del Route Handler a propósito. La aritmética de aquí —sobre
 * todo la hora del día en zona horaria de Bogotá y las horas hábiles de un
 * mes— es justo donde un error no se ve a simple vista: cuadraría en local y
 * saldría desplazado 5 h en producción, que es la trampa número 3 de
 * CLAUDE.md. Un test con literales la fija; mirar la pantalla, no.
 */

import { BOOKING_CONFIG } from "@/config/booking";
import {
  labelForAcademicProgram,
  labelForActivityType,
  labelForRequesterRole,
} from "@/config/reservationOptions";
import { getOpeningRangesFor, toBogota, toBogotaDayKey } from "@/lib/datetime";

/*
 * Lo mínimo que necesita el cálculo, y ni un campo más. El `select` del
 * handler copia exactamente esta forma: así nombre, documento y correo NUNCA
 * salen de la base de datos para dibujar un gráfico.
 */
export interface FilaEstadistica {
  startsAt: Date;
  endsAt: Date;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "EXPIRED";
  requesterRole: string;
  activityType: string;
  academicProgram: string;
  createdAt: Date;
  decidedAt: Date | null;
}

export interface Categoria {
  valor: string;
  etiqueta: string;
  total: number;
}

export interface Estadisticas {
  totales: {
    solicitadas: number;
    confirmadas: number;
    rechazadas: number;
    canceladas: number;
    vencidas: number;
  };
  servicio: {
    /** Vencidas que nadie llegó a mirar: EXPIRED con decidedAt nulo. */
    sinRevisar: number;
    /** Media de horas entre solicitar y decidir. null si no hubo decisiones. */
    tiempoRespuestaHoras: number | null;
  };
  ocupacion: {
    horasReservadas: number;
    horasHabiles: number;
    /** 0..1. Vale 0 si el periodo no tiene ni un día hábil. */
    indice: number;
  };
  porHora: { hora: number; total: number }[];
  porCargo: Categoria[];
  porActividad: Categoria[];
  porPrograma: Categoria[];
  porDiaSemana: { dia: number; etiqueta: string; total: number }[];
}

/** Lunes a viernes: el laboratorio no abre fin de semana. */
const DIAS_HABILES = [
  { dia: 1, etiqueta: "Lunes" },
  { dia: 2, etiqueta: "Martes" },
  { dia: 3, etiqueta: "Miércoles" },
  { dia: 4, etiqueta: "Jueves" },
  { dia: 5, etiqueta: "Viernes" },
];

const MS_POR_HORA = 1000 * 60 * 60;

/** "08:00" da 8; "08:30" da 8.5. Las jornadas se declaran así en booking.ts. */
function horaDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

/*
 * Horas que el laboratorio ABRE entre dos fechas. Recorre día a día y suma lo
 * que diga `getOpeningRangesFor`, que ya devuelve [] en fines de semana y
 * festivos y ya descuenta el receso de 12:00 a 13:00.
 *
 * No se reimplementa esa regla aquí: es la misma función que usan el
 * calendario, la validación del servidor y la generación de franjas, así que
 * añadir un festivo por ley sigue siendo tocar un solo sitio.
 */
export function horasHabilesEntre(desde: Date, hasta: Date): number {
  let total = 0;
  // Se avanza en pasos de un día desde el mediodía UTC: así el instante cae
  // siempre dentro del mismo día de Bogotá (UTC-5) pase lo que pase con el
  // redondeo, y ningún día se cuenta dos veces ni se salta.
  const cursor = new Date(
    Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate(), 12),
  );

  while (cursor < hasta) {
    for (const rango of getOpeningRangesFor(cursor)) {
      total += horaDecimal(rango.end) - horaDecimal(rango.start);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return total;
}

/** Cuenta por clave y ordena de mayor a menor: es un ranking, no una serie. */
function contarPor(
  filas: FilaEstadistica[],
  clave: (fila: FilaEstadistica) => string,
  etiquetar: (valor: string) => string,
): Categoria[] {
  const cuenta = new Map<string, number>();
  for (const fila of filas) {
    const k = clave(fila);
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }

  // Array.from y no [...cuenta.entries()]: tsconfig.json no declara `target`,
  // así que tsc asume ES5 y rechaza iterar un Map con spread. Se resuelve
  // aquí, en una línea, en vez de subir el target de todo el proyecto por un
  // solo sitio.
  return Array.from(cuenta.entries())
    .map(([valor, total]) => ({ valor, etiqueta: etiquetar(valor), total }))
    .sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta, "es"));
}

export function calcularEstadisticas(
  filas: FilaEstadistica[],
  periodo: { desde: Date; hasta: Date },
): Estadisticas {
  const porEstado = (estado: FilaEstadistica["status"]) =>
    filas.filter((f) => f.status === estado);

  const confirmadas = porEstado("CONFIRMED");

  /*
   * La ocupación y la hora del día miden USO REAL, así que solo cuentan las
   * confirmadas. Los rankings de abajo (cargo, actividad, programa, día)
   * miden DEMANDA y cuentan todas las solicitudes. Son dos preguntas
   * distintas y la interfaz tiene que decir cuál responde cada bloque.
   */
  const horasReservadas = confirmadas.reduce(
    (suma, f) => suma + (f.endsAt.getTime() - f.startsAt.getTime()) / MS_POR_HORA,
    0,
  );
  const horasHabiles = horasHabilesEntre(periodo.desde, periodo.hasta);

  // Hora de inicio EN BOGOTÁ, no en UTC. El servidor corre en UTC: leer
  // getUTCHours() aquí correría el gráfico entero 5 horas.
  const cuentaHoras = new Map<number, number>();
  for (const fila of confirmadas) {
    const h = toBogota(fila.startsAt).getHours();
    cuentaHoras.set(h, (cuentaHoras.get(h) ?? 0) + 1);
  }

  // Todas las horas de apertura, incluso las que valen 0: un hueco en el
  // medio es información, y sin los ceros el eje mentiría sobre el horario.
  const jornadas = BOOKING_CONFIG.openingHours[1];
  const primeraHora = horaDecimal(jornadas[0].start);
  const ultimaHora = horaDecimal(jornadas[jornadas.length - 1].end);
  const porHora: { hora: number; total: number }[] = [];
  for (let h = Math.floor(primeraHora); h < Math.ceil(ultimaHora); h++) {
    porHora.push({ hora: h, total: cuentaHoras.get(h) ?? 0 });
  }

  const cuentaDias = new Map<number, number>();
  for (const fila of filas) {
    const d = toBogota(fila.startsAt).getDay();
    cuentaDias.set(d, (cuentaDias.get(d) ?? 0) + 1);
  }

  const decididas = filas.filter((f) => f.decidedAt !== null);
  const tiempoRespuestaHoras = decididas.length
    ? decididas.reduce(
        // Math.max(0, ...) porque la diferencia puede salir negativa por unos
        // microsegundos cuando `decidedAt` y `createdAt` se escriben en el
        // mismo instante: pasa con los datos de la semilla, y podría pasar en
        // producción con una decisión inmediata. Sin el tope, la media salía
        // en -6,25e-7 h y la pantalla mostraba "-0 min". Decidir antes de
        // solicitar no significa nada, así que el suelo es cero.
        (suma, f) =>
          suma +
          Math.max(0, f.decidedAt!.getTime() - f.createdAt.getTime()) / MS_POR_HORA,
        0,
      ) / decididas.length
    : null;

  return {
    totales: {
      solicitadas: filas.length,
      confirmadas: confirmadas.length,
      rechazadas: porEstado("REJECTED").length,
      canceladas: porEstado("CANCELLED").length,
      vencidas: porEstado("EXPIRED").length,
    },
    servicio: {
      // EXPIRED con decidedAt nulo significa exactamente "se venció sin que
      // nadie la mirara" — es el invariante que fija lib/expiration.ts.
      sinRevisar: filas.filter((f) => f.status === "EXPIRED" && f.decidedAt === null).length,
      tiempoRespuestaHoras,
    },
    ocupacion: {
      horasReservadas,
      horasHabiles,
      indice: horasHabiles > 0 ? horasReservadas / horasHabiles : 0,
    },
    porHora,
    // labelForRequesterRole devuelve el valor crudo si no lo reconoce, y aquí
    // hace falta: requesterRole es String, no un enum, y hay filas antiguas
    // con texto libre fuera de la lista.
    porCargo: contarPor(filas, (f) => f.requesterRole, labelForRequesterRole),
    porActividad: contarPor(filas, (f) => f.activityType, labelForActivityType),
    porPrograma: contarPor(filas, (f) => f.academicProgram, labelForAcademicProgram),
    porDiaSemana: DIAS_HABILES.map(({ dia, etiqueta }) => ({
      dia,
      etiqueta,
      total: cuentaDias.get(dia) ?? 0,
    })),
  };
}

/** Clave de mes en hora de Bogotá, con la forma "2026-09". */
export function mesDeBogota(instant: Date): string {
  return toBogotaDayKey(instant).slice(0, 7);
}

/** Los límites UTC del mes "YYYY-MM" entendido en hora de Bogotá. */
export function rangoDelMes(mes: string): { desde: Date; hasta: Date } {
  const [anio, m] = mes.split("-").map(Number);
  // Bogotá es UTC-5 todo el año (no hay horario de verano), así que el primer
  // instante del mes local es su día 1 a las 05:00 UTC.
  const desde = new Date(Date.UTC(anio, m - 1, 1, 5));
  const hasta = new Date(Date.UTC(anio, m, 1, 5));
  return { desde, hasta };
}

/** Etiqueta legible de un mes: "septiembre de 2026". */
export function etiquetaDeMes(mes: string): string {
  const { desde } = rangoDelMes(mes);
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: BOOKING_CONFIG.timeZone,
  }).format(desde);
}

/** Serie mensual para la tendencia: un punto por mes, en orden cronológico. */
export function agruparPorMes(
  filas: { startsAt: Date }[],
  meses: string[],
): { mes: string; etiqueta: string; total: number }[] {
  const cuenta = new Map<string, number>();
  for (const fila of filas) {
    const k = mesDeBogota(fila.startsAt);
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  return meses.map((mes) => ({
    mes,
    etiqueta: etiquetaDeMes(mes),
    total: cuenta.get(mes) ?? 0,
  }));
}

/** Los `cantidad` meses que terminan en el de `hasta`, del más viejo al más nuevo. */
export function ultimosMeses(hasta: Date, cantidad: number): string[] {
  const fin = mesDeBogota(hasta);
  const [anio, m] = fin.split("-").map(Number);
  const meses: string[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anio, m - 1 - i, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return meses;
}
