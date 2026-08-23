"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RoomCalendar } from "@/components/calendar/RoomCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ActiveRoom } from "@/lib/rooms";

/*
 * Vista de ocupación del panel. Es el MISMO RoomCalendar del público, con
 * `soloLectura`: aquí el calendario sirve para mirar, no para reservar.
 *
 * Se alimenta de GET /api/availability, que es público y NUNCA devuelve datos
 * personales — solo startsAt, endsAt y status. Por eso esta pantalla muestra
 * cuándo está ocupado pero no de quién es cada reserva: para eso está la
 * bandeja de Solicitudes. Fue una decisión explícita del usuario, y evita
 * abrir una segunda ruta que exponga nombres.
 *
 * Client Component como el resto del panel, y no Server Component: así la
 * sala se pide desde el navegador y esta página no puede caer en la trampa
 * del pre-renderizado en build time (ver CLAUDE.md) ni necesita
 * `force-dynamic`.
 */
export default function AdminCalendarioPage() {
  const router = useRouter();
  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const res = await fetch("/api/rooms");
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (!res.ok) {
          toast.error("No se pudo cargar la sala.");
          return;
        }
        const salas: ActiveRoom[] = await res.json();
        if (!cancelado) setRoom(salas[0] ?? null);
      } catch {
        if (!cancelado) toast.error("No se pudo conectar con el servidor.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-semibold text-texto">Calendario</h1>
        <p className="text-body text-texto-secundario">
          Ocupación de la semana. Es una vista: para decidir sobre una
          solicitud, ve a Solicitudes.
        </p>
      </div>

      {cargando ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 rounded border border-borde py-16"
        >
          <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-primary" />
          <span className="text-caption font-medium text-texto-secundario">
            Cargando el calendario…
          </span>
        </div>
      ) : room ? (
        <RoomCalendar room={room} soloLectura />
      ) : (
        <EmptyState
          titulo="No hay ninguna sala activa"
          descripcion="Sin una sala activa no hay disponibilidad que mostrar. Actívala en la base de datos y vuelve a esta página."
        />
      )}
    </div>
  );
}
