import { describe, expect, it } from "vitest";

import { construirIcs, metodoDelIcs, uidDeReserva, type ReservaIcs } from "./ics";

/*
 * Función de sus argumentos, sin Prisma ni petición: entra en Vitest según el
 * criterio de CLAUDE.md. Que el cliente de correo la muestre con botones de
 * respuesta se verifica aparte, con un envío real.
 */

const RESERVA: ReservaIcs = {
  code: "UEDA-7F3K2",
  roomName: "Laboratorio de Redes e Infraestructura",
  // 09:00–11:00 hora de Bogotá = 14:00–16:00 UTC.
  startsAt: new Date("2026-09-14T14:00:00.000Z"),
  endsAt: new Date("2026-09-14T16:00:00.000Z"),
  activityType: "CLASE_PRACTICA",
  activityTypeOther: null,
};

const BASE = {
  reserva: RESERVA,
  organizador: { correo: "lab.redes@amigo.edu.co" },
  invitados: [
    { nombre: "Ana Pérez", correo: "ana.perez@amigo.edu.co" },
    { correo: "lab.redes@amigo.edu.co" },
  ],
  ahora: new Date("2026-09-11T12:00:00.000Z"),
};

/** Deshace el plegado del §3.1 para poder buscar una propiedad entera. */
function desplegar(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

function propiedad(ics: string, nombre: string): string | undefined {
  return desplegar(ics).find((l) => l.startsWith(nombre));
}

describe("construirIcs", () => {
  it("arma una invitación con el instante UTC real", () => {
    const ics = construirIcs({ metodo: "REQUEST", ...BASE });

    expect(propiedad(ics, "METHOD:")).toBe("METHOD:REQUEST");
    expect(propiedad(ics, "STATUS:")).toBe("STATUS:CONFIRMED");
    expect(propiedad(ics, "SEQUENCE:")).toBe("SEQUENCE:0");
    expect(propiedad(ics, "DTSTART:")).toBe("DTSTART:20260914T140000Z");
    expect(propiedad(ics, "DTEND:")).toBe("DTEND:20260914T160000Z");
    expect(propiedad(ics, "DTSTAMP:")).toBe("DTSTAMP:20260911T120000Z");
  });

  /*
   * El desfase de cinco horas es el error clásico de este proyecto:
   * toBogotaWallClockIso() existe solo para el límite con FullCalendar y aquí
   * mandaría la reserva de las 09:00 a las 04:00 del calendario de quien la
   * acepte.
   */
  it("no aplica el truco de hora local de FullCalendar", () => {
    const ics = construirIcs({ metodo: "REQUEST", ...BASE });

    expect(ics).not.toContain("20260914T090000");
    expect(ics).toContain("20260914T140000Z");
  });

  it("el organizador y los invitados van como mailto", () => {
    const ics = construirIcs({ metodo: "REQUEST", ...BASE });

    expect(propiedad(ics, "ORGANIZER")).toBe(
      "ORGANIZER:mailto:lab.redes@amigo.edu.co",
    );
    const invitados = desplegar(ics).filter((l) => l.startsWith("ATTENDEE"));
    expect(invitados).toHaveLength(2);
    expect(invitados[0]).toContain("CN=Ana Pérez");
    expect(invitados[0]).toContain("RSVP=TRUE");
    expect(invitados[1]).toContain("mailto:lab.redes@amigo.edu.co");
  });

  /*
   * El UID es lo ÚNICO que ata la cancelación a la invitación. Si los dos no
   * coinciden, el cliente de calendario ignora el CANCEL y la reserva se queda
   * pegada en la agenda para siempre, sin un solo error.
   */
  it("la cancelación repite el UID de la invitación y sube SEQUENCE", () => {
    const invitacion = construirIcs({ metodo: "REQUEST", ...BASE });
    const cancelacion = construirIcs({ metodo: "CANCEL", ...BASE });

    expect(propiedad(cancelacion, "UID:")).toBe(propiedad(invitacion, "UID:"));
    expect(propiedad(cancelacion, "METHOD:")).toBe("METHOD:CANCEL");
    expect(propiedad(cancelacion, "STATUS:")).toBe("STATUS:CANCELLED");
    expect(propiedad(cancelacion, "SEQUENCE:")).toBe("SEQUENCE:1");
  });

  it("en una cancelación no se pide respuesta", () => {
    const ics = construirIcs({ metodo: "CANCEL", ...BASE });

    expect(ics).not.toContain("RSVP=TRUE");
    expect(propiedad(ics, "ATTENDEE")).toContain("PARTSTAT=DECLINED");
  });

  it("el UID no depende de nada que cambie entre entornos", () => {
    // Si esto se rompe, las cancelaciones dejan de casar con las invitaciones
    // YA ENVIADAS. Cambiar el valor esperado no es arreglar el test.
    expect(uidDeReserva("UEDA-7F3K2")).toBe(
      "reserva-UEDA-7F3K2@reservas-laboratorio-ueda.vercel.app",
    );
  });

  it("usa el detalle libre cuando la actividad es OTRO", () => {
    const ics = construirIcs({
      metodo: "REQUEST",
      ...BASE,
      reserva: {
        ...RESERVA,
        activityType: "OTRO",
        activityTypeOther: "Maratón de programación",
      },
    });

    expect(propiedad(ics, "SUMMARY:")).toContain("Maratón de programación");
  });

  /*
   * §3.3.11: en un valor TEXT hay que escapar barra invertida, punto y coma,
   * coma y salto de línea. Sin esto, una coma en el nombre de la actividad
   * —que lo escribe cualquiera desde el formulario público— parte la
   * propiedad en dos y el cliente descarta el evento entero.
   */
  it("escapa los caracteres que separan valores", () => {
    const ics = construirIcs({
      metodo: "REQUEST",
      ...BASE,
      reserva: {
        ...RESERVA,
        activityType: "OTRO",
        activityTypeOther: "Taller: datos, IA; y algo\\raro\ncon salto",
      },
    });

    const resumen = propiedad(ics, "SUMMARY:")!;
    expect(resumen).toContain("datos\\, IA\\; y algo\\\\raro\\ncon salto");
    // El salto escapado no puede haber creado una línea de verdad.
    expect(desplegar(ics).filter((l) => l.startsWith("SUMMARY"))).toHaveLength(1);
  });

  /*
   * §3.1: ninguna línea pasa de 75 octetos. Se mide en octetos y no en
   * caracteres porque la «ó» de «Amigó» ocupa dos bytes, y un corte a mitad de
   * carácter le entrega UTF-8 inválido al cliente de calendario.
   */
  it("pliega las líneas largas sin partir un carácter multibyte", () => {
    const ics = construirIcs({
      metodo: "REQUEST",
      ...BASE,
      reserva: {
        ...RESERVA,
        roomName: `Laboratorio de Análisis Numérico ${"ó".repeat(60)} Sede Medellín`,
      },
    });

    for (const linea of ics.split("\r\n")) {
      expect(Buffer.from(linea, "utf8").length).toBeLessThanOrEqual(75);
    }
    // Y desplegado vuelve a leerse entero, sin caracteres de reemplazo.
    expect(propiedad(ics, "SUMMARY:")).toContain("ó".repeat(60));
    expect(ics).not.toContain("�");
  });

  it("todas las líneas terminan en CRLF, incluida la última", () => {
    const ics = construirIcs({ metodo: "REQUEST", ...BASE });

    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });
});

describe("metodoDelIcs", () => {
  it("lee el método del propio contenido", () => {
    expect(metodoDelIcs(construirIcs({ metodo: "REQUEST", ...BASE }))).toBe(
      "REQUEST",
    );
    expect(metodoDelIcs(construirIcs({ metodo: "CANCEL", ...BASE }))).toBe(
      "CANCEL",
    );
  });

  it("devuelve null si no hay método declarado", () => {
    expect(metodoDelIcs("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n")).toBeNull();
  });

  /*
   * No puede confundir una descripción que MENCIONE el método con la
   * propiedad: el texto del solicitante acaba dentro del ICS.
   */
  it("no se deja engañar por el texto de una propiedad", () => {
    const ics = "BEGIN:VCALENDAR\r\nDESCRIPTION:METHOD:CANCEL\r\nEND:VCALENDAR\r\n";
    expect(metodoDelIcs(ics)).toBeNull();
  });
});
