import { AlertTriangle, Ban, CalendarCheck, Clock, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Código de colores del calendario (§8 del plan). Cada estado lleva refuerzo
 * no cromático (icono o borde) además del color, por daltonismo. RoomCalendar
 * reutiliza las mismas clases CSS (fc-evento-*, rayado-diagonal) para que un
 * evento se vea igual que su entrada aquí — esta lista es la única fuente de
 * verdad del emparejamiento color + refuerzo.
 */
const ITEMS: Array<{
  etiqueta: string;
  swatch: string;
  icono?: LucideIcon;
}> = [
  { etiqueta: "Disponible", swatch: "border border-borde bg-superficie" },
  { etiqueta: "Reservado", swatch: "bg-primary", icono: CalendarCheck },
  {
    etiqueta: "En revisión",
    swatch: "border-2 border-dashed border-azul-500 bg-azul-200",
    icono: Clock,
  },
  {
    etiqueta: "Sin equipos de cómputo",
    swatch: "bg-accent",
    icono: AlertTriangle,
  },
  { etiqueta: "No disponible", swatch: "rayado-diagonal", icono: Ban },
  {
    etiqueta: "Festivo o cerrado",
    swatch: "border border-borde bg-superficie opacity-60",
  },
];

export function AvailabilityLegend() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-texto-secundario">
        Cada bloque del calendario representa 30 minutos. Toca un horario
        disponible para solicitarlo.
      </p>
      <ul
        aria-label="Leyenda del calendario"
        className="flex flex-wrap gap-x-5 gap-y-2"
      >
        {ITEMS.map((item) => (
          <li
            key={item.etiqueta}
            className="flex items-center gap-2 text-caption text-texto"
          >
            <span
              aria-hidden
              className={cn("h-4 w-4 shrink-0 rounded-sm", item.swatch)}
            />
            {item.icono && (
              <item.icono aria-hidden className="h-3.5 w-3.5 text-texto-secundario" />
            )}
            {item.etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}
