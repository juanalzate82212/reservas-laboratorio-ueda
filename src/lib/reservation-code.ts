// Sin I, O, 0, 1: se confunden entre sí al leerlos en voz alta o a mano.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "UEDA-7F3K2" — compartido entre prisma/seed.ts y POST /api/reservations. */
export function generateReservationCode(): string {
  let sufijo = "";
  for (let i = 0; i < 5; i += 1) {
    sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `UEDA-${sufijo}`;
}
