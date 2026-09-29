import { labelForActivityType } from "@/config/reservationOptions";

/*
 * Invitaciones de calendario (RFC 5545) adjuntas al correo.
 *
 * POR QUÉ ESTO Y NO LA API DE GOOGLE CALENDAR. La idea original era crear el
 * evento directamente con la API oficial. No se puede: una cuenta de servicio
 * responde 403 `forbiddenForServiceAccounts` en cuanto el evento lleva
 * `attendees`, y la única salida —la delegación de autoridad para todo el
 * dominio— la tiene que conceder un superadministrador de Workspace de
 * amigo.edu.co. Se pidió y no la conceden.
 *
 * Un adjunto `text/calendar` con METHOD:REQUEST hace casi lo mismo sin pedirle
 * permiso a nadie: viaja por el SMTP que ya está configurado, Gmail lo muestra
 * con botones de respuesta y lo añade al calendario de quien lo recibe.
 *
 * Lo que NO hace, y conviene tenerlo claro: el evento no se crea solo en el
 * calendario del laboratorio, sino que cada destinatario acepta una
 * invitación, y la aplicación nunca se entera de si la aceptaron. No hay
 * estado que consultar: lo que sabemos es que la invitación salió.
 *
 * Este módulo es PURO —función de sus argumentos, sin Prisma ni entorno—, que
 * es el criterio de CLAUDE.md para que algo entre en Vitest.
 */

/*
 * REQUEST invita y pide respuesta; PUBLISH solo entrega el evento; CANCEL lo
 * retira.
 *
 * ⚠️ PUBLISH existe por una limitación de iMIP, no por gusto: una invitación
 * por correo NO puede poner el evento en la agenda de quien la ORGANIZA. El
 * protocolo da por hecho que el organizador ya lo tiene, porque normalmente lo
 * creó él en su calendario. Aquí no existe en ninguna parte, así que la copia
 * del laboratorio —que es el organizador— no tenía dónde aterrizar: Gmail la
 * descartaba entera, sin botones y sin evento. Comprobado con un envío real.
 *
 * Por eso cada copia lleva lo que le corresponde: REQUEST al solicitante, que
 * sí es invitado, y PUBLISH al laboratorio, que no se invita a sí mismo.
 */
export type MetodoIcs = "REQUEST" | "PUBLISH" | "CANCEL";

export interface PersonaIcs {
  nombre?: string | null;
  correo: string;
}

/** Lo que la invitación necesita saber de la reserva. */
export interface ReservaIcs {
  code: string;
  roomName: string;
  startsAt: Date;
  endsAt: Date;
  activityType: string;
  activityTypeOther: string | null;
}

export interface InvitacionIcs {
  metodo: MetodoIcs;
  reserva: ReservaIcs;
  /** Quién organiza. Tiene que ser la cuenta que ENVÍA el correo. */
  organizador: PersonaIcs;
  invitados: PersonaIcs[];
  /** Inyectable para poder fijar DTSTAMP en los tests. */
  ahora?: Date;
}

/*
 * ⚠️ NO CAMBIAR NUNCA ESTE DOMINIO.
 *
 * No es una URL: es la mitad derecha del UID, y el UID es lo ÚNICO que ata una
 * cancelación a la invitación que la precedió. Si cambia, los clientes de
 * calendario tratan el CANCEL como un evento desconocido, lo ignoran, y la
 * reserva cancelada se queda pegada en el calendario del solicitante y en el
 * del laboratorio para siempre — sin un solo error en ninguna parte.
 *
 * Por eso es una constante literal y no `NEXT_PUBLIC_APP_URL`: esa variable
 * cambia de valor entre entornos y el día que se mueva el dominio se llevaría
 * por delante todas las invitaciones ya enviadas.
 */
const DOMINIO_UID = "reservas-laboratorio-ueda.vercel.app";

export function uidDeReserva(code: string): string {
  return `reserva-${code}@${DOMINIO_UID}`;
}

/**
 * El METHOD declarado dentro del propio ICS.
 *
 * Nodemailer necesita el método como dato aparte para ponerlo en el
 * Content-Type, que es lo que hace que Gmail pinte los botones de respuesta en
 * vez de un adjunto suelto. Se lee del contenido en lugar de pasarlo por
 * separado para que no puedan discrepar.
 */
export function metodoDelIcs(ics: string): MetodoIcs | null {
  const encontrado = /^METHOD:(REQUEST|PUBLISH|CANCEL)$/m.exec(ics);
  return encontrado ? (encontrado[1] as MetodoIcs) : null;
}

/*
 * Escapado de valores TEXT del §3.3.11 del RFC 5545: barra invertida, punto y
 * coma, coma y salto de línea. Los dos puntos NO se escapan — en un valor TEXT
 * no delimitan nada.
 */
function escaparTexto(valor: string): string {
  return valor
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/*
 * Plegado del §3.1: ninguna línea pasa de 75 OCTETOS, y la continuación
 * empieza por un espacio (que cuenta para el límite, de ahí el 74).
 *
 * Se mide en octetos y no en caracteres porque el texto lleva acentos y la «ó»
 * de «Amigó» ocupa dos bytes en UTF-8. Y el corte retrocede mientras cae sobre
 * un byte de continuación (10xxxxxx) para no partir un carácter por la mitad:
 * partido, el cliente de calendario recibe UTF-8 inválido.
 */
function plegar(linea: string): string {
  const bytes = Buffer.from(linea, "utf8");
  if (bytes.length <= 75) return linea;

  const trozos: string[] = [];
  let inicio = 0;
  let limite = 75;

  while (inicio < bytes.length) {
    let fin = Math.min(inicio + limite, bytes.length);
    while (fin > inicio && fin < bytes.length && (bytes[fin] & 0xc0) === 0x80) {
      fin -= 1;
    }
    trozos.push(bytes.subarray(inicio, fin).toString("utf8"));
    inicio = fin;
    limite = 74;
  }

  return trozos.join("\r\n ");
}

/** "20260914T140000Z" — forma UTC del §3.3.5. */
function instanteUtc(fecha: Date): string {
  return `${fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
}

function persona(
  propiedad: "ORGANIZER" | "ATTENDEE",
  p: PersonaIcs,
  extra = "",
): string {
  const cn = p.nombre ? `;CN=${escaparTexto(p.nombre)}` : "";
  return `${propiedad}${cn}${extra}:mailto:${p.correo}`;
}

function actividadLegible(r: ReservaIcs): string {
  return r.activityType === "OTRO" && r.activityTypeOther
    ? r.activityTypeOther
    : labelForActivityType(r.activityType);
}

/**
 * Construye el cuerpo del `.ics`.
 *
 * ⚠️ Las fechas van como el INSTANTE UTC real, tal como están en la base. No
 * pasan por `toBogotaWallClockIso()`: ese truco existe solo para el límite con
 * FullCalendar y aquí metería cinco horas de desfase en el calendario de quien
 * acepte la invitación. Misma regla que tenía el enlace de Google Calendar.
 */
export function construirIcs({
  metodo,
  reserva,
  organizador,
  invitados,
  ahora = new Date(),
}: InvitacionIcs): string {
  const cancelacion = metodo === "CANCEL";

  /*
   * ⚠️ Un PUBLISH no lleva ATTENDEE, y no es una simplificación: el §3.2.1 del
   * RFC 5546 lo prohíbe. Tiene sentido — no hay relación de agenda que
   * establecer, nadie tiene que responder nada. Quién reservó viaja igual en
   * el cuerpo HTML del correo, que el laboratorio recibe al lado del botón.
   */
  const conInvitados = metodo !== "PUBLISH";

  const descripcion = cancelacion
    ? `La reserva ${reserva.code} del ${reserva.roomName} fue cancelada.`
    : `Reserva ${reserva.code} · ${reserva.roomName}. Consulta su estado con el código en la página del laboratorio.`;

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Universidad Catolica Luis Amigo//Reservas de laboratorios//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${metodo}`,
    "BEGIN:VEVENT",
    `UID:${uidDeReserva(reserva.code)}`,
    /*
     * El CANCEL tiene que ir por delante de la invitación que anula, o el
     * cliente de calendario se queda con la más reciente que ya tenía y la
     * cancelación no surte efecto.
     */
    `SEQUENCE:${cancelacion ? 1 : 0}`,
    `DTSTAMP:${instanteUtc(ahora)}`,
    `DTSTART:${instanteUtc(reserva.startsAt)}`,
    `DTEND:${instanteUtc(reserva.endsAt)}`,
    `SUMMARY:${escaparTexto(`${actividadLegible(reserva)} — ${reserva.roomName}`)}`,
    `DESCRIPTION:${escaparTexto(descripcion)}`,
    `LOCATION:${escaparTexto(`Universidad Católica Luis Amigó · ${reserva.roomName}`)}`,
    `STATUS:${cancelacion ? "CANCELLED" : "CONFIRMED"}`,
    persona("ORGANIZER", organizador),
    /*
     * RSVP=TRUE solo en la invitación. En una cancelación no hay nada que
     * responder, y pedirlo hace que algunos clientes pinten botones inútiles.
     */
    ...(conInvitados
      ? invitados.map((i) =>
          persona(
            "ATTENDEE",
            i,
            cancelacion
              ? ";ROLE=REQ-PARTICIPANT;PARTSTAT=DECLINED"
              : ";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE",
          ),
        )
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // CRLF obligatorio en todas las líneas, incluida la última (§3.1).
  return `${lineas.map(plegar).join("\r\n")}\r\n`;
}
