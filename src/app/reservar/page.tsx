import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { ReservationWizard } from "@/components/reservation/ReservationWizard";
import { getActiveRooms } from "@/lib/rooms";

// Ver app/page.tsx: sin esto, Next.js pre-renderiza la página en build time
// y ejecuta la consulta a Prisma durante `next build`, no por petición.
export const dynamic = "force-dynamic";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: { roomId?: string; startsAt?: string };
}) {
  const rooms = await getActiveRooms();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <p className="text-caption font-medium uppercase tracking-widest text-texto-secundario">
            Laboratorio de Analítica de Datos e Inteligencia Artificial
          </p>
          <h1 className="font-display text-h1 font-semibold text-texto">
            Solicitar reserva
          </h1>
        </div>

        {rooms.length > 0 ? (
          <ReservationWizard
            rooms={rooms}
            initial={{ roomId: searchParams.roomId, startsAt: searchParams.startsAt }}
          />
        ) : (
          <p className="text-body text-texto-secundario">
            No hay salas disponibles para reservar en este momento.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}
