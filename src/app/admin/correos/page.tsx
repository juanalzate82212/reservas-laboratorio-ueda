"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmailLogRow, type EmailLog } from "@/components/admin/EmailLogRow";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminCorreosPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [cargando, setCargando] = useState(true);
  const [reintentandoId, setReintentandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/admin/email-logs");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        toast.error("No se pudieron cargar los correos.");
        return;
      }
      setLogs(await res.json());
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function reintentar(id: string) {
    setReintentandoId(id);
    try {
      const res = await fetch(`/api/admin/email-logs/${id}/retry`, { method: "POST" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        toast.error(cuerpo?.error?.message ?? "No se pudo reintentar el envío.");
        return;
      }
      const { status } = (await res.json()) as { status: string };
      if (status === "SENT") {
        toast.success("Correo enviado.");
      } else if (status === "LOGGED") {
        toast.info("Registrado en consola — todavía no hay credenciales SMTP.");
      } else {
        toast.error("El envío volvió a fallar.");
      }
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setReintentandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 font-semibold text-texto">Correos</h1>
        <p className="text-body text-texto-secundario">
          Registro de los correos generados al confirmar, rechazar o cancelar una solicitud.
        </p>
      </div>

      {!cargando && logs.length === 0 && (
        <EmptyState
          titulo="Todavía no hay correos"
          descripcion="Aparecerán aquí en cuanto confirmes, rechaces o canceles una solicitud."
        />
      )}

      {logs.length > 0 && (
        <div className="flex flex-col gap-3">
          {logs.map((log) => (
            <EmailLogRow
              key={log.id}
              log={log}
              onReintentar={reintentar}
              reintentando={reintentandoId === log.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
