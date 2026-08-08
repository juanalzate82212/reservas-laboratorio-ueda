// Sin I, O, 0, 1: se confunden entre sí al leerlos en voz alta o a mano.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const PREFIJO = "UEDA";
const LARGO_SUFIJO = 5;

/** "UEDA-7F3K2" — compartido entre prisma/seed.ts y POST /api/reservations. */
export function generateReservationCode(): string {
  let sufijo = "";
  for (let i = 0; i < LARGO_SUFIJO; i += 1) {
    sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return `${PREFIJO}-${sufijo}`;
}

/*
 * Deja en forma canónica lo que alguien teclea a mano en /reserva: minúsculas,
 * espacios sobrantes, guion omitido o el prefijo escrito o no.
 *
 * Lo que NO hace, a propósito: corregir caracteres confundidos. El alfabeto
 * excluye I, O, 0 y 1 justamente porque se confunden entre sí — pero al
 * excluirlos LOS CUATRO, un "0" tecleado no se puede mapear a "O", que tampoco
 * es válido. No hay a qué corregirlo. Los que sí siguen siendo ambiguos entre
 * ellos (S/5, Z/2, ambos válidos) tampoco se pueden adivinar. Por eso la
 * tolerancia va en el mensaje de "no encontramos", no aquí.
 */
export function normalizeReservationCode(entrada: string): string {
  const limpio = entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const sufijo = limpio.startsWith(PREFIJO) ? limpio.slice(PREFIJO.length) : limpio;
  return `${PREFIJO}-${sufijo}`;
}

/**
 * Si un código normalizado puede existir. Sirve para avisar al escribirlo, sin
 * gastar una consulta en algo que seguro no está.
 */
export function isReservationCodeShape(code: string): boolean {
  const sufijo = code.startsWith(`${PREFIJO}-`) ? code.slice(PREFIJO.length + 1) : "";
  // split("") y no [...sufijo]: el target de tsconfig no permite iterar
  // strings con spread sin downlevelIteration.
  return (
    sufijo.length === LARGO_SUFIJO &&
    sufijo.split("").every((caracter) => ALFABETO.includes(caracter))
  );
}
