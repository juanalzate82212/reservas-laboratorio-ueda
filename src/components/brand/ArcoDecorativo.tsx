import { cn } from "@/lib/utils";

/*
 * Gesto de marca: la tilde de "AMIGÓ" abstraída en una "O" que puede
 * fragmentarse hasta en cuatro partes (§5.1 del documento de identidad).
 *
 * Regla de oro: UN SOLO gesto gráfico protagonista por pantalla. Si esta vista
 * ya tiene un arco, no añadas otro ni una diagonal.
 */
export interface ArcoDecorativoProps {
  forma?: "arco" | "anillo-fragmentado";
  color?: "naranja" | "azul";
  className?: string;
}

export function ArcoDecorativo({
  forma = "arco",
  color = "naranja",
  className,
}: ArcoDecorativoProps) {
  const trazo = color === "naranja" ? "stroke-accent" : "stroke-primary";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none select-none", trazo, className)}
    >
      <circle
        cx="50"
        cy="50"
        r="40"
        strokeWidth="12"
        strokeLinecap="butt"
        // Un cuarto de circunferencia (2πr/4 ≈ 62.8) visible, el resto oculto.
        strokeDasharray={forma === "arco" ? "62.8 251.2" : "40 22.8"}
        // Rota el inicio del trazo a las 12 en punto.
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}
