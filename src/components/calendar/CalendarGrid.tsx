"use client";

import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { ActiveRoom } from "@/lib/rooms";
import { cn } from "@/lib/utils";

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

/*
 * Cada calendario empieza plegado detrás de un botón "Ver disponibilidad":
 * la landing se abre desde un QR, así que llegar con menos que cargar y
 * desplazar antes de decidir qué sala mirar es preferible a mostrar ambos
 * calendarios de entrada. Cada uno se abre y cierra por separado.
 */
export function CalendarGrid({ rooms }: { rooms: ActiveRoom[] }) {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());

  function alternar(roomId: string) {
    setAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(roomId)) {
        siguiente.delete(roomId);
      } else {
        siguiente.add(roomId);
      }
      return siguiente;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rooms.map((room) => {
        const abierta = abiertas.has(room.id);
        return (
          <div key={room.id} className="flex flex-col gap-3">
            <Button
              type="button"
              variante="secondary"
              onClick={() => alternar(room.id)}
              aria-expanded={abierta}
              className="justify-between"
            >
              Ver disponibilidad de {room.name}
              <ChevronDown
                aria-hidden
                className={cn("h-4 w-4 transition-transform", abierta && "rotate-180")}
              />
            </Button>
            {abierta && <RoomCalendar room={room} />}
          </div>
        );
      })}
    </div>
  );
}
