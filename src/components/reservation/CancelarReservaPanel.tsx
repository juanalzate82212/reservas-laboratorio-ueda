"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

type ErrorApi = { error: { code: string; message: string } };

export interface CancelarReservaPanelProps {
  code: string;
  /** "Sala Principal · lunes 24 de agosto, 09:00–10:00" */
  resumen: string;
}

/*
 * Isla cliente dentro de /reserva/[codigo], que es Server Component. Solo se
 * renderiza cuando la reserva admite cancelación — esa decisión la toma la
 * página, no este componente, porque depende de datos que ya tiene.
 */
export function CancelarReservaPanel({ code, resumen }: CancelarReservaPanelProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [documento, setDocumento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cerrar() {
    if (enviando) return;
    setAbierto(false);
    setDocumento("");
    setError(null);
  }

  async function cancelar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${code}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterDocId: documento.trim() }),
      });

      if (res.ok) {
        setAbierto(false);
        setDocumento("");
        toast.success("Tu reserva quedó cancelada. Te enviamos un correo de confirmación.");
        // El estado vive en el Server Component: refresh() lo vuelve a pedir en
        // vez de duplicar aquí una copia del estado que se desincronizaría.
        router.refresh();
        return;
      }

      const { error: fallo } = (await res.json()) as ErrorApi;
      setError(fallo.message);
    } catch {
      setError("No pudimos conectar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 border-t border-borde pt-4">
        <p className="text-caption text-texto-secundario">
          ¿Ya no vas a usar el espacio? Puedes cancelar hasta que empiece, y el
          horario queda libre para otras personas.
        </p>
        <div>
          <Button type="button" variante="secondary" onClick={() => setAbierto(true)}>
            Cancelar mi reserva
          </Button>
        </div>
      </div>

      <Dialog
        open={abierto}
        onOpenChange={(open) => {
          if (!open) cerrar();
        }}
        title="¿Cancelar esta reserva?"
        description={resumen}
      >
        <div className="flex flex-col gap-4">
          <p className="text-caption text-texto-secundario">
            Para confirmar que eres quien reservó, escribe el número de documento
            con el que hiciste la solicitud. Esta acción no se puede deshacer.
          </p>

          <Field
            label="Número de documento"
            ayuda="Solo dígitos, sin puntos."
            error={error ?? undefined}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              placeholder="1017234567"
              value={documento}
              onChange={(evento) => {
                setDocumento(evento.target.value);
                if (error) setError(null);
              }}
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Button type="button" variante="ghost" onClick={cerrar} disabled={enviando}>
              Volver
            </Button>
            <Button
              type="button"
              variante="danger"
              cargando={enviando}
              disabled={documento.trim().length === 0}
              onClick={cancelar}
            >
              Cancelar reserva
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
