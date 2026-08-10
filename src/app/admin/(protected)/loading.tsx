import { LoaderCircle } from "lucide-react";

/*
 * Guarda, no arreglo de un fallo observado — importa la diferencia.
 *
 * El loading.tsx de la raíz es el boundary más cercano también de /admin/**,
 * y muestra la cabecera y el pie PÚBLICOS. Si llegara a dispararse dentro del
 * panel, el administrador vería el shell equivocado. Este archivo lo eclipsa.
 *
 * Hoy ese boundary NO llega a dispararse: todas las páginas de (protected) son
 * Client Components que piden datos en useEffect, así que nada suspende en el
 * servidor. Se verificó en un build de producción y el pie público no asoma en
 * ningún momento al navegar por el panel, ni con este archivo ni sin él.
 *
 * Se conserva porque el día que una de esas páginas pase a Server Component
 * con consulta a la base —lo natural si se quiere quitar el parpadeo de sus
 * fetch— el boundary empezaría a dispararse, y el fallo sería sutil y difícil
 * de atribuir. Veinte líneas para que ese cambio no traiga una sorpresa.
 *
 * No repite el shell: el layout de (protected) ya aporta la banda azul, el nav
 * y el botón de salir, y esto se renderiza dentro de su <main>.
 */
export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center gap-2"
    >
      <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-primary" />
      <span className="text-caption font-medium text-texto-secundario">Cargando…</span>
    </div>
  );
}
