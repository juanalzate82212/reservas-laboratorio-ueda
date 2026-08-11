import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import {
  ConsultaCodigoForm,
  MENSAJE_CODIGO_INVALIDO,
} from "@/components/reservation/ConsultaCodigoForm";
import {
  isReservationCodeShape,
  normalizeReservationCode,
} from "@/lib/reservation-code";

export const metadata: Metadata = {
  title: "Consultar el estado de una reserva",
  description:
    "Escribe el código que recibiste al solicitar tu reserva del Laboratorio de Analítica de Datos e Inteligencia Artificial para ver en qué estado está.",
};

/*
 * No consulta la base de datos: solo recoge el código y manda a
 * /reserva/[codigo], que es la que consulta.
 *
 * El `?codigo=` existe para que el formulario funcione sin JavaScript —o antes
 * de que React hidrate, que es el caso realista: el <form> hace un GET normal
 * aquí y este componente resuelve la redirección. Con JavaScript ya cargado,
 * el cliente se adelanta y esto no llega a ejecutarse.
 */
export default function ConsultarReservaPage({
  searchParams,
}: {
  searchParams: { codigo?: string };
}) {
  const tecleado = searchParams.codigo?.trim();
  const normalizado = tecleado ? normalizeReservationCode(tecleado) : null;

  if (normalizado && isReservationCodeShape(normalizado)) {
    redirect(`/reserva/${normalizado}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h1 font-semibold text-texto">
            Consulta el estado de tu reserva
          </h1>
          <p className="text-body-l text-texto-secundario">
            Con el código que te dimos al enviar la solicitud puedes ver si ya
            fue revisada, y cancelarla si aún no ha empezado.
          </p>
        </div>

        <div className="rounded border border-borde bg-fondo p-6">
          <ConsultaCodigoForm
            valorInicial={tecleado ?? ""}
            errorInicial={tecleado ? MENSAJE_CODIGO_INVALIDO : undefined}
          />
        </div>

        <p className="text-caption text-texto-secundario">
          ¿Todavía no tienes una reserva?{" "}
          <Link href="/reservar" className="font-medium text-primary-texto hover:underline">
            Solicita una aquí
          </Link>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}
