import {
  PrismaClient,
  type AcademicProgram,
  type ActivityType,
  type ReservationStatus,
} from "@prisma/client";
import { addDays } from "date-fns";

import type { RequesterRoleValue } from "../src/config/reservationOptions";
import { fromBogota, isOpenDay, toBogotaDayKey } from "../src/lib/datetime";
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

  const [lunes, martes, miercoles, jueves] = proximosDiasHabiles(4);
  console.log(`Sembrando sobre los días: ${[lunes, martes, miercoles, jueves].join(", ")}`);

  // --- Salas (idempotentes: la migración no debe perderlas) ---
  // `capacity` no es decorativo: es el tope de asistentes que valida el
  // formulario y POST /api/reservations. Ojo con `update: {}` — si la fila ya
  // existe, la semilla NO la toca, así que cambiar el aforo aquí solo sirve
  // para una base nueva; en una que ya tiene la sala hay que actualizarla
  // aparte.
  const salaPrincipal = await prisma.room.upsert({
    where: { slug: "sala-principal" },
    update: {},
    create: {
      slug: "sala-principal",
      name: "Sala Principal",
      description: "Sala amplia con equipos de cómputo para prácticas y clases.",
      capacity: 25,
      hasComputers: true,
      colorToken: "azul",
    },
  });

  // --- Datos de demo: se regeneran en cada ejecución ---
  await prisma.reservation.deleteMany();
  await prisma.timeBlock.deleteMany();

  // Decisión de producto: solo Sala Principal es reservable. La sala de
  // reuniones se retira del todo (ver CLAUDE.md) — sus reservas de demo ya
  // se borraron arriba, así que la fila puede eliminarse sin violar la FK.
  await prisma.room.deleteMany({ where: { slug: "sala-reuniones" } });

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
      roomId: salaPrincipal.id,
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
      roomId: salaPrincipal.id,
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
      roomId: salaPrincipal.id,
      dia: martes,
      desde: "09:00",
      hasta: "11:00",
      status: "PENDING",
      requesterName: "Laura Gómez Sierra",
      requesterRole: "ESTUDIANTE",
      requesterDocId: "1098765432",
      requesterEmail: "laura.gomez@amigo.edu.co",
      academicProgram: "TECNOLOGIA_DESARROLLO_SOFTWARE",
      activityType: "TALLER",
      attendees: 12,
    },
    {
      roomId: salaPrincipal.id,
      dia: martes,
      desde: "14:00",
      hasta: "16:00",
      status: "REJECTED",
      requesterName: "Julián Ospina Marín",
      requesterRole: "ESTUDIANTE",
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
      roomId: salaPrincipal.id,
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
      roomId: salaPrincipal.id,
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

  // Bloqueo duro y global (roomId null = todas las salas).
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
      roomId: salaPrincipal.id,
      startsAt: fromBogota(martes, "13:00"),
      endsAt: fromBogota(martes, "17:00"),
      kind: "WARNING",
      reason: "Sin préstamo de equipos de cómputo esta tarde.",
    },
  });

  const [salas, totalReservas, bloqueos] = await Promise.all([
    prisma.room.count(),
    prisma.reservation.count(),
    prisma.timeBlock.count(),
  ]);

  console.log(
    `Listo: ${salas} salas, ${totalReservas} reservas, ${bloqueos} bloqueos.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
