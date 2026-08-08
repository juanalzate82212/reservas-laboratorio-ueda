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
                <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Laboratorio de Analítica de Datos e Inteligencia Artificial</span>
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

/*
 * "20260914T140000Z" — el formato que pide Google Calendar en `dates`.
 *
 * ⚠️ Recibe el instante UTC real, tal como está en la BD. NO pasar por
 * toBogotaWallClockIso(): ese truco existe solo para el límite con
 * FullCalendar y aquí metería 5 h de desfase en el calendario de quien
 * pulse el botón.
 */
function fechaParaGoogleCalendar(fecha: Date): string {
  return fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/*
 * Enlace de "añadir al calendario" de Google. El separador de `dates` va como
 * "/" literal y sin codificar —es lo que documenta Google y lo que aceptan
 * todos sus ejemplos—; el resto de valores sí se codifican para URL, y el
 * enlace entero se escapa después para meterlo en el href.
 */
function enlaceGoogleCalendar(r: TemplateReservation): string {
  const texto = `${actividadLegible(r)} — Laboratorio de Analítica de Datos e IA`;
  const detalles = `Reserva ${r.code} · ${r.roomName}. Consulta su estado con el código en la página del laboratorio.`;
  const lugar = `Universidad Católica Luis Amigó · ${r.roomName}`;

  const parametros = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(texto)}`,
    `dates=${fechaParaGoogleCalendar(r.startsAt)}/${fechaParaGoogleCalendar(r.endsAt)}`,
    `details=${encodeURIComponent(detalles)}`,
    `location=${encodeURIComponent(lugar)}`,
  ].join("&");

  return `https://calendar.google.com/calendar/render?${parametros}`;
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

  // Botón como <a> con estilos inline: en correo no hay hojas de estilo, y un
  // <button> no navega desde un cliente de correo.
  const botonCalendario = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
      <tr>
        <td style="border-radius:6px;background-color:${COLOR.primary};">
          <a href="${escapeHtml(enlaceGoogleCalendar(r))}"
             style="display:inline-block;padding:12px 20px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
            Añadir a Google Calendar
          </a>
        </td>
      </tr>
    </table>`;

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">Tu solicitud fue aprobada. El espacio queda reservado con estos datos:</p>
    ${tablaDatos(datosComunes(r))}
    ${aviso}
    ${botonCalendario}
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

/*
 * Cuando cancela el propio solicitante, no sirve cancelTemplate: su redacción
 * ("lamentamos informarte") es la de una cancelación que sufre, no una que
 * decidió. Este acuse cumple además una función de seguridad — cancelar solo
 * pide código + documento, así que si alguien lo hiciera sin permiso, el
 * dueño se entera en el momento en vez de descubrirlo el día de la actividad.
 */
export function selfCancelTemplate(r: TemplateReservation): {
  subject: string;
  html: string;
} {
  const subject = `Cancelaste tu reserva — ${r.roomName}, ${formatRange(r.startsAt, r.endsAt)}`;

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">Cancelaste esta reserva y el horario ya quedó libre para otras personas:</p>
    ${tablaDatos(datosComunes(r))}
    <p style="margin:16px 0 0;">Si no fuiste tú, escríbenos cuanto antes: todavía estamos a tiempo de recuperar el horario.</p>
  `;

  return { subject, html: layout({ titulo: "Reserva cancelada", cuerpoHtml }) };
}

/*
 * Aviso interno al laboratorio: entró una solicitud que espera revisión.
 *
 * Sin esto, el administrador solo se entera entrando al panel — y con la
 * aprobación 100 % manual, una solicitud sin mirar acaba venciendo sola
 * (EXPIRED). Incluye el correo del solicitante, que las plantillas del
 * solicitante nunca muestran, porque aquí sirve para responderle directo.
 */
export function newRequestAdminTemplate(
  r: TemplateReservation,
  requesterEmail: string,
): { subject: string; html: string } {
  const subject = `Nueva solicitud por revisar — ${formatRange(r.startsAt, r.endsAt)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const enlacePanel = appUrl
    ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(`${appUrl}/admin`)}" style="color:${COLOR.primary};font-weight:bold;">Revisar en el panel</a></p>`
    : "";

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">Entró una solicitud nueva y está en revisión. La franja ya queda ocupada mientras decides:</p>
    ${tablaDatos([...datosComunes(r), ["Correo del solicitante", requesterEmail]])}
    ${enlacePanel}
    <p style="margin:16px 0 0;color:${COLOR.textoSecundario};font-size:13px;">Si nadie la revisa antes de que pase su horario, la solicitud se marca como vencida.</p>
  `;

  return { subject, html: layout({ titulo: "Nueva solicitud de reserva", cuerpoHtml }) };
}

/** Aviso interno al laboratorio: una franja se liberó sin que el admin actuara. */
export function requesterCancelAdminTemplate(r: TemplateReservation): {
  subject: string;
  html: string;
} {
  const subject = `Reserva cancelada por el solicitante — ${formatRange(r.startsAt, r.endsAt)}`;

  const cuerpoHtml = `
    <p style="margin:0 0 8px;">El solicitante canceló esta reserva desde la consulta pública. El horario vuelve a estar disponible:</p>
    ${tablaDatos(datosComunes(r))}
    <p style="margin:16px 0 0;color:${COLOR.textoSecundario};font-size:13px;">No hay nada que hacer en el panel: la franja ya se liberó sola.</p>
  `;

  return { subject, html: layout({ titulo: "Cancelación del solicitante", cuerpoHtml }) };
}
