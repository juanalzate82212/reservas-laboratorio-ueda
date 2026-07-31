import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRange } from "@/lib/datetime";
import { getPublicReservationByCode } from "@/lib/reservations";

// Ver app/page.tsx: sin esto, Next.js pre-renderiza en build time y ejecuta
// la consulta a Prisma durante `next build`, no por petición.
export const dynamic = "force-dynamic";

const TONO_POR_ESTADO = {
  PENDING: "revision",
  CONFIRMED: "exito",
  REJECTED: "error",
  CANCELLED: "neutral",
} as const;

const ETIQUETA_POR_ESTADO = {
  PENDING: "En revisión",
  CONFIRMED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
} as const;

export default async function ReservaPage({
  params,
}: {
  params: { codigo: string };
}) {
  const reservation = await getPublicReservationByCode(params.codigo);

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
              <Badge tono={TONO_POR_ESTADO[reservation.status]}>
                {ETIQUETA_POR_ESTADO[reservation.status]}
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
          </div>
        ) : (
          <EmptyState
            titulo="No encontramos esa reserva"
            descripcion="Revisa que el código esté escrito correctamente, tal como aparece en tu pantalla de confirmación."
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
