"use client";

import dynamic from "next/dynamic";

import type { ActiveRoom } from "@/lib/rooms";

/*
 * FullCalendar manipula el DOM directamente y no está pensado para
 * renderizarse en el servidor; se carga solo en el navegador para evitar un
 * posible desajuste de hidratación. `ssr: false` en next/dynamic exige un
 * Client Component, de ahí este archivo separado de page.tsx (que es un
 * Server Component: consulta las salas directo con Prisma).
 */
const RoomCalendar = dynamic(
  () => import("./RoomCalendar").then((m) => m.RoomCalendar),
  { ssr: false, loading: () => <CalendarSkeleton /> },
);

function CalendarSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando calendario"
      className="flex h-[420px] animate-pulse items-center justify-center rounded border border-borde bg-superficie text-caption text-texto-secundario"
    >
      Cargando calendario…
    </div>
  );
}

export function CalendarGrid({ rooms }: { rooms: ActiveRoom[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {rooms.map((room) => (
        <RoomCalendar key={room.id} room={room} />
      ))}
    </div>
  );
}
