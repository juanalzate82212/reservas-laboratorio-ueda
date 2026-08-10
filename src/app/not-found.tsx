import Link from "next/link";

import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/*
 * Pantalla de ruta inexistente. Antes de existir este archivo, una URL mal
 * escrita mostraba el 404 genérico de Next.js, en inglés y fuera de la marca —
 * y esta aplicación se abre desde un QR, así que llegar a una dirección rota
 * escribiéndola a mano es un caso real, no de borde.
 *
 * Ojo: NO sustituye al mensaje de /reserva/[codigo] cuando un código no
 * existe. Aquel responde 200 a propósito y da un consejo que aquí no cabe (la
 * confusión entre S y 5, Z y 2 al leer un código). Son dos cosas distintas.
 *
 * Los botones van en primary y secondary, nunca accent: el arco naranja de
 * EmptyState ya es el único elemento naranja que admite la pantalla.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6">
        <EmptyState
          nivelTitulo="h1"
          titulo="No encontramos esa página"
          descripcion="Puede que el enlace esté incompleto o que la dirección haya cambiado. Desde el inicio puedes ver la disponibilidad del laboratorio y solicitar tu reserva."
          accion={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className={buttonVariants()}>
                Ir al inicio
              </Link>
              <Link href="/reserva" className={buttonVariants({ variante: "secondary" })}>
                Consultar mi reserva
              </Link>
            </div>
          }
        />
      </main>

      <Footer />
    </div>
  );
}
