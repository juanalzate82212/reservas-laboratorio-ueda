import {
  labelForAcademicProgram,
  labelForActivityType,
} from "@/config/reservationOptions";
import { formatRange } from "@/lib/datetime";

/*
 * Tres plantillas del §7 del plan. HTML con estilos inline a propósito: los
 * clientes de correo no soportan Tailwind ni hojas de estilo externas.
 *
 * Todo valor que viene del solicitante (nombre, detalle de "otro", nota del
 * admin) pasa por escapeHtml antes de interpolarse: ese texto lo escribió una
 * persona externa por el formulario público, y este HTML no solo se manda
 * por correo — también se guarda en EmailLog y se previsualiza en
 * /admin/correos. Sin escapar, una reserva con un nombre malicioso podría
 * ejecutar código en la sesión del admin que abre la vista previa.
 */
const COLOR = {
  primary: "#007B99",
  texto: "#2E2E2E",
  textoSecundario: "#848585",
  borde: "#E1E1E1",
  superficie: "#F5F5F5",
  fondo: "#FFFFFF",
  accent: "#F39200",
} as const;

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tablaDatos(filas: Array<[string, string]>): string {
  const celdas = filas
    .map(
      ([etiqueta, valor]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:${COLOR.textoSecundario};font-size:13px;width:38%;vertical-align:top;">${escapeHtml(etiqueta)}</td>
          <td style="padding:6px 0;color:${COLOR.texto};font-size:15px;vertical-align:top;">${escapeHtml(valor)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${celdas}</table>`;
}

function layout({ titulo, cuerpoHtml }: { titulo: string; cuerpoHtml: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:${COLOR.superficie};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR.superficie};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:${COLOR.fondo};border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:${COLOR.primary};padding:24px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Laboratorio de Estrategia del Dato y Analítica</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:${COLOR.texto};font-size:15px;line-height:1.5;">
                <h1 style="margin:0 0 16px;font-size:20px;color:${COLOR.texto};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(titulo)}</h1>
                ${cuerpoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${COLOR.borde};color:${COLOR.textoSecundario};font-size:12px;">
                Formación humana y profesional al servicio del desarrollo y la transformación social.
                ${appUrl ? `<br/><a href="${escapeHtml(appUrl)}" style="color:${COLOR.primary};">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface TemplateReservation {
  code: string;
  roomName: string;
  startsAt: Date;
  endsAt: Date;
  requesterName: string;
  academicProgram: string;
  activityType: string;
  activityTypeOther: string | null;
  attendees: number;
  adminNote?: string | null;
}

function actividadLegible(r: TemplateReservation): string {
  return r.activityType === "OTRO" && r.activityTypeOther
    ? r.activityTypeOther
    : labelForActivityType(r.activityType);
}

function datosComunes(r: TemplateReservation): Array<[string, string]> {
  return [
    ["Código", r.code],
    ["Sala", r.roomName],
    ["Horario", formatRange(r.startsAt, r.endsAt)],
    ["Solicitante", r.requesterName],
    ["Programa académico", labelForAcademicProgram(r.academicProgram)],
    ["Tipo de actividad", actividadLegible(r)],
    ["Asistentes estimados", String(r.attendees)],
  ];
}

export function confirmTemplate(
  r: TemplateReservation,
  avisoEquipos?: string | null,
): { subject: string; html: string } {
  const subject = `Reserva confirmada — ${r.roomName}, ${formatRange(r.startsAt, r.endsAt)}`;

  const aviso = avisoEquipos
    ? `<div style="margin:16px 0;padding:12px 16px;border:1px solid ${COLOR.accent};background-color:#FDE6C7;border-radius:6px;">
        <strong style="color:${COLOR.texto};">Aviso:</strong>
        <span style="color:${COLOR.texto};"> ${escapeHtml(avisoEquipos)}</span>
      </div>`
    : "";

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">Tu solicitud fue aprobada. El espacio queda reservado con estos datos:</p>
    ${tablaDatos(datosComunes(r))}
    ${aviso}
    <p style="margin:16px 0 0;color:${COLOR.textoSecundario};font-size:13px;">Guarda el código de tu reserva para consultarla más adelante.</p>
  `;

  return { subject, html: layout({ titulo: "Reserva confirmada", cuerpoHtml }) };
}

export function rejectTemplate(r: TemplateReservation): { subject: string; html: string } {
  const subject = `Solicitud de reserva no aprobada — ${r.roomName}, ${formatRange(r.startsAt, r.endsAt)}`;

  const nota = r.adminNote
    ? `<p style="margin:16px 0 0;">${escapeHtml(r.adminNote)}</p>`
    : "";

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">Tu solicitud para este horario no fue aprobada:</p>
    ${tablaDatos(datosComunes(r))}
    ${nota}
    <p style="margin:16px 0 0;">Puedes revisar la disponibilidad y enviar una nueva solicitud para otro horario cuando quieras.</p>
  `;

  return { subject, html: layout({ titulo: "Solicitud no aprobada", cuerpoHtml }) };
}

export function cancelTemplate(r: TemplateReservation): { subject: string; html: string } {
  const subject = `Reserva cancelada — ${r.roomName}, ${formatRange(r.startsAt, r.endsAt)}`;

  const nota = r.adminNote
    ? `<p style="margin:16px 0 0;">${escapeHtml(r.adminNote)}</p>`
    : "";

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">Lamentamos informarte que tu reserva confirmada fue cancelada:</p>
    ${tablaDatos(datosComunes(r))}
    ${nota}
    <p style="margin:16px 0 0;">Puedes solicitar otro horario disponible cuando lo necesites.</p>
  `;

  return { subject, html: layout({ titulo: "Reserva cancelada", cuerpoHtml }) };
}
