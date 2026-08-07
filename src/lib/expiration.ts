import { prisma } from "./db";

/*
 * Una solicitud que nadie revisó y cuya franja ya terminó pasa a EXPIRED.
 *
 * A diferencia del resto de transiciones, esta no la decide el administrador,
 * así que no hay ninguna acción de usuario donde colgarla: se aplica aquí,
 * justo antes de las lecturas que la mostrarían o la contarían.
 *
 * Por qué al leer y no con una tarea programada: Vercel en plan Hobby solo
 * permite UNA ejecución al día, así que una solicitud vencida por la mañana
 * seguiría apareciendo "En revisión" hasta la madrugada siguiente. Aplicándola
 * al leer, lo que se ve nunca está desfasado, sin infraestructura extra.
 *
 * `decidedAt` se deja en null a propósito: no hubo decisión. EXPIRED con
 * decidedAt nulo es precisamente "se venció sin que nadie la mirara".
 *
 * Es idempotente y de una sola sentencia: si no hay nada que vencer, no toca
 * ninguna fila. Llamarla SIEMPRE en secuencia, nunca dentro de un Promise.all
 * junto a otras consultas — con connection_limit=1 competirían por la única
 * conexión y agotarían el pool_timeout (ver CLAUDE.md).
 */
export async function expirarReservasVencidas(): Promise<number> {
  const { count } = await prisma.reservation.updateMany({
    where: { status: "PENDING", endsAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return count;
}
