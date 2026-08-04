"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { TimeBlockCard, type TimeBlock } from "@/components/admin/TimeBlockCard";
import { TimeBlockConflictDialog, type TimeBlockConflict } from "@/components/admin/TimeBlockConflictDialog";
import { TimeBlockForm, type TimeBlockFormValues } from "@/components/admin/TimeBlockForm";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";

type Sala = { id: string; name: string };

export default function AdminFranjasPage() {
  const router = useRouter();
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [rooms, setRooms] = useState<Sala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [conflictos, setConflictos] = useState<TimeBlockConflict[] | null>(null);
  const [pendienteEliminar, setPendienteEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/time-blocks");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        toast.error("No se pudieron cargar las franjas.");
        return;
      }
      setTimeBlocks(await res.json());
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then(setRooms)
      .catch(() => toast.error("No se pudieron cargar las salas."));
  }, []);

  async function crear(values: TimeBlockFormValues) {
    setCreando(true);
    try {
      const res = await fetch("/api/admin/time-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (res.status === 409) {
        const cuerpo = await res.json();
        setConflictos(cuerpo.conflicts ?? []);
        return;
      }

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        toast.error(cuerpo?.error?.message ?? "No se pudo crear la franja.");
        return;
      }

      toast.success("Franja creada.");
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCreando(false);
    }
  }

  async function eliminar() {
    if (!pendienteEliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/time-blocks/${pendienteEliminar}`, { method: "DELETE" });

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        toast.error(cuerpo?.error?.message ?? "No se pudo eliminar la franja.");
        return;
      }

      toast.success("Franja eliminada.");
      setPendienteEliminar(null);
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 font-semibold text-texto">Franjas</h1>
        <p className="text-body text-texto-secundario">
          Bloquea horarios (mantenimiento, jornadas institucionales) o marca avisos que siguen siendo reservables.
        </p>
      </div>

      <Card>
        <CardHeader titulo="Crear franja" />
        <CardBody>
          <TimeBlockForm rooms={rooms} enviando={creando} onSubmit={crear} />
        </CardBody>
      </Card>

      {!cargando && timeBlocks.length === 0 && (
        <EmptyState
          titulo="No hay franjas vigentes"
          descripcion="Las que crees aquí aparecen en el calendario público de inmediato."
        />
      )}

      {timeBlocks.length > 0 && (
        <div className="flex flex-col gap-3">
          {timeBlocks.map((timeBlock) => (
            <TimeBlockCard
              key={timeBlock.id}
              timeBlock={timeBlock}
              onEliminar={setPendienteEliminar}
            />
          ))}
        </div>
      )}

      <TimeBlockConflictDialog conflicts={conflictos} onCerrar={() => setConflictos(null)} />

      <Dialog
        open={pendienteEliminar !== null}
        onOpenChange={(open) => {
          if (!open) setPendienteEliminar(null);
        }}
        title="¿Eliminar esta franja?"
        description="El horario vuelve a estar disponible de inmediato en el calendario público."
      >
        <div className="flex justify-end gap-3">
          <Button type="button" variante="ghost" onClick={() => setPendienteEliminar(null)} disabled={eliminando}>
            Volver
          </Button>
          <Button type="button" variante="danger" cargando={eliminando} onClick={eliminar}>
            Eliminar franja
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
