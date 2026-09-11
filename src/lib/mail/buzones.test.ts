import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buzonConfigurado, resolverBuzon } from "./buzones";

/*
 * Función de sus argumentos y del entorno, sin Prisma ni petición: entra en
 * Vitest según el criterio de CLAUDE.md. Que el correo salga de verdad por el
 * buzón correcto se verifica aparte, contra los endpoints.
 */

const VARIABLES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM",
  "MAIL_TO_ADMIN",
];

let original: Record<string, string | undefined>;

beforeEach(() => {
  // El entorno real del desarrollador no debe decidir el resultado.
  original = {};
  for (const clave of Object.keys(process.env)) {
    if (VARIABLES.some((v) => clave === v || clave.startsWith(`${v}_`))) {
      original[clave] = process.env[clave];
      delete process.env[clave];
    }
  }
});

afterEach(() => {
  for (const [clave, valor] of Object.entries(original)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

describe("resolverBuzon", () => {
  it("usa las variables del laboratorio", () => {
    process.env.SMTP_HOST_REDES = "smtp.redes.test";
    process.env.SMTP_PASSWORD_REDES = "clave-redes";
    process.env.MAIL_FROM_REDES = "Redes <redes@amigo.edu.co>";
    process.env.MAIL_TO_ADMIN_REDES = "avisos.redes@amigo.edu.co";

    const buzon = resolverBuzon("REDES");

    expect(buzon.host).toBe("smtp.redes.test");
    expect(buzon.from).toBe("Redes <redes@amigo.edu.co>");
    expect(buzon.avisosA).toBe("avisos.redes@amigo.edu.co");
    expect(buzonConfigurado(buzon)).toBe(true);
  });

  /*
   * La reserva a la variable global es lo que permite desplegar esta fase sin
   * tocar las variables que Analítica ya tiene en Vercel.
   */
  it("cae en la variable global cuando el laboratorio no tiene la suya", () => {
    process.env.SMTP_HOST = "smtp.global.test";
    process.env.SMTP_PASSWORD = "clave-global";

    const buzon = resolverBuzon("REDES");

    expect(buzon.host).toBe("smtp.global.test");
    expect(buzonConfigurado(buzon)).toBe(true);
  });

  it("la del laboratorio gana a la global", () => {
    process.env.SMTP_HOST = "smtp.global.test";
    process.env.SMTP_HOST_REDES = "smtp.redes.test";

    expect(resolverBuzon("REDES").host).toBe("smtp.redes.test");
  });

  /*
   * Una variable vacía en Vercel es lo mismo que no tenerla: si no se tratara
   * así, dejar `SMTP_HOST_REDES=""` anularía la reserva a la global y el
   * laboratorio caería en modo LOGGED sin un solo error.
   */
  it("trata una variable vacía como no configurada", () => {
    process.env.SMTP_HOST = "smtp.global.test";
    process.env.SMTP_HOST_REDES = "";

    expect(resolverBuzon("REDES").host).toBe("smtp.global.test");
  });

  it("no mezcla los buzones de dos laboratorios", () => {
    process.env.SMTP_HOST_ANALITICA = "smtp.analitica.test";
    process.env.MAIL_FROM_ANALITICA = "analitica@amigo.edu.co";
    process.env.SMTP_HOST_REDES = "smtp.redes.test";
    process.env.MAIL_FROM_REDES = "redes@amigo.edu.co";

    expect(resolverBuzon("ANALITICA").from).toBe("analitica@amigo.edu.co");
    expect(resolverBuzon("REDES").from).toBe("redes@amigo.edu.co");
  });

  it("normaliza la clave a un sufijo de variable válido", () => {
    process.env.SMTP_HOST_REDES_E_INFRA = "smtp.normalizado.test";

    // Minúsculas, acentos y guiones: el mailKey lo escribe una persona en la
    // base de datos y no tiene por qué ser un identificador válido.
    expect(resolverBuzon("redes-e-infra").host).toBe("smtp.normalizado.test");
    expect(resolverBuzon("Redes É Infra").host).toBe("smtp.normalizado.test");
  });

  it("el puerto cae a 587 y `secure` a false cuando no se declaran", () => {
    const buzon = resolverBuzon("REDES");

    expect(buzon.port).toBe(587);
    expect(buzon.secure).toBe(false);
  });

  it("`secure` solo es true con la cadena exacta", () => {
    process.env.SMTP_SECURE_REDES = "TRUE";
    expect(resolverBuzon("REDES").secure).toBe(false);

    process.env.SMTP_SECURE_REDES = "true";
    expect(resolverBuzon("REDES").secure).toBe(true);
  });
});

describe("buzonConfigurado", () => {
  /*
   * Exige host Y contraseña. Con solo uno de los dos, nodemailer intentaría
   * conectarse y fallaría en cada envío en vez de caer limpiamente en LOGGED.
   */
  it("necesita host y contraseña", () => {
    expect(buzonConfigurado(resolverBuzon("REDES"))).toBe(false);

    process.env.SMTP_HOST_REDES = "smtp.redes.test";
    expect(buzonConfigurado(resolverBuzon("REDES"))).toBe(false);

    process.env.SMTP_PASSWORD_REDES = "clave";
    expect(buzonConfigurado(resolverBuzon("REDES"))).toBe(true);
  });
});
