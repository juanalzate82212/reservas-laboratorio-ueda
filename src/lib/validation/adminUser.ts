import { z } from "zod";

/*
 * Reglas de los administradores del panel. Compartidas entre el formulario y
 * los Route Handlers: el servidor SIEMPRE revalida, aunque el formulario ya lo
 * haya hecho.
 */

/** Mínimo para una contraseña nueva. Las sembradas por script no pasan por aquí. */
export const LARGO_MINIMO_CONTRASENA = 12;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Ingresa tu correo.")
    .email("Ese correo no tiene un formato válido.")
    // Normalizar aquí y no en el handler: así el formulario y el servidor
    // coinciden, y "Ana@..." entra igual que "ana@...".
    .transform((valor) => valor.trim().toLowerCase()),
  password: z.string().min(1, "Ingresa la contraseña."),
});

const contrasenaNueva = z
  .string()
  .min(
    LARGO_MINIMO_CONTRASENA,
    `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  );

const camposComunes = {
  name: z.string().trim().min(1, "Ingresa el nombre.").max(120),
  role: z.enum(["SUPER_ADMIN", "LAB_ADMIN"], {
    required_error: "Elige un rol.",
    invalid_type_error: "Rol no reconocido.",
  }),
  /*
   * `null` es un valor con significado —"ningún laboratorio en concreto"— y no
   * un campo sin rellenar, así que se acepta explícitamente en vez de dejarlo
   * opcional. Qué combinación es válida lo decide el superRefine de abajo.
   */
  roomId: z.string().min(1).nullable(),
};

/*
 * La regla que hace que el aislamiento sea posible: un LAB_ADMIN SIEMPRE tiene
 * laboratorio. Sin ella entraría en la base un administrador de laboratorio sin
 * laboratorio, y getAdminSession() tendría que decidir qué hacer con él —donde
 * la respuesta cómoda, dejarlo pasar sin filtro, le abriría todos.
 *
 * Y al revés: un SUPER_ADMIN con sala asignada sugeriría que está acotado a
 * ella, cuando es transversal por definición. Se rechaza para que el dato no
 * mienta.
 */
function validarRolYSala(
  datos: { role: "SUPER_ADMIN" | "LAB_ADMIN"; roomId: string | null },
  ctx: z.RefinementCtx,
) {
  if (datos.role === "LAB_ADMIN" && !datos.roomId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roomId"],
      message:
        "Un administrador de laboratorio debe tener un laboratorio asignado.",
    });
  }
  if (datos.role === "SUPER_ADMIN" && datos.roomId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roomId"],
      message:
        "Un administrador general es transversal: no se le asigna un laboratorio.",
    });
  }
}

export const createAdminUserSchema = z
  .object({
    email: z
      .string()
      .min(1, "Ingresa el correo.")
      .email("Ese correo no tiene un formato válido.")
      .transform((valor) => valor.trim().toLowerCase()),
    password: contrasenaNueva,
    ...camposComunes,
  })
  .superRefine(validarRolYSala);

export const updateAdminUserSchema = z
  .object({
    // El correo no se edita: es la identidad con la que se inicia sesión.
    // Cambiarlo es crear otra cuenta y desactivar esta.
    ...camposComunes,
    isActive: z.boolean(),
    // Vacío = no se toca la contraseña. Es lo normal al editar.
    password: z.union([contrasenaNueva, z.literal("")]).optional(),
  })
  .superRefine(validarRolYSala);

export type CreateAdminUserInput = z.input<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.input<typeof updateAdminUserSchema>;
