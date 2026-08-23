import { cn } from "@/lib/utils";

export interface StatTileProps {
  etiqueta: string;
  valor: string | number;
  /** Matiz bajo la cifra: unidad, comparación o aclaración. */
  ayuda?: string;
  /*
   * Resalta la tarjeta. Se usa UNA sola vez por vista, y solo cuando la cifra
   * pide atención (hoy: solicitudes que nadie revisó, y solo si hay alguna).
   * El documento de marca admite un único gesto naranja por pantalla.
   */
  destacado?: boolean;
}

/*
 * Una cifra suelta no es un gráfico, y forzarla a serlo la empeora: un
 * circular de dos porciones o una barra única dicen menos que el número.
 * Estas tarjetas son la forma correcta para los totales.
 */
export function StatTile({ etiqueta, valor, ayuda, destacado = false }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded border p-4",
        destacado ? "border-accent bg-accent-soft" : "border-borde bg-fondo",
      )}
    >
      {/*
       * ⚠️ Sobre la tarjeta destacada el texto pequeño va con `text-texto`, no
       * con `text-texto-secundario`. El gris #6F7070 se eligió por pasar AA
       * sobre blanco y sobre --superficie, pero sobre el naranja suave
       * (#FDE6C7) se queda en 4,09 y AA pide 4,5 — lo detectó axe sobre el
       * build de producción, no se dedujo. El #2E2E2E de marca pasa de sobra
       * sobre ese fondo.
       */}
      <span
        className={cn(
          "text-caption font-medium",
          destacado ? "text-texto" : "text-texto-secundario",
        )}
      >
        {etiqueta}
      </span>
      <span className="font-display text-h2 font-semibold tabular-nums text-texto">
        {valor}
      </span>
      {ayuda && (
        <span
          className={cn(
            "text-caption",
            destacado ? "text-texto" : "text-texto-secundario",
          )}
        >
          {ayuda}
        </span>
      )}
    </div>
  );
}
