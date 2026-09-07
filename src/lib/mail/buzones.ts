/*
 * De qué cuenta sale el correo de cada laboratorio.
 *
 * Hasta la fase 3, TODO el correo salía de la cuenta de Analítica, incluidos
 * los de una reserva en Redes. Aquí cada laboratorio tiene el suyo.
 *
 * ⚠️ Las credenciales viven en variables de entorno, NUNCA en la base de datos.
 * Guardar contraseñas SMTP en `Room` habría permitido administrarlas desde el
 * panel sin redesplegar, pero obliga a cifrarlas y a gestionar la clave de
 * cifrado, y cualquier fallo de aislamiento del panel expondría buzones
 * institucionales reales. Decisión explícita del usuario.
 *
 * ⚠️ El sufijo sale de `Room.mailKey`, NO del `slug`. El slug es parte de la
 * URL pública, así que es cosmético y algún día alguien lo renombrará; si las
 * credenciales colgaran de él, ese cambio dejaría al laboratorio sin SMTP
 * configurado EN SILENCIO — el mailer caería en modo LOGGED y los correos
 * dejarían de salir sin un solo error.
 */

export interface Buzon {
  /** La clave con la que se resolvió, para poder diagnosticar. */
  mailKey: string;
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  /** Remitente visible. Gmail rechaza remitentes que no sean `user` o un alias suyo. */
  from?: string;
  /** A dónde van los AVISOS internos del laboratorio (no los del solicitante). */
  avisosA?: string;
}

/*
 * `ANALITICA` → SMTP_ANALITICA_HOST. Se normaliza porque el mailKey lo escribe
 * una persona en la base de datos y un nombre con guiones o acentos no forma un
 * identificador de variable de entorno válido.
 */
// Marcas diacriticas sueltas que deja normalize("NFD"). Se construye desde
// cadena a proposito: escrito como literal /[...]/ , el formateador lo
// reescribe a los caracteres crudos y el fichero deja de ser ASCII.
const DIACRITICOS = new RegExp("[\u0300-\u036f]", "g");

function sufijo(mailKey: string): string {
  return mailKey
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Lee primero la variable con sufijo del laboratorio y, si no está, la variable
 * global sin sufijo.
 *
 * La reserva a la global no es pereza: permite desplegar esta fase SIN tocar
 * las variables que ya tiene Analítica en Vercel, y que un despliegue con un
 * solo buzón siga funcionando tal cual. El día que un laboratorio necesite el
 * suyo, se añaden sus variables y deja de usar la global — sin migración.
 */
function leer(nombre: string, clave: string): string | undefined {
  const propia = process.env[`${nombre}_${clave}`];
  if (propia !== undefined && propia !== "") return propia;
  const global = process.env[nombre];
  return global !== undefined && global !== "" ? global : undefined;
}

export function resolverBuzon(mailKey: string): Buzon {
  const clave = sufijo(mailKey);

  return {
    mailKey,
    host: leer("SMTP_HOST", clave),
    port: Number(leer("SMTP_PORT", clave) ?? "587"),
    secure: leer("SMTP_SECURE", clave) === "true",
    user: leer("SMTP_USER", clave),
    pass: leer("SMTP_PASSWORD", clave),
    from: leer("MAIL_FROM", clave),
    avisosA: leer("MAIL_TO_ADMIN", clave),
  };
}

/**
 * Si se puede intentar enviar de verdad. Sin esto, el mailer escribe el correo
 * en consola y lo guarda en EmailLog como LOGGED, para que el flujo completo
 * sea demostrable sin credenciales reales.
 *
 * ⚠️ Se evalúa POR BUZÓN: un laboratorio sin credenciales cae en LOGGED sin
 * arrastrar al otro. Antes era una sola comprobación global, así que o enviaban
 * todos o no enviaba ninguno.
 */
export function buzonConfigurado(buzon: Buzon): boolean {
  return Boolean(buzon.host && buzon.pass);
}
