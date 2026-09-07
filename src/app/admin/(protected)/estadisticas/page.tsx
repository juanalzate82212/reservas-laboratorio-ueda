"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BarrasHorizontales,
  type BarraDato,
} from "@/components/admin/charts/BarrasHorizontales";
import { ColumnasHora } from "@/components/admin/charts/ColumnasHora";
import {
  LineaMensual,
  type PuntoMensual,
} from "@/components/admin/charts/LineaMensual";
import { useSesionAdmin } from "@/components/admin/SesionAdminProvider";
import { StatTile } from "@/components/admin/charts/StatTile";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

interface Respuesta {
  /** De qué laboratorio son estas cifras. Lo decide el servidor, no el cliente. */
  sala: { id: string; name: string };
  periodo: { mes: string | null; etiqueta: string };
  mesesDisponibles: string[];
  totales: {
    solicitadas: number;
    confirmadas: number;
    rechazadas: number;
    canceladas: number;
    vencidas: number;
  };
  servicio: { sinRevisar: number; tiempoRespuestaHoras: number | null };
  ocupacion: { horasReservadas: number; horasHabiles: number; indice: number };
  porHora: { hora: number; total: number }[];
  porCargo: BarraDato[];
  porActividad: BarraDato[];
  porPrograma: BarraDato[];
  porDiaSemana: { dia: number; etiqueta: string; total: number }[];
  tendencia: PuntoMensual[];
}

/** "septiembre de 2026" → "Septiembre de 2026", para el desplegable. */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function horasLegibles(horas: number): string {
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  return `${horas.toFixed(1).replace(".", ",")} h`;
}

export default function AdminEstadisticasPage() {
  const router = useRouter();
  const sesion = useSesionAdmin();
  const esSuperAdmin = sesion.role === "SUPER_ADMIN";
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [mes, setMes] = useState("");
  const [salaId, setSalaId] = useState("");
  const [salas, setSalas] = useState<Array<{ id: string; name: string }>>([]);
  const [cargando, setCargando] = useState(true);

  /*
   * El selector de laboratorio solo tiene sentido para quien administra varios.
   * A un LAB_ADMIN el servidor le impone el suyo e ignora el parámetro.
   */
  useEffect(() => {
    if (!esSuperAdmin) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/rooms");
        if (!res.ok || cancelado) return;
        if (!cancelado) setSalas(await res.json());
      } catch {
        // El selector es un realce: sin él se ve el laboratorio por defecto.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [esSuperAdmin]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (mes) params.set("mes", mes);
      if (salaId) params.set("roomId", salaId);

      const res = await fetch(`/api/admin/stats?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        toast.error("No se pudieron cargar las estadísticas.");
        return;
      }
      setDatos(await res.json());
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [mes, salaId, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sinNadaQueMostrar =
    !cargando && datos !== null && datos.totales.solicitadas === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 font-semibold text-texto">
          Estadísticas
        </h1>
        <p className="text-body text-texto-secundario">
          Uso de{" "}
          <strong className="font-medium text-texto">
            {datos?.sala.name ?? "el laboratorio"}
          </strong>{" "}
          y demanda de reservas. Ningún dato personal aparece aquí: para ver
          quién solicitó una reserva, ve a Solicitudes.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {/*
          ⚠️ Las cifras son SIEMPRE de un laboratorio, nunca de varios sumados:
          `ocupacion.indice` divide entre las horas hábiles de UN calendario, y
          agregando dos el índice podría pasar de 1. Por eso esto es un selector
          y no una casilla de "todos".
        */}
        {esSuperAdmin && salas.length > 1 && (
          <Field label="Laboratorio">
            <Select value={salaId} onChange={(e) => setSalaId(e.target.value)}>
              {salas.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Periodo">
          <Select value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todo el histórico</option>
            {datos?.mesesDisponibles.map((m) => (
              <option key={m} value={m}>
                {capitalizar(
                  new Intl.DateTimeFormat("es-CO", {
                    month: "long",
                    year: "numeric",
                    timeZone: "America/Bogota",
                  }).format(new Date(`${m}-15T12:00:00.000Z`)),
                )}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {sinNadaQueMostrar && (
        <EmptyState
          titulo="Todavía no hay datos"
          descripcion="Cuando entren solicitudes en este periodo, aquí aparecerán las cifras de uso."
        />
      )}

      {datos && !sinNadaQueMostrar && (
        <div className="flex flex-col gap-6">
          {/* Los totales: cifras sueltas, que no son un gráfico. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              etiqueta="Solicitadas"
              valor={datos.totales.solicitadas}
            />
            <StatTile
              etiqueta="Confirmadas"
              valor={datos.totales.confirmadas}
            />
            <StatTile etiqueta="Vencidas" valor={datos.totales.vencidas} />
            <StatTile etiqueta="Canceladas" valor={datos.totales.canceladas} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              etiqueta="Ocupación"
              valor={`${Math.round(datos.ocupacion.indice * 100)} %`}
              ayuda={`${horasLegibles(datos.ocupacion.horasReservadas)} reservadas de ${horasLegibles(datos.ocupacion.horasHabiles)} disponibles`}
            />
            <StatTile
              etiqueta="Tiempo de respuesta"
              valor={
                datos.servicio.tiempoRespuestaHoras === null
                  ? "—"
                  : horasLegibles(datos.servicio.tiempoRespuestaHoras)
              }
              ayuda="Media desde que llega la solicitud hasta que se decide"
            />
            {/*
             * El único gesto naranja de la pantalla, y solo cuando hay algo
             * que mirar: una cifra en cero no merece que se le llame la
             * atención.
             */}
            <StatTile
              etiqueta="Nadie las revisó"
              valor={datos.servicio.sinRevisar}
              ayuda="Se vencieron sin que se decidiera sobre ellas"
              destacado={datos.servicio.sinRevisar > 0}
            />
          </div>

          <Card>
            <CardHeader
              titulo="Horas más ocupadas"
              descripcion="Solo reservas confirmadas: mide el uso real del espacio, no lo que se pidió."
            />
            <CardBody>
              <ColumnasHora datos={datos.porHora} />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                titulo="Actividad más solicitada"
                descripcion="Todas las solicitudes del periodo, se hayan confirmado o no."
              />
              <CardBody>
                <BarrasHorizontales datos={datos.porActividad} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                titulo="Cargo que más solicita"
                descripcion="Todas las solicitudes del periodo, se hayan confirmado o no."
              />
              <CardBody>
                <BarrasHorizontales datos={datos.porCargo} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                titulo="Programa académico"
                descripcion="Todas las solicitudes del periodo, se hayan confirmado o no."
              />
              <CardBody>
                <BarrasHorizontales datos={datos.porPrograma} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                titulo="Día de la semana"
                descripcion="Todas las solicitudes del periodo, se hayan confirmado o no."
              />
              <CardBody>
                <BarrasHorizontales
                  datos={datos.porDiaSemana.map((d) => ({
                    valor: String(d.dia),
                    etiqueta: d.etiqueta,
                    total: d.total,
                  }))}
                />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              titulo="Tendencia de los últimos 12 meses"
              descripcion="No cambia con el filtro de periodo: doce meses dentro de un mes no diría nada."
            />
            <CardBody>
              <LineaMensual datos={datos.tendencia} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
