"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AdminSession } from "@/lib/auth";

/*
 * La sesión del panel, disponible para los Client Components sin que cada uno
 * la pida por su cuenta.
 *
 * Por qué contexto y no un GET /api/admin/session: el layout ya es un Server
 * Component y ya tiene la sesión resuelta, así que pasarla hacia abajo cuesta
 * cero peticiones. Con un endpoint, cada pantalla que necesite el rol añadiría
 * un viaje más al servidor — y con connection_limit=1 los viajes de más se
 * pagan.
 *
 * ⚠️ Esto es para DECIDIR QUÉ PINTAR, nunca para autorizar. Un cliente puede
 * mentir sobre su rol sin esfuerzo. Quien autoriza es siempre el handler, que
 * relee el usuario de la base con getAdminSession(). Ocultar un botón es
 * cortesía; el 403 es la defensa.
 */
const SesionAdminContext = createContext<AdminSession | null>(null);

export function SesionAdminProvider({
  sesion,
  children,
}: {
  sesion: AdminSession;
  children: ReactNode;
}) {
  return (
    <SesionAdminContext.Provider value={sesion}>
      {children}
    </SesionAdminContext.Provider>
  );
}

/**
 * Lanza si se usa fuera del provider. Es preferible a devolver null: un
 * componente del panel que se quedara sin sesión pintaría en silencio la
 * versión limitada de sí mismo, y eso se depura mucho peor que un error.
 */
export function useSesionAdmin(): AdminSession {
  const sesion = useContext(SesionAdminContext);
  if (!sesion) {
    throw new Error(
      "useSesionAdmin() debe usarse dentro de <SesionAdminProvider>.",
    );
  }
  return sesion;
}

/** Atajo legible para lo que más se consulta. */
export function useEsSuperAdmin(): boolean {
  return useSesionAdmin().role === "SUPER_ADMIN";
}
