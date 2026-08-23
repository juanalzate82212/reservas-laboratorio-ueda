/*
 * Reservas por hora del día: columnas verticales.
 *
 * Verticales y no horizontales porque la hora del día tiene un orden natural
 * que el eje X reproduce sin esfuerzo — se lee como una línea de tiempo, y el
 * valle del receso de 12:00 a 13:00 se ve de un vistazo. Un ranking ordenado
 * de mayor a menor destruiría esa lectura.
 *
 * Se pintan TODAS las horas de apertura, incluidas las que valen cero: un
 * hueco es información, y saltárselo haría creer que el laboratorio no abre a
 * esa hora.
 */
export function ColumnasHora({ datos }: { datos: { hora: number; total: number }[] }) {
  const tope = Math.max(...datos.map((d) => d.total), 1);
  const hayDatos = datos.some((d) => d.total > 0);

  if (!hayDatos) {
    return (
      <p className="text-caption text-texto-secundario">
        Todavía no hay reservas confirmadas en este periodo.
      </p>
    );
  }

  return (
    <div className="flex items-stretch gap-1.5">
      {datos.map((dato) => (
        <div key={dato.hora} className="flex flex-1 flex-col items-center gap-1">
          {/*
           * El espacio duro NO es decorativo: con una cadena vacía el <span>
           * colapsa a altura cero, las columnas sin reservas quedan más bajas
           * que las demás y la fila de horas sale escalonada en vez de recta.
           */}
          <span className="text-caption tabular-nums text-texto-secundario">
            {dato.total > 0 ? dato.total : " "}
          </span>

          {/*
           * La altura fija del carril es lo que hace que el porcentaje de la
           * barra signifique algo: sin un contenedor de altura conocida, un
           * `height` en % no tiene contra qué resolverse.
           */}
          <div className="flex h-32 w-full flex-col justify-end">
            {/*
             * Ancho limitado y centrado: a lo ancho de la tarjeta, nueve
             * columnas a todo el espacio salen como bloques macizos, que se
             * leen ruidosos. La marca fina es la regla.
             */}
            <div
              className="mx-auto w-full max-w-[2.75rem] rounded-t-[4px] bg-primary"
              style={{ height: `${(dato.total / tope) * 100}%` }}
            />
          </div>

          {/* La línea base: el suelo contra el que se leen las alturas. */}
          <span className="w-full border-t border-borde pt-1 text-center text-caption tabular-nums text-texto-secundario">
            {dato.hora}
          </span>
        </div>
      ))}
    </div>
  );
}
