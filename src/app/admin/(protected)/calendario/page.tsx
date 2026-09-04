"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RoomCalendar } from "@/components/calendar/RoomCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
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
 * Client Component como el resto del panel, y no Server Component: así los
 * laboratorios se piden desde el navegador y esta página no puede caer en la
 * trampa del pre-renderizado en build time (ver CLAUDE.md) ni necesita
 * `force-dynamic`.
 *
 * ⚠️ Antes esto hacía `setRoom(salas[0])`, que era el mismo acoplamiento a "un
 * solo laboratorio" que getActiveRoom() y que con dos mostraba uno en silencio.
 * En la fase 3, cuando cada administrador tenga el suyo, la lista llegará ya
 * acotada por el servidor y el selector solo aparecerá a quien tenga varios.
 */
export default function AdminCalendarioPage() {
  const router = useRouter();
  const [laboratorios, setLaboratorios] = useState<ActiveRoom[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string>("");
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
          toast.error("No se pudieron cargar los laboratorios.");
          return;
        }
        const salas: ActiveRoom[] = await res.json();
        if (!cancelado) {
          setLaboratorios(salas);
          setSeleccionadoId(salas[0]?.id ?? "");
        }
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

  const seleccionado = useMemo(
    () => laboratorios.find((sala) => sala.id === seleccionadoId) ?? null,
    [laboratorios, seleccionadoId],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-semibold text-texto">Calendario</h1>
        <p className="text-body text-texto-secundario">
          Ocupación de la semana. Es una vista: para decidir sobre una
          solicitud, ve a Solicitudes.
        </p>
      </div>

      {/* Con un solo laboratorio el selector no decide nada: no se pinta. */}
      {laboratorios.length > 1 && (
        <div className="max-w-sm">
          <Field label="Laboratorio">
            <Select
              value={seleccionadoId}
              onChange={(e) => setSeleccionadoId(e.target.value)}
            >
              {laboratorios.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

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
      ) : seleccionado ? (
        /*
         * `key` fuerza a remontar al cambiar de laboratorio. RoomCalendar
         * guarda el último rango pedido en un ref (`ultimoRangoRef`) para
         * cortar el bucle de `datesSet`; sin remontar, ese ref sobreviviría al
         * cambio y el calendario se quedaría con los datos del anterior,
         * porque el rango visible no habría cambiado.
         */
        <RoomCalendar key={seleccionado.id} room={seleccionado} soloLectura />
      ) : (
        <EmptyState
          titulo="No hay ningún laboratorio activo"
          descripcion="Sin un laboratorio activo no hay disponibilidad que mostrar. Actívalo en la base de datos y vuelve a esta página."
        />
      )}
    </div>
  );
}
