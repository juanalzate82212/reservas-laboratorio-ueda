import Link from "next/link";

import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { CancelarReservaPanel } from "@/components/reservation/CancelarReservaPanel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRange } from "@/lib/datetime";
import { getPublicReservationByCode } from "@/lib/reservations";
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_TONE } from "@/lib/reservationStatus";

// Ver app/page.tsx: sin esto, Next.js pre-renderiza en build time y ejecuta
// la consulta a Prisma durante `next build`, no por petición.
export const dynamic = "force-dynamic";

export default async function ReservaPage({
  params,
}: {
  params: { codigo: string };
}) {
  const reservation = await getPublicReservationByCode(params.codigo);

  /*
   * Quién puede cancelar se decide aquí y no dentro del panel: son datos que
   * esta página ya tiene, y así el botón no llega siquiera a pintarse cuando
   * no aplica. El endpoint vuelve a comprobarlo igual — esto es solo para no
   * ofrecer algo que va a fallar.
   *
   * EXPIRED queda fuera por ser terminal, y una reserva ya empezada tampoco:
   * cancelarla no libera nada.
   */
  const sePuedeCancelar =
    reservation !== null &&
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED") &&
    reservation.startsAt.getTime() > Date.now();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {reservation ? (
          <div className="flex flex-col gap-4 rounded border border-borde bg-fondo p-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-display text-h2 font-semibold text-texto">
                {reservation.code}
              </h1>
              <Badge tono={RESERVATION_STATUS_TONE[reservation.status]}>
                {RESERVATION_STATUS_LABEL[reservation.status]}
              </Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-texto-secundario">Sala</dt>
                <dd className="text-body text-texto">{reservation.room.name}</dd>
              </div>
              <div>
                <dt className="text-caption text-texto-secundario">Horario</dt>
                <dd className="text-body text-texto">
                  {formatRange(reservation.startsAt, reservation.endsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-texto-secundario">Solicitante</dt>
                <dd className="text-body text-texto">{reservation.requesterName}</dd>
              </div>
              <div>
                <dt className="text-caption text-texto-secundario">Correo</dt>
                <dd className="text-body text-texto">{reservation.requesterEmail}</dd>
              </div>
            </dl>

            {reservation.adminNote && (
              <div className="rounded border border-borde bg-superficie px-4 py-3">
                <p className="text-caption font-medium text-texto-secundario">
                  Nota del administrador
                </p>
                <p className="text-body text-texto">{reservation.adminNote}</p>
              </div>
            )}

            {sePuedeCancelar && (
              <CancelarReservaPanel
                code={reservation.code}
                resumen={`${reservation.room.name} · ${formatRange(reservation.startsAt, reservation.endsAt)}`}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <EmptyState
              titulo="No encontramos esa reserva"
              descripcion="Revisa que el código esté escrito tal como aparece en tu pantalla de confirmación. Ojo con la S y el 5, y con la Z y el 2, que se confunden al leerlos."
            />
            <p className="text-center text-caption text-texto-secundario">
              <Link href="/reserva" className="font-medium text-primary hover:underline">
                Probar con otro código
              </Link>
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
