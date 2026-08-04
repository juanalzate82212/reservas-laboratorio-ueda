import Link from "next/link";

import { ArcoDecorativo } from "@/components/brand/ArcoDecorativo";
import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { AvailabilityLegend } from "@/components/calendar/AvailabilityLegend";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { buttonVariants } from "@/components/ui/Button";
import { getActiveRooms } from "@/lib/rooms";

/*
 * Server Component: consulta las salas directo con Prisma (sin llamarse a sí
 * mismo vía fetch a /api/rooms). La disponibilidad sí se pide desde el
 * navegador porque depende del rango visible del calendario, que cambia con
 * la navegación del usuario — ver CalendarGrid / RoomCalendar.
 *
 * force-dynamic por la misma razón que en /api/rooms/route.ts: sin
 * searchParams/cookies/headers, Next.js trataría esta página como candidata a
 * pre-renderizarse en build time, ejecutando la consulta a Prisma durante
 * `next build` en vez de por petición.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const rooms = await getActiveRooms();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="relative overflow-hidden rounded border border-borde bg-primary-soft px-6 py-8">
          <ArcoDecorativo
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-40"
          />
          <div className="relative flex max-w-2xl flex-col gap-3">
            <p className="text-caption font-medium uppercase tracking-widest text-primary">
              Laboratorio de Estrategia del Dato y Analítica
            </p>
            <h1 className="font-display text-h1 font-semibold text-texto">
              Consulta la disponibilidad y solicita tu reserva
            </h1>
            <p className="text-body-l text-texto">
              Dos salas, de lunes a viernes de 8:00 a. m. a 5:00 p. m. Elige un
              horario disponible y envía tu solicitud: queda sujeta a
              aprobación del administrador.
            </p>
            <div>
              <Link
                href="/reservar"
                className={buttonVariants({ variante: "accent", tamano: "lg" })}
              >
                Reservar espacio
              </Link>
            </div>
          </div>
        </section>

        <AvailabilityLegend />

        {rooms.length > 0 ? (
          <CalendarGrid rooms={rooms} />
        ) : (
          <p className="text-body text-texto-secundario">
            No hay salas disponibles en este momento.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
