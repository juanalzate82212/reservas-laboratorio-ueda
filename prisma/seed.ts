import {
  PrismaClient,
  type AcademicProgram,
  type ActivityType,
  type ReservationStatus,
} from "@prisma/client";
import { addDays } from "date-fns";

import type { RequesterRoleValue } from "../src/config/reservationOptions";
import { fromBogota, isOpenDay, toBogotaDayKey } from "../src/lib/datetime";
import { hashPassword } from "../src/lib/password";
import { generateReservationCode } from "../src/lib/reservation-code";

/*
 * Datos de demostración. Se ancla a los próximos días hábiles para que la
 * semilla siga siendo útil dentro de un mes: si se fijaran fechas absolutas,
 * al poco tiempo todo quedaría en el pasado y el calendario aparecería vacío.
 */
const prisma = new PrismaClient();

/** Claves de día ("2026-08-03") de los próximos `cantidad` días abiertos. */
function proximosDiasHabiles(cantidad: number): string[] {
  const dias: string[] = [];
  let cursor = addDays(new Date(), 1);

  while (dias.length < cantidad) {
    if (isOpenDay(cursor)) dias.push(toBogotaDayKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return dias;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "La semilla borra reservas y bloqueos. No ejecutar contra producción.",
    );
  }

  /*
   * El guard de arriba NO basta y está documentado en CLAUDE.md: comprueba
   * NODE_ENV, que en una terminal local nunca vale "production" aunque la
   * cadena de conexión apunte a la base real. Esto mira a DÓNDE se va a
   * escribir, que es lo que de verdad importa.
   */
  const REF_PRODUCCION = "ceqqzubsxxuroawcnpvg";
  const destino = `${process.env.DATABASE_URL ?? ""} ${process.env.DIRECT_URL ?? ""}`;
  if (destino.includes(REF_PRODUCCION)) {
    throw new Error(
      `La semilla borra Reservation y TimeBlock completas y el .env apunta al proyecto de PRODUCCIÓN (${REF_PRODUCCION}). Abortando.`,
    );
  }

  const [lunes, martes, miercoles, jueves] = proximosDiasHabiles(4);
  console.log(
    `Sembrando sobre los días: ${[lunes, martes, miercoles, jueves].join(", ")}`,
  );

  // --- Laboratorios (idempotentes: la migración no debe perderlos) ---
  //
  // El laboratorio ES la sala (ver PLAN-MULTI-LAB.md): dar de alta uno nuevo es
  // una fila más aquí, más sus variables SMTP_<mailKey>_*.
  //
  // `capacity` no es decorativo: es el tope de asistentes que valida el
  // formulario y POST /api/reservations. Ojo con `update: {}` — si la fila ya
  // existe, la semilla NO la toca, así que cambiar el aforo aquí solo sirve
  // para una base nueva; en una que ya lo tiene hay que actualizarlo aparte.
  const analitica = await prisma.room.upsert({
    where: { slug: "analitica-datos-ia" },
    update: {},
    create: {
      slug: "analitica-datos-ia",
      name: "Laboratorio de Analítica de Datos e Inteligencia Artificial",
      shortName: "Analítica de Datos e IA",
      description:
        "Laboratorio con equipos de cómputo para prácticas, talleres, evaluaciones y semilleros de investigación.",
      capacity: 25,
      hasComputers: true,
      colorToken: "azul",
      isActive: true,
      mailKey: "ANALITICA",
      mailFromName:
        "Laboratorio de Analítica de Datos e Inteligencia Artificial",
      contactEmail: "lab.analitica@amigo.edu.co",
    },
  });

  /*
   * Activo desde la fase 2: ya existe el portal, y la portada dejó de ser el
   * calendario de un laboratorio concreto, así que añadir uno nuevo ya no
   * puede cambiar en silencio lo que ve el público.
   *
   * El aforo y el correo de contacto siguen pendientes de confirmar con el
   * laboratorio.
   */
  const redes = await prisma.room.upsert({
    where: { slug: "redes-infraestructura" },
    update: {},
    create: {
      slug: "redes-infraestructura",
      name: "Laboratorio de Redes e Infraestructura",
      shortName: "Redes e Infraestructura",
      description:
        "Laboratorio para prácticas de redes, conectividad e infraestructura tecnológica.",
      capacity: 25,
      hasComputers: true,
      colorToken: "azul",
      isActive: true,
      mailKey: "REDES",
      mailFromName: "Laboratorio de Redes e Infraestructura",
    },
  });

  // --- Datos de demo: se regeneran en cada ejecución ---
  await prisma.reservation.deleteMany();
  await prisma.timeBlock.deleteMany();

  /*
   * Aquí había un `room.deleteMany({ where: { slug: "sala-reuniones" } })`.
   * Se retiró al pasar a multi-laboratorio: ahora cada fila de Room es un
   * laboratorio real, y una semilla que borre salas por slug es una forma
   * silenciosa de tirar un laboratorio entero con sus datos.
   */

  const reservas: Array<{
    roomId: string;
    dia: string;
    desde: string;
    hasta: string;
    status: ReservationStatus;
    requesterName: string;
    // Tipado contra la lista de config y no `string`: la semilla debe generar
    // los mismos valores que el formulario, no etiquetas legibles.
    requesterRole: RequesterRoleValue;
    requesterDocId: string;
    requesterEmail: string;
    academicProgram: AcademicProgram;
    activityType: ActivityType;
    activityTypeOther?: string;
    attendees: number;
    adminNote?: string;
  }> = [
    {
      roomId: analitica.id,
      dia: lunes,
      desde: "08:00",
      hasta: "10:00",
      status: "CONFIRMED",
      requesterName: "Ana María Restrepo",
      requesterRole: "DOCENTE",
      requesterDocId: "1017234567",
      requesterEmail: "ana.restrepo@amigo.edu.co",
      academicProgram: "INGENIERIA_SISTEMAS",
      activityType: "CLASE_PRACTICA",
      attendees: 18,
    },
    {
      roomId: analitica.id,
      dia: lunes,
      desde: "13:00",
      hasta: "15:00",
      status: "PENDING",
      requesterName: "Carlos Andrés Vélez",
      requesterRole: "COORDINADOR",
      requesterDocId: "71234567",
      requesterEmail: "carlos.velez@amigo.edu.co",
      academicProgram: "ESPECIALIZACION_BIG_DATA_BI",
      activityType: "SEMILLERO_INVESTIGACION",
      attendees: 6,
    },
    {
      roomId: analitica.id,
      dia: martes,
      desde: "09:00",
      hasta: "11:00",
      status: "PENDING",
      requesterName: "Laura Gómez Sierra",
      requesterRole: "INVESTIGADOR",
      requesterDocId: "1098765432",
      requesterEmail: "laura.gomez@amigo.edu.co",
      academicProgram: "TECNOLOGIA_DESARROLLO_SOFTWARE",
      activityType: "TALLER",
      attendees: 12,
    },
    {
      roomId: analitica.id,
      dia: martes,
      desde: "14:00",
      hasta: "16:00",
      status: "REJECTED",
      requesterName: "Julián Ospina Marín",
      requesterRole: "DOCENTE",
      requesterDocId: "1020304050",
      requesterEmail: "julian.ospina@amigo.edu.co",
      academicProgram: "INGENIERIA_CIVIL",
      activityType: "OTRO",
      activityTypeOther: "Ensayo de presentación de tesis.",
      attendees: 4,
      adminNote:
        "Esa franja está reservada para mantenimiento de los equipos. Puedes solicitarla el miércoles en el mismo horario.",
    },
    {
      roomId: analitica.id,
      dia: miercoles,
      desde: "08:00",
      hasta: "12:00",
      status: "CONFIRMED",
      requesterName: "Diana Patricia Muñoz",
      requesterRole: "INVESTIGADOR",
      requesterDocId: "43567890",
      requesterEmail: "diana.munoz@amigo.edu.co",
      academicProgram: "ARQUITECTURA",
      activityType: "PROYECTO_AULA",
      attendees: 5,
    },
    {
      roomId: analitica.id,
      dia: miercoles,
      desde: "13:00",
      hasta: "14:00",
      status: "CANCELLED",
      requesterName: "Santiago Arango Ruiz",
      requesterRole: "DOCENTE",
      requesterDocId: "8123456",
      requesterEmail: "santiago.arango@amigo.edu.co",
      academicProgram: "INGENIERIA_SISTEMAS_APARTADO",
      activityType: "EVALUACION",
      attendees: 20,
      adminNote: "Se canceló por jornada institucional.",
    },

    /*
     * --- Laboratorio de Redes e Infraestructura ---
     *
     * ⚠️ `lunes`/`martes`/`miercoles`/`jueves` son nombres POSICIONALES: son
     * los cuatro próximos días hábiles, no esos días de la semana. Sembrando un
     * lunes, `lunes` cae en martes.
     *
     * Las horas se eligen a propósito para que el AISLAMIENTO se vea de un
     * vistazo, no solo se pueda deducir: el primer día, Redes ocupa
     * 09:00–11:00 y Analítica 08:00–10:00 — se pisan en reloj y los dos
     * calendarios siguen siendo independientes. Sirve también para comprobar a
     * ojo la fase 3, en la que cada encargado solo debe ver lo suyo.
     *
     * Ninguna cae en el cuarto día de 08:00 a 12:00: ahí está el bloqueo
     * GLOBAL, que por diseño (roomId null) alcanza a los dos laboratorios.
     */
    {
      roomId: redes.id,
      dia: lunes,
      desde: "09:00",
      hasta: "11:00",
      status: "CONFIRMED",
      requesterName: "Mauricio Betancur Ossa",
      requesterRole: "DOCENTE",
      requesterDocId: "70123456",
      requesterEmail: "mauricio.betancur@amigo.edu.co",
      academicProgram: "INGENIERIA_SISTEMAS",
      activityType: "CLASE_PRACTICA",
      attendees: 22,
    },
    {
      roomId: redes.id,
      dia: lunes,
      desde: "14:00",
      hasta: "16:00",
      status: "PENDING",
      requesterName: "Paula Andrea Jaramillo",
      requesterRole: "COORDINADOR",
      requesterDocId: "1037894561",
      requesterEmail: "paula.jaramillo@amigo.edu.co",
      academicProgram: "TECNOLOGIA_DESARROLLO_SOFTWARE",
      activityType: "TALLER",
      attendees: 14,
    },
    {
      roomId: redes.id,
      dia: martes,
      desde: "08:00",
      hasta: "10:00",
      status: "REJECTED",
      requesterName: "Andrés Felipe Cardona",
      requesterRole: "ADMINISTRATIVO",
      requesterDocId: "8234567",
      requesterEmail: "andres.cardona@amigo.edu.co",
      academicProgram: "INGENIERIA_SISTEMAS_APARTADO",
      activityType: "OTRO",
      activityTypeOther: "Capacitación interna del área de sistemas.",
      attendees: 10,
      adminNote:
        "Esa mañana hay migración del cableado. Puedes solicitarla el mismo día en la tarde.",
    },
    {
      roomId: redes.id,
      dia: miercoles,
      desde: "15:00",
      hasta: "17:00",
      status: "CONFIRMED",
      requesterName: "Natalia Serna Quintero",
      requesterRole: "INVESTIGADOR",
      requesterDocId: "1152903847",
      requesterEmail: "natalia.serna@amigo.edu.co",
      academicProgram: "INGENIERIA_SISTEMAS",
      activityType: "SEMILLERO_INVESTIGACION",
      attendees: 8,
    },
    {
      roomId: redes.id,
      dia: jueves,
      desde: "13:00",
      hasta: "15:00",
      status: "PENDING",
      requesterName: "Sebastián Rivera Duque",
      requesterRole: "DOCENTE",
      requesterDocId: "1019283746",
      requesterEmail: "sebastian.rivera@amigo.edu.co",
      academicProgram: "TECNOLOGIA_DESARROLLO_SOFTWARE",
      activityType: "EVALUACION",
      attendees: 18,
    },
  ];

  for (const r of reservas) {
    await prisma.reservation.create({
      data: {
        code: generateReservationCode(),
        roomId: r.roomId,
        startsAt: fromBogota(r.dia, r.desde),
        endsAt: fromBogota(r.dia, r.hasta),
        status: r.status,
        requesterName: r.requesterName,
        requesterRole: r.requesterRole,
        requesterDocId: r.requesterDocId,
        requesterEmail: r.requesterEmail,
        academicProgram: r.academicProgram,
        activityType: r.activityType,
        activityTypeOther: r.activityTypeOther,
        attendees: r.attendees,
        responsibilityAccepted: true,
        adminNote: r.adminNote,
        decidedAt: r.status === "PENDING" ? null : new Date(),
      },
    });
  }

  /*
   * Bloqueo duro y GLOBAL: roomId null alcanza a TODOS los laboratorios, no
   * solo al de Analítica. Con dos labs eso ya se nota — el cuarto día hábil
   * por la mañana aparece cerrado en los dos calendarios.
   *
   * En la fase 3 este es el único tipo de franja que un LAB_ADMIN NO podrá
   * crear: solo el SUPER_ADMIN, porque afecta a laboratorios que no administra.
   */
  await prisma.timeBlock.create({
    data: {
      roomId: null,
      startsAt: fromBogota(jueves, "08:00"),
      endsAt: fromBogota(jueves, "12:00"),
      kind: "BLOCKED",
      reason: "Mantenimiento preventivo de los equipos de cómputo.",
    },
  });

  // Aviso: la franja SÍ se puede reservar, pero se pinta en naranja.
  await prisma.timeBlock.create({
    data: {
      roomId: analitica.id,
      startsAt: fromBogota(martes, "13:00"),
      endsAt: fromBogota(martes, "17:00"),
      kind: "WARNING",
      reason: "Sin préstamo de equipos de cómputo esta tarde.",
    },
  });

  /*
   * Bloqueo duro que afecta SOLO a Redes, para tener el contraste con el
   * global de arriba. Cae en el tercer día hábil de 08:00 a 12:00, la misma
   * franja en la que Analítica tiene una reserva confirmada: mismo horario, un
   * laboratorio cerrado y el otro ocupado. Es la clase de franja que en la fase
   * 3 sí podrá crear el encargado de Redes por su cuenta.
   */
  await prisma.timeBlock.create({
    data: {
      roomId: redes.id,
      startsAt: fromBogota(miercoles, "08:00"),
      endsAt: fromBogota(miercoles, "12:00"),
      kind: "BLOCKED",
      reason: "Migración del cableado estructurado.",
    },
  });

  /*
   * Primer administrador, para no quedarse fuera del panel al retirar
   * ADMIN_PASSWORD. Es un upsert por correo y NO se borra arriba: las cuentas
   * no son datos de demostración, y resembrar no debe dejar la app sin acceso.
   *
   * La contraseña se toma de ADMIN_PASSWORD, la que ya está en uso. Se guarda
   * hasheada; el texto plano no llega a la base.
   */
  const correoAdmin =
    process.env.SEED_ADMIN_EMAIL ?? "lab.analitica@amigo.edu.co";
  const claveAdmin = process.env.ADMIN_PASSWORD;

  if (claveAdmin) {
    await prisma.adminUser.upsert({
      where: { email: correoAdmin },
      update: {},
      create: {
        email: correoAdmin,
        name: "Administrador general",
        passwordHash: await hashPassword(claveAdmin),
        role: "SUPER_ADMIN",
        roomId: null,
      },
    });
  } else {
    console.warn(
      "ADMIN_PASSWORD sin definir: no se sembró ningún administrador. El panel quedará sin acceso.",
    );
  }

  /*
   * Recuento POR LABORATORIO y no solo el total: con un total agregado, un
   * laboratorio que se quedara sin datos de demostración pasaría inadvertido
   * — que es justo lo que pasó al añadir el segundo.
   *
   * Secuencial, NO Promise.all: con connection_limit=1 estas consultas
   * competirían por la única conexión en vez de esperar turno (ver CLAUDE.md).
   */
  const laboratorios = await prisma.room.findMany({
    select: {
      slug: true,
      isActive: true,
      _count: { select: { reservations: true, timeBlocks: true } },
    },
    orderBy: { slug: "asc" },
  });
  const bloqueosGlobales = await prisma.timeBlock.count({
    where: { roomId: null },
  });
  const admins = await prisma.adminUser.count();

  console.log("");
  console.log("Listo:");
  for (const lab of laboratorios) {
    const estado = lab.isActive ? "activo" : "inactivo";
    console.log(
      `  ${lab.slug} (${estado}): ${lab._count.reservations} reservas, ${lab._count.timeBlocks} franjas propias`,
    );
  }
  console.log(`  franjas globales (afectan a todos): ${bloqueosGlobales}`);
  console.log(`  administradores: ${admins}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
