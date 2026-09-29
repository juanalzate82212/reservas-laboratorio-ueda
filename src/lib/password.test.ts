import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

/*
 * Función pura de sus argumentos (sin Prisma ni petición), que es el criterio
 * de CLAUDE.md para que algo entre en Vitest. El resto del trabajo se verifica
 * por criterios de aceptación.
 */
describe("hashPassword / verifyPassword", () => {
  it("acepta la contraseña correcta", async () => {
    const hash = await hashPassword("una-contrasena-larga-y-buena");
    expect(await verifyPassword("una-contrasena-larga-y-buena", hash)).toBe(true);
  });

  it("rechaza la contraseña incorrecta", async () => {
    const hash = await hashPassword("una-contrasena-larga-y-buena");
    expect(await verifyPassword("otra-cosa", hash)).toBe(false);
  });

  it("distingue mayúsculas y espacios", async () => {
    const hash = await hashPassword("Clave Con Espacios");
    expect(await verifyPassword("clave con espacios", hash)).toBe(false);
    expect(await verifyPassword("Clave Con Espacios ", hash)).toBe(false);
  });

  it("usa una sal distinta en cada hasheo", async () => {
    const a = await hashPassword("misma-contrasena");
    const b = await hashPassword("misma-contrasena");

    // Dos hashes iguales significarían sal fija: una tabla de AdminUser
    // delataría qué administradores comparten contraseña.
    expect(a).not.toBe(b);
    expect(await verifyPassword("misma-contrasena", a)).toBe(true);
    expect(await verifyPassword("misma-contrasena", b)).toBe(true);
  });

  it("emite el formato etiquetado scrypt$sal$hash", async () => {
    const partes = (await hashPassword("x")).split("$");
    expect(partes).toHaveLength(3);
    expect(partes[0]).toBe("scrypt");
  });

  // Estos son los que importan: verifyPassword la llama el login, así que una
  // excepción sería un 500 que además distingue "hash corrupto" de
  // "contraseña incorrecta".
  it.each([
    ["cadena vacía", ""],
    ["sin separadores", "solotexto"],
    ["partes de menos", "scrypt$soloUna"],
    ["partes de más", "scrypt$a$b$c"],
    ["otro algoritmo", "bcrypt$c2Fs$aGFzaA=="],
    ["sal vacía", "scrypt$$aGFzaA=="],
    ["hash vacío", "scrypt$c2Fs$"],
  ])("devuelve false sin lanzar ante un hash con %s", async (_caso, almacenado) => {
    await expect(verifyPassword("cualquiera", almacenado)).resolves.toBe(false);
  });
});
