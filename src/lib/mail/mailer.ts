import nodemailer from "nodemailer";

import { prisma } from "@/lib/db";

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

function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PASSWORD);
}

function crearTransporte() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export interface EnviarCorreoInput {
  reservationId: string;
  to: string;
  subject: string;
  html: string;
}

export async function enviarCorreo({
  reservationId,
  to,
  subject,
  html,
}: EnviarCorreoInput): Promise<MailStatus> {
  if (!smtpConfigurado()) {
    console.log(`[correo:LOGGED] Para: ${to}\nAsunto: ${subject}`);
    await prisma.emailLog.create({
      data: { reservationId, to, subject, body: html, status: "LOGGED" },
    });
    return "LOGGED";
  }

  try {
    await crearTransporte().sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
    await prisma.emailLog.create({
      data: { reservationId, to, subject, body: html, status: "SENT" },
    });
    return "SENT";
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error desconocido al enviar el correo.";
    await prisma.emailLog.create({
      data: { reservationId, to, subject, body: html, status: "FAILED", error: mensaje },
    });
    return "FAILED";
  }
}

/** Reintenta un EmailLog existente con el mismo contenido, actualizando esa misma fila. */
export async function reintentarCorreo(id: string): Promise<MailStatus | null> {
  const log = await prisma.emailLog.findUnique({ where: { id } });
  if (!log) return null;

  if (!smtpConfigurado()) {
    console.log(`[correo:LOGGED] Reintento para: ${log.to}\nAsunto: ${log.subject}`);
    await prisma.emailLog.update({
      where: { id },
      data: { status: "LOGGED", error: null, sentAt: new Date() },
    });
    return "LOGGED";
  }

  try {
    await crearTransporte().sendMail({
      from: process.env.MAIL_FROM,
      to: log.to,
      subject: log.subject,
      html: log.body,
    });
    await prisma.emailLog.update({
      where: { id },
      data: { status: "SENT", error: null, sentAt: new Date() },
    });
    return "SENT";
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error desconocido al enviar el correo.";
    await prisma.emailLog.update({
      where: { id },
      data: { status: "FAILED", error: mensaje, sentAt: new Date() },
    });
    return "FAILED";
  }
}
