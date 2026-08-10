"use client";

import Link from "next/link";

import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/*
 * Boundary de error de toda la aplicación. Obligatoriamente Client Component:
 * es la firma que exige Next.js para poder entregar `reset`.
 *
 * Captura los fallos de las páginas y sus componentes, pero NO los del layout
 * raíz — de eso se encarga global-error.tsx, que es el único que puede,
 * porque reemplaza ese layout entero.
 *
 * `reset()` vuelve a montar el segmento que falló, sin recargar la página. Es
 * la acción correcta para lo más probable aquí: una consulta a la base que no
 * respondió. Por eso va como acción principal y no un "volver al inicio", que
 * daría por perdido algo que suele arreglarse solo.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-8 sm:px-6">
        <EmptyState
          nivelTitulo="h1"
          titulo="No pudimos cargar esta página"
          descripcion="Puede ser algo temporal. Vuelve a intentarlo y, si el problema sigue, inténtalo de nuevo en unos minutos."
          accion={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button type="button" onClick={reset}>
                Reintentar
              </Button>
              <Link href="/" className={buttonVariants({ variante: "secondary" })}>
                Ir al inicio
              </Link>
            </div>
          }
        />

        {/*
          El identificador que genera Next para cada error. Se muestra sin
          instrucciones a propósito: quien sepa qué es podrá cruzarlo con los
          registros de Vercel, y para el resto es ruido que no estorba.
        */}
        {error.digest && (
          <p className="text-center text-caption text-texto-secundario">
            Código del error: {error.digest}
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
