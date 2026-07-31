import { prisma } from "./db";

export type PublicReservationStatus = {
  code: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  requesterName: string;
  requesterEmail: string; // enmascarado, nunca completo
  adminNote: string | null;
  decidedAt: Date | null;
  room: { name: string; slug: string };
};

/** "ana.restrepo@amigo.edu.co" -> "a***@amigo.edu.co" */
function maskEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  return `${usuario.charAt(0)}***@${dominio}`;
}

/*
 * Compartida entre GET /api/reservations/[code] y /reserva/[codigo]/page.tsx
 * (Server Component): un solo lugar que decide qué campos son públicos.
 * Nunca expone requesterDocId ni el correo completo (ver Privacidad en
 * CLAUDE.md).
 */
export async function getPublicReservationByCode(
  code: string,
): Promise<PublicReservationStatus | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      code: true,
      status: true,
      startsAt: true,
      endsAt: true,
      requesterName: true,
      requesterEmail: true,
      adminNote: true,
      decidedAt: true,
      room: { select: { name: true, slug: true } },
    },
  });

  if (!reservation) return null;

  return { ...reservation, requesterEmail: maskEmail(reservation.requesterEmail) };
}
