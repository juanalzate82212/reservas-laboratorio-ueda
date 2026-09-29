import type { AdminRole } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";

/*
 * Sesión del administrador: JWT firmado con `jose`, guardado en la cookie
 * `admin_session` (httpOnly, 8h).
 *
 * Este archivo se mantiene sin `next/headers` NI Prisma a nivel de módulo a
 * propósito: middleware.ts corre en Edge y necesita
 * signAdminToken/verifyAdminToken directamente. getAdminSession() (para Route
 * Handlers en Node) importa ambos de forma DINÁMICA más abajo, para que esos
 * imports nunca queden atrapados en el bundle de Edge aunque este mismo
 * archivo se comparta. El import de `AdminRole` es solo de tipo: se borra al
 * compilar y no llega a ningún bundle.
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

/*
 * Lo que viaja DENTRO del token. Es una foto del momento del login: sirve para
 * decidir en Edge sin tocar la base, pero puede haber envejecido — ver
 * getAdminSession().
 */
export interface AdminTokenPayload {
  userId: string;
  role: AdminRole;
  roomId: string | null;
}

export async function signAdminToken(usuario: {
  id: string;
  role: AdminRole;
  roomId: string | null;
}): Promise<string> {
  return new SignJWT({ role: usuario.role, roomId: usuario.roomId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Edge-safe: no depende de next/headers ni de Prisma. Usable desde
 * middleware.ts. Devuelve el contenido del token, o null si no es válido.
 *
 * ⚠️ Antes devolvía un boolean y tiraba el payload. Ahora lo entrega, porque el
 * middleware necesita el rol para decidir sobre /admin/usuarios. Sigue siendo
 * la verificación de la FIRMA, no del estado actual del usuario.
 */
export async function verifyAdminToken(
  token: string | undefined,
): Promise<AdminTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    const role = payload.role;
    if (role !== "SUPER_ADMIN" && role !== "LAB_ADMIN") return null;
    const roomId = payload.roomId;
    if (roomId !== null && typeof roomId !== "string") return null;
    return { userId: payload.sub, role, roomId };
  } catch {
    return null;
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

/*
 * Unión discriminada, no un objeto con `roomId` opcional, y eso hace trabajo
 * real: el compilador garantiza que un LAB_ADMIN SIEMPRE trae sala. Sin eso,
 * alcanceDeSala() tendría que decidir qué hacer con un LAB_ADMIN sin sala, y
 * la respuesta cómoda —devolver un alcance vacío— sería abrirle todos los
 * laboratorios. Ese caso se corta antes, en getAdminSession().
 */
export type AdminSession =
  | {
      role: "SUPER_ADMIN";
      roomId: null;
      userId: string;
      email: string;
      name: string;
    }
  | {
      role: "LAB_ADMIN";
      roomId: string;
      userId: string;
      email: string;
      name: string;
    };

/**
 * Para Route Handlers en runtime Node — NO importar desde middleware.ts.
 * Cada handler de /api/admin/** la llama por su cuenta: el middleware protege
 * las PÁGINAS, pero no es la única defensa (ver CLAUDE.md).
 *
 * ⚠️ Verifica la firma Y RELEE la fila del usuario. La consulta extra es
 * deliberada: si la sesión confiara solo en el token, desactivar a un
 * administrador o cambiarlo de laboratorio tardaría hasta 8 HORAS en surtir
 * efecto. Es una búsqueda por clave primaria, y va secuencial —nunca dentro de
 * un Promise.all— porque connection_limit=1.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const { cookies } = await import("next/headers");
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;

  const payload = await verifyAdminToken(token);
  if (!payload) return null;

  const { prisma } = await import("./db");
  const usuario = await prisma.adminUser.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      roomId: true,
      isActive: true,
    },
  });

  if (!usuario || !usuario.isActive) return null;

  if (usuario.role === "SUPER_ADMIN") {
    return {
      role: "SUPER_ADMIN",
      roomId: null,
      userId: usuario.id,
      email: usuario.email,
      name: usuario.name,
    };
  }

  /*
   * Un LAB_ADMIN sin laboratorio no puede administrar nada, así que no hay
   * sesión. Falla cerrado a propósito: la alternativa —dejarlo pasar con
   * alcance vacío— le daría acceso a TODOS los laboratorios, que es justo lo
   * contrario de lo que significa el dato faltante. El esquema Zod del CRUD
   * impide crear uno así; esto cubre el caso de que llegue por otra vía.
   */
  if (!usuario.roomId) return null;

  return {
    role: "LAB_ADMIN",
    roomId: usuario.roomId,
    userId: usuario.id,
    email: usuario.email,
    name: usuario.name,
  };
}

/*
 * ⚠️ Pick DISTRIBUTIVO (`T extends unknown ? ... : never`), no
 * `Pick<AdminSession, ...>` a secas. Un Pick normal sobre una unión colapsa las
 * variantes y produce `{ role: "SUPER_ADMIN" | "LAB_ADMIN"; roomId: string |
 * null }`, perdiendo justo la correlación que interesa: que si el rol es
 * LAB_ADMIN, la sala NO es null. Sin ella el compilador no puede garantizar
 * que el alcance de un LAB_ADMIN sea una sala de verdad.
 */
type SesionAcotable<T extends AdminSession = AdminSession> =
  T extends AdminSession ? Pick<T, "role" | "roomId"> : never;

/**
 * El filtro por laboratorio que hay que meter en el `where` de toda consulta
 * del panel. SUPER_ADMIN es transversal y no filtra; LAB_ADMIN queda acotado
 * al suyo.
 *
 * ⚠️ Cuando el cliente también manda un filtro de sala, este alcance va
 * DESPUÉS en el objeto para que gane: un LAB_ADMIN que pida `?roomId=` de otro
 * laboratorio no debe ver nada suyo.
 */
export function alcanceDeSala(sesion: SesionAcotable): { roomId?: string } {
  return sesion.role === "SUPER_ADMIN" ? {} : { roomId: sesion.roomId };
}

/** Administrar usuarios es transversal: solo el SUPER_ADMIN. */
export function puedeAdministrarUsuarios(
  sesion: Pick<AdminSession, "role">,
): boolean {
  return sesion.role === "SUPER_ADMIN";
}
