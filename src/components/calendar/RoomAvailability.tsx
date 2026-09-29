"use client";

import { LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";

import type { ActiveRoom } from "@/lib/rooms";

/*
 * FullCalendar manipula el DOM directamente y no está pensado para
 * renderizarse en el servidor; se carga solo en el navegador para evitar un
 * posible desajuste de hidratación. `ssr: false` en next/dynamic exige un
 * Client Component, de ahí este archivo separado de page.tsx (que es un
 * Server Component: consulta la sala directo con Prisma).
 */
const RoomCalendar = dynamic(
  () => import("./RoomCalendar").then((m) => m.RoomCalendar),
  { ssr: false, loading: () => <CalendarSkeleton /> },
);

/*
 * ⚠️ Sin `animate-pulse`, y no es cosmetico: esa utilidad anima la opacidad
 * entre 1 y 0.5, y a media animacion el texto sobre #F5F5F5 cae por debajo del
 * 4.5:1 que exige WCAG AA. axe-core lo reporta como `color-contrast` [serious]
 * al muestrear el fotograma atenuado. Tampoco respetaba
 * prefers-reduced-motion.
 *
 * Se sustituye por el mismo patron que ya usa el calendario del panel: un
 * spinner (gira, no se atenua) con el texto a opacidad plena.
 */
function CalendarSkeleton() {
  return (
    <div
      role="status"
      className="flex h-[420px] items-center justify-center gap-2 rounded border border-borde bg-superficie"
    >
      <LoaderCircle
        aria-hidden
        className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none"
      />
      <span className="text-caption font-medium text-texto-secundario">
        Cargando el calendario…
      </span>
    </div>
  );
}

/*
 * Un calendario, el del laboratorio de la página que lo monta. Elegir
 * laboratorio pasó a ser trabajo del portal (`/`), así que aquí no hay selector
 * ni plegado: cuando se llega a /laboratorio/[slug] la elección ya está hecha.
 */
export function RoomAvailability({ room }: { room: ActiveRoom }) {
  return <RoomCalendar room={room} />;
}
