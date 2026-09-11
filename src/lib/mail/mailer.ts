import nodemailer from "nodemailer";

import { prisma } from "@/lib/db";
import { buzonConfigurado, resolverBuzon, type Buzon } from "./buzones";

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
}

export async function enviarCorreo({
  reservationId,
  roomId,
  mailKey,
  to,
  subject,
  html,
}: EnviarCorreoInput): Promise<MailStatus> {
  const buzon = resolverBuzon(mailKey);
  const fromAddress = buzon.from ?? null;

  if (!buzonConfigurado(buzon)) {
    console.log(`[correo:LOGGED] Para: ${to}\nAsunto: ${subject}`);
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
      subject,
      html,
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
      subject: log.subject,
      html: log.body,
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
