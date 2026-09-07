import { describe, expect, it } from "vitest";

import { alcanceDeSala, puedeAdministrarUsuarios, type AdminSession } from "./auth";

/*
 * Función pura de sus argumentos, sin Prisma ni petición: el criterio de
 * CLAUDE.md para que algo entre en Vitest. El resto de la fase 3 —que cada
 * handler aplique este alcance— se verifica con curl contra los endpoints,
 * porque eso sí necesita base de datos y sesión.
 */

const SUPER: AdminSession = {
  role: "SUPER_ADMIN",
  roomId: null,
  userId: "u-super",
  email: "general@amigo.edu.co",
  name: "Administrador general",
};

const ENCARGADO_REDES: AdminSession = {
  role: "LAB_ADMIN",
  roomId: "sala-redes",
  userId: "u-redes",
  email: "redes@amigo.edu.co",
  name: "Encargado de Redes",
};

describe("alcanceDeSala", () => {
  it("no acota al administrador general", () => {
    expect(alcanceDeSala(SUPER)).toEqual({});
  });

  it("acota al encargado a su laboratorio", () => {
    expect(alcanceDeSala(ENCARGADO_REDES)).toEqual({ roomId: "sala-redes" });
  });

  /*
   * Este es el caso que importa de verdad, y por eso se prueba el PATRÓN de
   * uso y no solo el valor devuelto: los handlers construyen el `where`
   * mezclando el filtro que pide el cliente con el alcance, y el alcance va
   * DESPUÉS. Si alguien invirtiera el orden al refactorizar, un encargado
   * podría leer las solicitudes de otro laboratorio —con nombre, documento y
   * correo del solicitante— pasando `?roomId=` a mano. Es una vulnerabilidad
   * que depende del orden de dos líneas, así que queda fijada aquí.
   */
  it("pisa el filtro de sala que llega del cliente", () => {
    const pedidoPorElCliente = { roomId: "sala-analitica" };

    const where = { ...pedidoPorElCliente, ...alcanceDeSala(ENCARGADO_REDES) };

    expect(where.roomId).toBe("sala-redes");
  });

  it("deja pasar el filtro del cliente cuando es el administrador general", () => {
    const pedidoPorElCliente = { roomId: "sala-analitica" };

    const where = { ...pedidoPorElCliente, ...alcanceDeSala(SUPER) };

    expect(where.roomId).toBe("sala-analitica");
  });

  it("no inventa un filtro cuando el cliente no pide ninguno", () => {
    const where = { ...alcanceDeSala(SUPER) };

    expect(where).toEqual({});
    expect("roomId" in where).toBe(false);
  });
});

describe("puedeAdministrarUsuarios", () => {
  it("solo el administrador general", () => {
    expect(puedeAdministrarUsuarios(SUPER)).toBe(true);
    expect(puedeAdministrarUsuarios(ENCARGADO_REDES)).toBe(false);
  });
});
