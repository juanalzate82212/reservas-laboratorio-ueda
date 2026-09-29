import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/*
 * Hasheo de contraseñas de AdminUser con scrypt de node:crypto.
 *
 * Por qué scrypt y no bcrypt: `bcrypt` es un binario nativo (una compilación
 * más que puede romper el build de Vercel) y `bcryptjs` sería una dependencia
 * más contra un stack fijado a propósito. scrypt es un KDF estándar, con
 * función de coste, y viene en la biblioteca de Node. Cero dependencias.
 *
 * ⚠️ NO importar este módulo desde lib/auth.ts. auth.ts lo comparte
 * middleware.ts, que corre en Edge, y `node:crypto` no existe allí: el import
 * quedaría atrapado en el grafo estático del bundle de Edge y rompería el
 * middleware. Esto solo lo usan Route Handlers en runtime Node.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const LARGO_SAL = 16;
const LARGO_CLAVE = 64;
const ETIQUETA = "scrypt";

/**
 * Devuelve `scrypt$<sal en base64>$<hash en base64>`.
 *
 * El formato lleva la etiqueta del algoritmo delante para que, si algún día se
 * cambia de KDF, `verifyPassword` pueda distinguir los hashes viejos de los
 * nuevos en vez de fallar en bloque contra toda la tabla.
 */
export async function hashPassword(plain: string): Promise<string> {
  const sal = randomBytes(LARGO_SAL);
  const derivada = await scryptAsync(plain, sal, LARGO_CLAVE);
  return `${ETIQUETA}$${sal.toString("base64")}$${derivada.toString("base64")}`;
}

/**
 * Comparación en tiempo constante. Nunca lanza: un hash con formato corrupto
 * devuelve `false`, porque quien llama es el login y ahí una excepción sería
 * un 500 que además distingue "usuario con hash roto" de "contraseña mala".
 */
export async function verifyPassword(
  plain: string,
  almacenado: string,
): Promise<boolean> {
  const partes = almacenado.split("$");
  if (partes.length !== 3 || partes[0] !== ETIQUETA) return false;

  const [, salB64, hashB64] = partes;

  try {
    const sal = Buffer.from(salB64, "base64");
    const esperado = Buffer.from(hashB64, "base64");
    if (sal.length === 0 || esperado.length === 0) return false;

    const derivada = await scryptAsync(plain, sal, esperado.length);

    // timingSafeEqual EXIGE longitudes iguales: con distintas lanza en vez de
    // devolver false, y esa excepción se escaparía del login.
    if (derivada.length !== esperado.length) return false;
    return timingSafeEqual(derivada, esperado);
  } catch {
    return false;
  }
}
