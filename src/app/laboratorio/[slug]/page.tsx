import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArcoDecorativo } from "@/components/brand/ArcoDecorativo";
import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { AvailabilityLegend } from "@/components/calendar/AvailabilityLegend";
import { RoomAvailability } from "@/components/calendar/RoomAvailability";
import { buttonVariants } from "@/components/ui/Button";
import { getRoomBySlug } from "@/lib/rooms";

/*
 * La disponibilidad de UN laboratorio. Es lo que antes vivía en `/`, antes de
 * que la portada pasara a ser el portal.
 *
 * force-dynamic: sin esto Next pre-renderizaría la página en build time y
 * ejecutaría la consulta a Prisma durante `next build`. La disponibilidad en
 * sí se pide desde el navegador, porque depende del rango visible del
 * calendario — ver RoomAvailability / RoomCalendar.
 */
export const dynamic = "force-dynamic";

/*
 * getRoomBySlug va envuelta en cache() de React, así que las dos llamadas de
 * esta petición —esta y la del componente— son una sola consulta.
 *
 * ⚠️ LIMITACIÓN CONOCIDA: un slug inexistente renderiza la página 404 correcta,
 * pero la respuesta sale con **HTTP 200**, no 404. Con la renderización en
 * streaming de Next 14 el estado ya está comprometido cuando notFound() se
 * lanza desde el componente. Comprobado contra el build de producción y con la
 * base de datos accesible; llamar a notFound() también aquí, en
 * generateMetadata, no lo cambia. Una ruta que no casa con ningún segmento
 * (/asdfgh) sí devuelve 404 de verdad, porque nunca entra a renderizar.
 *
 * Se acepta: quien navega ve la pantalla correcta. Importa solo para
 * indexadores, y estas URLs no se publican. Si algún día hay que corregirlo,
 * el sitio es el middleware o un Route Handler, que deciden antes de renderizar.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const laboratorio = await getRoomBySlug(params.slug);
  if (!laboratorio) return { title: "Laboratorio no encontrado" };

  const titulo = `Reservas — ${laboratorio.name}`;
  const descripcion =
    laboratorio.description ??
    `Consulta la disponibilidad del ${laboratorio.name} y solicita tu reserva.`;

  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion },
  };
}

export default async function LaboratorioPage({
  params,
}: {
  params: { slug: string };
}) {
  const laboratorio = await getRoomBySlug(params.slug);

  /*
   * getRoomBySlug ya descarta los inactivos, así que un laboratorio que aún no
   * abre da 404 igual que uno inexistente: no se distingue "no existe" de
   * "todavía no está abierto", que es lo que corresponde a una página pública.
   */
  if (!laboratorio) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="relative overflow-hidden rounded border border-borde bg-primary-soft px-6 py-8">
          <ArcoDecorativo className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-40" />
          <div className="relative flex max-w-2xl flex-col gap-3">
            <p className="text-caption font-medium uppercase tracking-widest text-primary-texto">
              {laboratorio.name}
            </p>
            <h1 className="font-display text-h1 font-semibold text-texto">
              Consulta la disponibilidad y solicita tu reserva
            </h1>
            <p className="text-body-l text-texto">
              De lunes a viernes de 8:00 a. m. a 5:00 p. m. Elige un horario
              disponible y envía tu solicitud: queda sujeta a aprobación del
              encargado del laboratorio.
            </p>
            {/*
              Aquí SÍ hay una acción principal, a diferencia del portal, así
              que el naranja tiene a quién señalar. Consultar el estado es para
              quien ya reservó, así que va en secundario.
            */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/laboratorio/${laboratorio.slug}/reservar`}
                className={buttonVariants({ variante: "accent", tamano: "lg" })}
              >
                Reservar espacio
              </Link>
              <Link
                href="/reserva"
                className={buttonVariants({ variante: "secondary", tamano: "lg" })}
              >
                Consultar mi reserva
              </Link>
            </div>
          </div>
        </section>

        <AvailabilityLegend />

        <RoomAvailability room={laboratorio} />
      </main>

      <Footer laboratorio={laboratorio} />
    </div>
  );
}
