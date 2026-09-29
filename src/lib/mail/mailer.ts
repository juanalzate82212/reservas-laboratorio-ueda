import nodemailer from "nodemailer";

import { prisma } from "@/lib/db";
import {
  buzonConfigurado,
  direccionDelBuzon,
  resolverBuzon,
  type Buzon,
} from "./buzones";
import {
  construirIcs,
  metodoDelIcs,
  type MetodoIcs,
  type PersonaIcs,
  type ReservaIcs,
} from "./ics";

/*
 * El correo nunca bloquea la transición de estado (§7 del plan): esta
 * función siempre resuelve, nunca lanza. Orden: intentar enviar → registrar
 * en EmailLog (SENT/FAILED/LOGGED). Quien llama decide qué hacer con el
 * resultado, pero la reserva ya quedó escrita en BD antes de llegar aquí.
 *
 * Sin SMTP_HOST o sin SMTP_PASSWORD (typicamente antes de tramitar la
 * contraseña de aplicación de Google, §10.2), no intenta conectarse: escribe
 * el correo en consola y lo guarda igual en EmailLog con estado LOGGED. Así
 * el flujo completo es demostrable sin credenciales reales.
 */

export type MailStatus = "SENT" | "FAILED" | "LOGGED";

function crearTransporte(buzon: Buzon) {
  return nodemailer.createTransport({
    host: buzon.host,
    port: buzon.port,
    secure: buzon.secure,
    auth: { user: buzon.user, pass: buzon.pass },
  });
}

export interface EnviarCorreoInput {
  reservationId: string;
  /**
   * De qué laboratorio es este correo.
   *
   * Sin esto /admin/correos no se puede acotar, y el encargado de un
   * laboratorio vería su pantalla de correos VACÍA: el filtro por sala falla
   * cerrado a propósito, porque el cuerpo del correo lleva el nombre y los
   * datos del solicitante. En la fase 4 esta misma sala decidirá además POR QUÉ
   * BUZÓN sale el correo.
   */
  roomId: string;
  /**
   * Con qué clave se resuelve el buzón remitente (Room.mailKey).
   *
   * Viaja junto al roomId en vez de deducirse con una consulta aquí dentro:
   * quien llama ya tiene la sala cargada, y con connection_limit=1 una consulta
   * de más por correo se paga. Redundante a la vista, explícito a propósito.
   */
  mailKey: string;
  to: string;
  subject: string;
  html: string;
  /**
   * Invitación de calendario a adjuntar, si el correo lleva una.
   *
   * Se pasa DESCRITA y no ya construida a propósito: el ORGANIZER tiene que
   * ser la cuenta que envía y los invitados incluyen el buzón de avisos del
   * laboratorio, y las dos cosas solo se saben aquí dentro, después de
   * resolver el buzón. Si la armara quien llama, cada handler tendría que
   * resolver el buzón por su cuenta para acertar con el remitente.
   */
  invitacion?: DescripcionInvitacion;
}

export interface DescripcionInvitacion {
  metodo: MetodoIcs;
  reserva: ReservaIcs;
  solicitante: { nombre: string; correo: string };
}

/*
 * Arma el `.ics` con el buzón ya resuelto.
 *
 * Devuelve `undefined` —y NO lanza— si el buzón no tiene un remitente
 * utilizable: una invitación sin ORGANIZER válido es peor que ninguna, porque
 * Gmail la degrada a adjunto y el solicitante recibe un fichero suelto que no
 * sabe qué hacer con él. El correo sale igual, solo que sin invitación.
 *
 * ⚠️ El buzón de avisos va como invitado ADEMÁS del solicitante, y la
 * invitación es IDÉNTICA en las dos copias del correo (mismo UID, misma lista).
 * Es lo que hace que el evento caiga en el calendario del laboratorio: estar
 * listado como ATTENDEE en la copia del solicitante no le entrega nada.
 */
function armarIcs(
  buzon: Buzon,
  invitacion: DescripcionInvitacion,
): string | undefined {
  const organizador = direccionDelBuzon(buzon);
  if (!organizador) {
    console.warn(
      `[correo] El buzón «${buzon.mailKey}» no tiene un MAIL_FROM utilizable: se omite la invitación de calendario.`,
    );
    return undefined;
  }

  const invitados: PersonaIcs[] = [
    {
      nombre: invitacion.solicitante.nombre,
      correo: invitacion.solicitante.correo,
    },
  ];
  if (buzon.avisosA && buzon.avisosA !== invitacion.solicitante.correo) {
    /*
     * ⚠️ La colisión que costó tres intentos. Si el buzón de avisos es la
     * MISMA dirección que el remitente, el laboratorio figura a la vez como
     * ORGANIZER y como ATTENDEE, y entonces no recibe nada: un cliente de
     * calendario no le entrega a nadie un evento del que ya es dueño. No es
     * una rareza de Gmail, es cómo está pensado iMIP —el organizador ya
     * debería tenerlo—, y se comprobó con envíos reales que no hay método que
     * lo salve: ni REQUEST ni PUBLISH.
     *
     * Se avisa y se sigue: el invitado se añade igual porque la copia del
     * SOLICITANTE sí es válida, y quitarlo no arreglaría la del laboratorio.
     * Lo que no puede es volver a pasar en silencio.
     */
    if (buzon.avisosA === organizador) {
      console.warn(
        `[correo] MAIL_TO_ADMIN de «${buzon.mailKey}» es la misma dirección que el remitente (${organizador}): el laboratorio NO recibirá el evento en su calendario. Apúntalo a una dirección distinta.`,
      );
    }
    invitados.push({ nombre: null, correo: buzon.avisosA });
  }

  return construirIcs({
    metodo: invitacion.metodo,
    reserva: invitacion.reserva,
    organizador: { correo: organizador },
    invitados,
  });
}

/**
 * A dónde va la respuesta si el destinatario pulsa Responder.
 *
 * Existe porque el remitente dejó de ser el laboratorio: todos los correos
 * salen de una única cuenta institucional para que el ORGANIZER de las
 * invitaciones no coincida nunca con ningún destinatario. Sin `Reply-To`, un
 * estudiante que responda a su confirmación le escribiría al administrador de
 * sistemas en lugar de al laboratorio que le atiende.
 *
 * No se pone cuando el destinatario ES el buzón del laboratorio: pedirle que
 * se responda a sí mismo no aporta nada.
 */
function responderA(buzon: Buzon, destinatario: string) {
  return buzon.avisosA && buzon.avisosA !== destinatario
    ? { replyTo: buzon.avisosA }
    : {};
}

/*
 * El adjunto que entiende nodemailer. El `method` va en el Content-Type y es
 * lo que hace que Gmail pinte los botones de respuesta en lugar de un fichero
 * adjunto; se lee del propio contenido para que los dos no puedan discrepar.
 */
function adjuntoIcs(ics: string | undefined) {
  const metodo = ics ? metodoDelIcs(ics) : null;
  if (!ics || !metodo) return {};
  return {
    icalEvent: { method: metodo, filename: "invitacion.ics", content: ics },
  };
}

export async function enviarCorreo({
  reservationId,
  roomId,
  mailKey,
  to,
  subject,
  html,
  invitacion,
}: EnviarCorreoInput): Promise<MailStatus> {
  const buzon = resolverBuzon(mailKey);
  const fromAddress = buzon.from ?? null;
  const ics = invitacion ? armarIcs(buzon, invitacion) : undefined;

  if (!buzonConfigurado(buzon)) {
    console.log(`[correo:LOGGED] Para: ${to}\nAsunto: ${subject}`);
    if (invitacion) {
      console.log(`[correo:LOGGED] Llevaba invitacion ${invitacion.metodo}.`);
    }
    await prisma.emailLog.create({
      data: {
        reservationId,
        roomId,
        fromAddress,
        to,
        subject,
        body: html,
        status: "LOGGED",
      },
    });
    return "LOGGED";
  }

  try {
    await crearTransporte(buzon).sendMail({
      from: buzon.from,
      to,
      ...responderA(buzon, to),
      subject,
      html,
      ...adjuntoIcs(ics),
    });
    await prisma.emailLog.create({
      data: {
        reservationId,
        roomId,
        fromAddress,
        to,
        subject,
        body: html,
        status: "SENT",
      },
    });
    return "SENT";
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error desconocido al enviar el correo.";
    await prisma.emailLog.create({
      data: {
        reservationId,
        roomId,
        fromAddress,
        to,
        subject,
        body: html,
        status: "FAILED",
        error: mensaje,
      },
    });
    return "FAILED";
  }
}

/*
 * Avisos internos al laboratorio (no al solicitante). La dirección va en su
 * propia variable y no se deduce de MAIL_FROM/SMTP_USER: quién envía y quién
 * recibe los avisos no tienen por qué ser la misma cuenta, y atarlos obligaría
 * a cambiar el remitente de todos los correos para redirigir los avisos.
 *
 * Sin MAIL_TO_ADMIN no se manda nada y se deja constancia en consola —
 * preferible a inventar un destinatario. Devuelve null en ese caso, para que
 * quien llama pueda distinguir "no configurado" de "falló el envío".
 */
export async function enviarCorreoAlLaboratorio(
  input: Omit<EnviarCorreoInput, "to">,
): Promise<MailStatus | null> {
  const destino = resolverBuzon(input.mailKey).avisosA;
  if (!destino) {
    console.warn(
      `[correo] MAIL_TO_ADMIN sin configurar para «${input.mailKey}»: se omite el aviso al laboratorio «${input.subject}».`,
    );
    return null;
  }
  return enviarCorreo({ ...input, to: destino });
}

/*
 * Qué invitación le toca HOY a una reserva, para un reintento.
 *
 * ⚠️ Se re-deriva del estado ACTUAL de la reserva en vez de guardarse el `.ics`
 * original en EmailLog, y no es por ahorrarse una columna. Reenviar la
 * invitación tal cual se mandó volvería a crear en los calendarios un evento
 * que quizá ya se canceló: el reintento resucitaría la reserva en la agenda
 * del solicitante mientras en la aplicación figura como cancelada.
 *
 * Solo CONFIRMED y CANCELLED tienen invitación. Una PENDING nunca llegó a
 * tener evento, y REJECTED/EXPIRED vienen de PENDING, así que tampoco.
 *
 * ⚠️ Limitación conocida: el reintento reenvía el HTML tal como se guardó,
 * así que si la reserva cambió de estado entre el envío original y el
 * reintento, el texto del correo puede contradecir a la invitación que lo
 * acompaña. Es un defecto que ya tenía el reintento —el cuerpo siempre fue una
 * copia literal— y el `.ics` se limita a no empeorarlo.
 */
async function invitacionDeReserva(
  reservationId: string | null,
): Promise<DescripcionInvitacion | undefined> {
  if (!reservationId) return undefined;

  const reserva = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      code: true,
      status: true,
      startsAt: true,
      endsAt: true,
      activityType: true,
      activityTypeOther: true,
      requesterName: true,
      requesterEmail: true,
      room: { select: { name: true } },
    },
  });
  if (!reserva) return undefined;

  const metodo: MetodoIcs | null =
    reserva.status === "CONFIRMED"
      ? "REQUEST"
      : reserva.status === "CANCELLED"
        ? "CANCEL"
        : null;
  if (!metodo) return undefined;

  return {
    metodo,
    reserva: {
      code: reserva.code,
      roomName: reserva.room.name,
      startsAt: reserva.startsAt,
      endsAt: reserva.endsAt,
      activityType: reserva.activityType,
      activityTypeOther: reserva.activityTypeOther,
    },
    solicitante: {
      nombre: reserva.requesterName,
      correo: reserva.requesterEmail,
    },
  };
}

/**
 * Reintenta un EmailLog existente con el mismo contenido, actualizando esa
 * misma fila.
 *
 * ⚠️ El buzón se re-resuelve desde el LABORATORIO DEL REGISTRO, no del
 * entorno global. Antes leía `process.env.MAIL_FROM` en caliente: con un solo
 * buzón eso solo significaba que un reintento podía salir con un remitente
 * distinto al original si la variable había cambiado; con dos laboratorios
 * significaría enviar el correo de uno DESDE LA CUENTA DEL OTRO, y sin dejar
 * constancia.
 *
 * Un registro sin `roomId` (anterior al backfill de la fase 1, o sin reserva
 * asociada) no se puede atribuir a ningún buzón, así que no se reintenta.
 */
export async function reintentarCorreo(id: string): Promise<MailStatus | null> {
  const log = await prisma.emailLog.findUnique({ where: { id } });
  if (!log) return null;

  if (!log.roomId) {
    console.warn(
      `[correo] El registro ${id} no tiene laboratorio: no se puede reintentar.`,
    );
    return null;
  }

  // Secuencial, nunca en Promise.all (connection_limit=1).
  const sala = await prisma.room.findUnique({
    where: { id: log.roomId },
    select: { mailKey: true },
  });
  if (!sala) {
    console.warn(`[correo] El laboratorio del registro ${id} ya no existe.`);
    return null;
  }

  const buzon = resolverBuzon(sala.mailKey);
  const fromAddress = buzon.from ?? null;

  // Tercera consulta seguida, nunca en Promise.all: connection_limit=1.
  const invitacion = await invitacionDeReserva(log.reservationId);
  const ics = invitacion ? armarIcs(buzon, invitacion) : undefined;

  if (!buzonConfigurado(buzon)) {
    console.log(
      `[correo:LOGGED] Reintento para: ${log.to}\nAsunto: ${log.subject}`,
    );
    await prisma.emailLog.update({
      where: { id },
      data: { status: "LOGGED", error: null, fromAddress, sentAt: new Date() },
    });
    return "LOGGED";
  }

  try {
    await crearTransporte(buzon).sendMail({
      from: buzon.from,
      to: log.to,
      ...responderA(buzon, log.to),
      subject: log.subject,
      html: log.body,
      ...adjuntoIcs(ics),
    });
    await prisma.emailLog.update({
      where: { id },
      data: { status: "SENT", error: null, fromAddress, sentAt: new Date() },
    });
    return "SENT";
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error desconocido al enviar el correo.";
    await prisma.emailLog.update({
      where: { id },
      data: {
        status: "FAILED",
        error: mensaje,
        fromAddress,
        sentAt: new Date(),
      },
    });
    return "FAILED";
  }
}
