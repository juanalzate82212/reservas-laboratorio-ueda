export interface PuntoMensual {
  mes: string;
  etiqueta: string;
  total: number;
}

const ANCHO = 600;
const ALTO = 160;
const MARGEN = 12;

/*
 * Tendencia de los últimos doce meses: una línea, una sola serie.
 *
 * La línea es la única forma de esta pantalla donde el eje X es continuo, y
 * por eso la única donde una línea dice algo. Todo lo demás son comparaciones
 * entre categorías, que van en barras.
 *
 * ⚠️ NUNCA un segundo eje Y aquí. Si algún día hace falta comparar reservas
 * con horas ocupadas, van dos gráficos o los dos índices sobre una base
 * común — nunca dos escalas en el mismo dibujo, que es el error de gráfico
 * más repetido que existe: la alineación entre las dos escalas es arbitraria
 * y fabrica una correlación que no está en los datos.
 *
 * A diferencia de las barras, NO lleva un número sobre cada punto: doce
 * etiquetas convertirían la línea en una tabla mal maquetada. Los valores
 * exactos van en la tabla oculta del final, que además es lo que lee un
 * lector de pantalla.
 */
export function LineaMensual({ datos }: { datos: PuntoMensual[] }) {
  const tope = Math.max(...datos.map((d) => d.total), 1);

  const x = (i: number) =>
    MARGEN + (i * (ANCHO - MARGEN * 2)) / Math.max(datos.length - 1, 1);
  const y = (total: number) =>
    ALTO - MARGEN - (total / tope) * (ALTO - MARGEN * 2);

  const puntos = datos.map((d, i) => `${x(i)},${y(d.total)}`).join(" ");
  const ultimo = datos[datos.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Reservas por mes durante los últimos ${datos.length} meses. El detalle está en la tabla siguiente.`}
      >
        {/* Línea base continua, no discontinua: el punteado añade ruido. */}
        <line
          x1={MARGEN}
          y1={ALTO - MARGEN}
          x2={ANCHO - MARGEN}
          y2={ALTO - MARGEN}
          className="stroke-borde"
          strokeWidth={1}
        />

        <polyline
          points={puntos}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {datos.map((d, i) => (
          <circle key={d.mes} cx={x(i)} cy={y(d.total)} r={4} className="fill-primary" />
        ))}
      </svg>

      {/*
       * Solo el primero y el último mes bajo el eje. Doce etiquetas se pisan
       * entre sí en cuanto la pantalla se estrecha, y la tabla de abajo ya
       * tiene el detalle completo.
       */}
      <div className="flex justify-between text-caption text-texto-secundario">
        <span>{datos[0]?.etiqueta}</span>
        <span>{ultimo?.etiqueta}</span>
      </div>

      {/*
       * La versión en tabla. Cubre a la vez la accesibilidad —una línea SVG no
       * es legible para un lector de pantalla— y el caso de quien necesita la
       * cifra exacta de un mes concreto.
       */}
      <table className="sr-only">
        <caption>Reservas por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Reservas</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.mes}>
              <th scope="row">{d.etiqueta}</th>
              <td>{d.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
