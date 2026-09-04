import Link from "next/link";
import { Cpu, Users } from "lucide-react";

import { ArcoDecorativo } from "@/components/brand/ArcoDecorativo";
import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { getActiveRooms, type ActiveRoom } from "@/lib/rooms";

/*
 * Portal: la puerta de entrada del QR. Su único trabajo es que alguien que
 * acaba de escanear elija laboratorio; el calendario vive una pantalla más
 * adentro, en /laboratorio/[slug].
 *
 * Server Component que consulta Prisma directo (sin llamarse a sí mismo vía
 * fetch a /api/rooms). force-dynamic por lo mismo que el resto de páginas que
 * tocan la base: sin searchParams/cookies/headers, Next la trataría como
 * candidata a pre-renderizarse durante `next build`, y el CI construye con
 * credenciales de base de datos falsas.
 */
export const dynamic = "force-dynamic";

export default async function Portal() {
  const laboratorios = await getActiveRooms();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="relative overflow-hidden rounded border border-borde bg-primary-soft px-6 py-8">
          {/* Un solo gesto gráfico por pantalla (§5.1 del documento de marca). */}
          <ArcoDecorativo className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-40" />
          <div className="relative flex max-w-2xl flex-col gap-3">
            <p className="text-caption font-medium uppercase tracking-widest text-primary-texto">
              Universidad Católica Luis Amigó
            </p>
            <h1 className="font-display text-h1 font-semibold text-texto">
              Reserva un laboratorio
            </h1>
            <p className="text-body-l text-texto">
              Elige el laboratorio que necesitas para ver su disponibilidad y
              enviar tu solicitud. Cada uno tiene su propio calendario y su
              propio encargado.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/reserva"
                className={buttonVariants({ variante: "secondary", tamano: "lg" })}
              >
                Consultar mi reserva
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-semibold text-texto">
            Laboratorios disponibles
          </h2>

          {laboratorios.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {laboratorios.map((laboratorio) => (
                <li key={laboratorio.id} className="flex">
                  <TarjetaLaboratorio laboratorio={laboratorio} />
                </li>
              ))}
            </ul>
          ) : (
            /*
             * Sin EmptyState a propósito: ese componente trae su propio arco y
             * el hero ya tiene uno — dos gestos gráficos en la misma pantalla
             * incumplen la regla de uno por vista (§5.1).
             */
            <p className="rounded border border-borde bg-superficie px-6 py-8 text-center text-body text-texto-secundario">
              Todavía no hay laboratorios abiertos. Cuando alguno active sus
              reservas, aparecerá aquí.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

/*
 * ⚠️ El CTA va en azul primario, NO en naranja, y con dos laboratorios eso es
 * deliberado: el naranja señala UNA sola cosa por vista (§ jerarquía del
 * documento de marca), así que repartirlo entre dos opciones de igual peso no
 * señalaría nada. Si algún día el portal tuviera un laboratorio destacado,
 * ese sería el sitio del acento.
 *
 * La tarjeta entera no es un enlace: anidar el título y el CTA dentro de un
 * <a> gigante deja un solo destino de tabulación con un nombre accesible
 * larguísimo. El enlace es el CTA, y el <h3> lo acompaña.
 */
function TarjetaLaboratorio({ laboratorio }: { laboratorio: ActiveRoom }) {
  return (
    <Card className="flex w-full flex-col">
      <CardBody className="flex flex-1 flex-col gap-3">
        <h3 className="font-display text-h3 font-medium text-texto">
          {laboratorio.name}
        </h3>

        {laboratorio.description && (
          <p className="text-body text-texto-secundario">
            {laboratorio.description}
          </p>
        )}

        <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-2 text-caption text-texto-secundario">
          <div className="flex items-center gap-1.5">
            <Users aria-hidden="true" className="h-4 w-4 text-primary" />
            <dt className="sr-only">Aforo</dt>
            <dd>Hasta {laboratorio.capacity} asistentes</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu aria-hidden="true" className="h-4 w-4 text-primary" />
            <dt className="sr-only">Equipos</dt>
            <dd>
              {laboratorio.hasComputers
                ? "Con equipos de cómputo"
                : "Sin equipos de cómputo"}
            </dd>
          </div>
        </dl>

        <div className="pt-2">
          <Link
            href={`/laboratorio/${laboratorio.slug}`}
            className={buttonVariants({ variante: "primary" })}
          >
            Ver disponibilidad
            <span className="sr-only"> del {laboratorio.name}</span>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
