import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { ReservationWizard } from "@/components/reservation/ReservationWizard";
import { getRoomBySlug } from "@/lib/rooms";

// Ver /laboratorio/[slug]/page.tsx: sin esto, Next pre-renderiza en build time
// y ejecuta la consulta a Prisma durante `next build`, no por petición.
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

  return {
    title: `Solicitar reserva — ${laboratorio.name}`,
    description: `Solicita una franja horaria en el ${laboratorio.name}.`,
  };
}

export default async function ReservarLaboratorioPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { startsAt?: string };
}) {
  const laboratorio = await getRoomBySlug(params.slug);
  if (!laboratorio) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <p className="text-caption font-medium uppercase tracking-widest text-texto-secundario">
            {laboratorio.name}
          </p>
          <h1 className="font-display text-h1 font-semibold text-texto">
            Solicitar reserva
          </h1>
        </div>

        <ReservationWizard
          room={laboratorio}
          initial={{ startsAt: searchParams.startsAt }}
        />
      </main>

      <Footer laboratorio={laboratorio} />
    </div>
  );
}
