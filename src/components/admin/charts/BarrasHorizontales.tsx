export interface BarraDato {
  valor: string;
  etiqueta: string;
  total: number;
}

/*
 * Ranking de categorías: barras horizontales, TODAS DEL MISMO COLOR.
 *
 * El color aquí no codifica nada — la longitud ya lo hace—, así que pintar
 * cada barra de un color distinto sería decoración, y además imposible de
 * hacer bien: la paleta de marca no da seis tonos que se distingan entre sí.
 * Validado con el script del skill `dataviz`: el azul #007B99 y el verde de
 * éxito #2E7D5B quedan en ΔE 9,9, por debajo del mínimo de 15 incluso con
 * visión normal de color. Una serie, un color, sin leyenda.
 *
 * Horizontales y no verticales porque las etiquetas son largas ("Especialización
 * en Big Data e Inteligencia de Negocios"): en vertical habría que girarlas.
 *
 * La cifra va SIEMPRE visible junto a la barra. Así el dato es texto y no solo
 * longitud, que es lo que lo hace legible para un lector de pantalla y lo que
 * salva el caso de una barra demasiado corta para apreciarse.
 */
export function BarrasHorizontales({ datos }: { datos: BarraDato[] }) {
  if (datos.length === 0) {
    return (
      <p className="text-caption text-texto-secundario">
        No hay datos en este periodo.
      </p>
    );
  }

  // Contra el mayor, no contra la suma: es una comparación, no un reparto.
  const tope = Math.max(...datos.map((d) => d.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {datos.map((dato) => (
        <li
          key={dato.valor}
          className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3"
        >
          <span className="truncate text-caption text-texto-secundario" title={dato.etiqueta}>
            {dato.etiqueta}
          </span>

          {/*
           * El carril de fondo da la escala: sin él, dos barras cortas parecen
           * iguales aunque una sea el doble. `aria-hidden` porque la cifra de
           * al lado ya dice el dato — repetirlo sería ruido en un lector.
           */}
          <span aria-hidden className="h-2.5 w-full rounded-[4px] bg-superficie">
            <span
              className="block h-full rounded-[4px] bg-primary"
              style={{ width: `${(dato.total / tope) * 100}%` }}
            />
          </span>

          <span className="text-right text-caption font-medium tabular-nums text-texto">
            {dato.total}
          </span>
        </li>
      ))}
    </ul>
  );
}
