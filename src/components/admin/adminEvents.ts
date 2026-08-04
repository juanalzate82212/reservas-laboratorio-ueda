/*
 * La bandeja (app/admin/page.tsx) y el contador de pendientes (AdminNav) son
 * hermanos en el árbol — la bandeja vive dentro de `children`, el nav en el
 * layout. Sin un store global, un evento de `window` es la forma más simple
 * de avisarle al nav que vuelva a pedir el conteo tras una acción, sin
 * introducir contexto ni polling.
 */
export const ADMIN_RESERVATIONS_CHANGED_EVENT = "admin:reservations-changed";
