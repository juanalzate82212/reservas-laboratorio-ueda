import { jwtVerify, SignJWT } from "jose";

/*
 * Sesión del administrador: JWT firmado con `jose`, guardado en la cookie
 * `admin_session` (httpOnly, 8h). Sin NextAuth ni base de usuarios — un solo
 * administrador, una sola contraseña en ADMIN_PASSWORD (§2.8 del plan).
 *
 * Este archivo se mantiene sin `next/headers` a nivel de módulo a propósito:
 * middleware.ts corre en Edge y necesita signAdminToken/verifyAdminToken
 * directamente. getAdminSession() (para Route Handlers en Node) importa
 * next/headers de forma DINÁMICA más abajo, para que ese import nunca quede
 * atrapado en el bundle de Edge aunque este mismo archivo se comparta.
 */
export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 horas

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Falta AUTH_SECRET en las variables de entorno.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

/** Edge-safe: no depende de next/headers. Usable desde middleware.ts. */
export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

/** Opciones de la cookie, compartidas entre login (set) y logout (delete). */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

/**
 * Para Route Handlers en runtime Node — NO importar desde middleware.ts.
 * Cada handler de /api/admin/** la llama por su cuenta: el middleware
 * protege las páginas, pero no es la única defensa (§2.8 del plan).
 */
export async function getAdminSession(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminToken(token);
}
