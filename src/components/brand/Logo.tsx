import { cn } from "@/lib/utils";

/*
 * PLACEHOLDER TIPOGRÁFICO — riesgo R3 del plan.
 *
 * No tenemos el arte oficial en SVG. El documento de marca prohíbe recolorear,
 * deformar, pixelar o reconstruir el escudo, así que NO se dibuja aquí una
 * imitación de la cruz ni del escudo: se usa una composición tipográfica que
 * respeta la estructura del logotipo (función en peso ligero + nombre en peso
 * fuerte + elemento gráfico diagonal) y se declara como provisional.
 *
 * Al recibir los archivos de la Oficina de Comunicaciones, sustituir el interior
 * de este componente por el <svg> oficial y borrar este comentario. Nada más del
 * código debería necesitar cambios.
 */
export interface LogoProps {
  variante?: "positivo" | "blanco";
  /** Marca reducida para cabeceras compactas y móvil (§4.2: bajo ~140px). */
  compacto?: boolean;
  className?: string;
}

export function Logo({
  variante = "positivo",
  compacto = false,
  className,
}: LogoProps) {
  const enBlanco = variante === "blanco";
  const etiqueta = "Universidad Católica Luis Amigó";

  if (compacto) {
    return (
      <span
        role="img"
        aria-label={etiqueta}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded font-display text-h3 font-bold",
          enBlanco ? "bg-white text-primary" : "bg-primary text-white",
          className,
        )}
      >
        U
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={etiqueta}
      // min-w-[140px]: tamaño mínimo del logotipo horizontal (§4.2).
      className={cn(
        "inline-flex min-w-[140px] items-center gap-2.5 leading-none",
        className,
      )}
    >
      {/* Elemento gráfico: la barra diagonal del logotipo. */}
      <span
        aria-hidden
        className="h-9 w-1.5 -skew-x-12 rounded-sm bg-accent"
      />
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            "font-display text-[0.6rem] font-medium uppercase tracking-[0.18em]",
            enBlanco ? "text-white/80" : "text-texto-secundario",
          )}
        >
          Universidad Católica
        </span>
        <span
          className={cn(
            "font-display text-[1.05rem] font-bold uppercase tracking-tight",
            enBlanco ? "text-white" : "text-primary",
          )}
        >
          Luis Amigó
        </span>
      </span>
    </span>
  );
}
