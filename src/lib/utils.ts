import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge resuelve conflictos entre clases (p. ej. `px-2 px-4` → `px-4`).
 * No conoce nuestra escala tipográfica propia, así que hay que declararla: sin
 * esto clasificaría `text-h1` como color de texto y, al combinarla con
 * `text-primary`, descartaría una de las dos en silencio.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "body-l", "body", "caption"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
