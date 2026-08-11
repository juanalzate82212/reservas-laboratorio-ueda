import { LoaderCircle } from "lucide-react";

import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";

/*
 * Espera mientras el servidor prepara una página. Las tres páginas públicas
 * que consultan la base (/, /reservar y /reserva/[codigo]) son force-dynamic,
 * así que ese momento existe de verdad — y desde un móvil con la red del
 * campus no siempre es breve.
 *
 * Mantiene cabecera y pie fijos a propósito: la estructura no parpadea y solo
 * cambia el centro, así que la transición se siente continua en vez de un
 * salto de página completa.
 *
 * El anillo girando es el mismo gesto de carga que Button.tsx y RoomCalendar
 * (§5.1 del documento de marca, la tilde sobre la "ó" de AMIGÓ) — no un
 * spinner distinto inventado aquí. El prefers-reduced-motion ya lo neutraliza
 * globals.css de forma global, así que no hace falta nada más.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:px-6">
        <div role="status" aria-live="polite" className="flex items-center gap-2">
          <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-primary" />
          <span className="text-caption font-medium text-texto-secundario">
            Cargando…
          </span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
