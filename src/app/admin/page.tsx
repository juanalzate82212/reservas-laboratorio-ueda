"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ADMIN_RESERVATIONS_CHANGED_EVENT } from "@/components/admin/adminEvents";
import { ConfirmActionDialog, type AdminReservationAction } from "@/components/admin/ConfirmActionDialog";
import { ReservationCard } from "@/components/admin/ReservationCard";
import { ReservationTable } from "@/components/admin/ReservationTable";
import type { AdminReservation } from "@/components/admin/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { formatRange } from "@/lib/datetime";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservationStatus";

type Sala = { id: string; name: string };

const ESTADOS = Object.entries(RESERVATION_STATUS_LABEL) as [
  keyof typeof RESERVATION_STATUS_LABEL,
  string,
][];

export default function AdminHomePage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [rooms, setRooms] = useState<Sala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroSala, setFiltroSala] = useState("");
  const [pendiente, setPendiente] = useState<{ id: string; action: AdminReservationAction } | null>(
    null,
  );
  const [aplicando, setAplicando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set("status", filtroEstado);
      if (filtroSala) params.set("roomId", filtroSala);

      const res = await fetch(`/api/admin/reservations?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        toast.error("No se pudieron cargar las solicitudes.");
        return;
      }
      setReservations(await res.json());
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, filtroSala, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then(setRooms)
      .catch(() => toast.error("No se pudieron cargar las salas."));
  }, []);

  function pedirAccion(id: string, action: AdminReservationAction) {
    setPendiente({ id, action });
  }

  async function confirmarAccion() {
    if (!pendiente) return;
    setAplicando(true);
    try {
      const res = await fetch(`/api/admin/reservations/${pendiente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pendiente.action }),
      });

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        toast.error(cuerpo?.error?.message ?? "No se pudo aplicar la acción.");
        return;
      }

      toast.success("Solicitud actualizada.");
      setPendiente(null);
      await cargar();
      window.dispatchEvent(new Event(ADMIN_RESERVATIONS_CHANGED_EVENT));
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setAplicando(false);
    }
  }

  const reservacionPendiente = reservations.find((r) => r.id === pendiente?.id);
  const resumenDialogo = reservacionPendiente
    ? `${reservacionPendiente.room.name} · ${formatRange(
        new Date(reservacionPendiente.startsAt),
        new Date(reservacionPendiente.endsAt),
      )} · ${reservacionPendiente.requesterName}`
    : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 font-semibold text-texto">
          Bandeja de solicitudes
        </h1>
        <p className="text-body text-texto-secundario">
          Confirma, rechaza o cancela las reservas solicitadas.
        </p>
      </div>

      <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
        <Field label="Estado">
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Sala">
          <Select value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)}>
            <option value="">Todas</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!cargando && reservations.length === 0 && (
        <EmptyState
          titulo="No hay solicitudes"
          descripcion="No hay reservas que coincidan con estos filtros."
        />
      )}

      {reservations.length > 0 && (
        <div className="flex flex-col gap-3">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onAction={pedirAccion}
            />
          ))}
          <ReservationTable reservations={reservations} onAction={pedirAccion} />
        </div>
      )}

      <ConfirmActionDialog
        action={pendiente?.action ?? null}
        resumen={resumenDialogo}
        cargando={aplicando}
        onCancelar={() => setPendiente(null)}
        onConfirmar={confirmarAccion}
      />
    </div>
  );
}
