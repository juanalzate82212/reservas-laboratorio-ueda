import { NextResponse, type NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expirarReservasVencidas } from "@/lib/expiration";
import {
  agruparPorMes,
  calcularEstadisticas,
  etiquetaDeMes,
  mesDeBogota,
  rangoDelMes,
  ultimosMeses,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Cuántos meses dibuja la línea de tendencia. */
const MESES_TENDENCIA = 12;

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/*
 * Campos que necesita el cálculo, y ni uno más. Es la contrapartida exacta de
 * `FilaEstadistica` en lib/stats.ts.
 *
 * ⚠️ NO ampliar este `select` sin pensarlo. Dejar fuera requesterName,
 * requesterDocId y requesterEmail es lo que hace que ningún dato personal
 * salga de la base de datos para dibujar un gráfico: aunque la respuesta va
 * detrás de sesión, un agregado no necesita saber de quién es cada fila, y lo
 * que no se lee no se puede filtrar por accidente.
 */
const CAMPOS = {
  startsAt: true,
  endsAt: true,
  status: true,
  requesterRole: true,
  activityType: true,
  academicProgram: true,
  createdAt: true,
  decidedAt: true,
} as const;

/*
 * Agregados para el panel de estadísticas. Devuelve SOLO cifras.
 *
 * El parámetro `mes` (YYYY-MM) filtra por `startsAt` —la fecha de la reserva,
 * no la de la solicitud—, así que responde a "cuánto se usó el laboratorio en
 * septiembre" y no a "cuánto se pidió". Fue una decisión explícita del
 * usuario. Sin el parámetro, el periodo es todo el histórico.
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) {
    return errorResponse(401, "UNAUTHORIZED", "Inicia sesión para ver las estadísticas.");
  }

  const mes = request.nextUrl.searchParams.get("mes");
  if (mes && !FORMATO_MES.test(mes)) {
    return errorResponse(400, "VALIDATION_ERROR", "El mes debe tener el formato AAAA-MM.");
  }

  // Antes de contar: si no, las solicitudes que ya pasaron su franja seguirían
  // contándose como PENDING y el total de vencidas saldría corto.
  await expirarReservasVencidas();

  const ahora = new Date();
  const meses = ultimosMeses(ahora, MESES_TENDENCIA);

  /*
   * ⚠️ Las dos consultas van SECUENCIALES, nunca en un Promise.all.
   * DATABASE_URL lleva connection_limit=1: dos consultas Prisma a la vez
   * fuera de una transacción compiten por la única conexión y agotan el
   * pool_timeout en vez de esperar turno. Ya provocó un P2024 real aquí.
   */

  // La tendencia ignora el filtro de mes a propósito: doce meses dentro de un
  // mes no significaría nada. Siempre son los últimos 12 hasta hoy.
  const desdeTendencia = rangoDelMes(meses[0]).desde;
  const filasTendencia = await prisma.reservation.findMany({
    where: { startsAt: { gte: desdeTendencia } },
    select: { startsAt: true },
  });

  const rango = mes ? rangoDelMes(mes) : null;
  const filas = await prisma.reservation.findMany({
    where: rango ? { startsAt: { gte: rango.desde, lt: rango.hasta } } : {},
    select: CAMPOS,
    orderBy: { startsAt: "asc" },
  });

  /*
   * Periodo del histórico completo: de la primera reserva a la última. Se
   * derivan de las filas ya traídas en vez de con dos consultas más — están
   * ordenadas por startsAt, así que los extremos son el primer y el último
   * elemento. `hasta` se estira al día siguiente para que el último día
   * cuente entero al sumar horas hábiles.
   */
  const periodo =
    rango ??
    (filas.length > 0
      ? {
          desde: filas[0].startsAt,
          hasta: new Date(filas[filas.length - 1].endsAt.getTime() + 24 * 60 * 60 * 1000),
        }
      : { desde: ahora, hasta: ahora });

  const estadisticas = calcularEstadisticas(filas, periodo);

  return NextResponse.json({
    periodo: {
      mes: mes ?? null,
      etiqueta: mes ? etiquetaDeMes(mes) : "Todo el histórico",
    },
    // Solo los meses que tienen alguna reserva: un desplegable con meses
    // vacíos invita a mirar pantallas en blanco.
    mesesDisponibles: meses.filter((m) =>
      filasTendencia.some((f) => mesDeBogota(f.startsAt) === m),
    ),
    ...estadisticas,
    tendencia: agruparPorMes(filasTendencia, meses),
  });
}
