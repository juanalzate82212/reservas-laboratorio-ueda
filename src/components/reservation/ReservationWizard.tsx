"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays } from "date-fns";
import { CheckCircle2, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { BOOKING_CONFIG } from "@/config/booking";
import { toBogotaDayKey } from "@/lib/datetime";
import type { ActiveRoom } from "@/lib/rooms";
import {
  createReservationSchema,
  type CreateReservationInput,
} from "@/lib/validation/reservation";

import { StepDateTime } from "./StepDateTime";
import { StepRequester } from "./StepRequester";
import { StepReview } from "./StepReview";
import { StepRoom } from "./StepRoom";

type ErrorApi = { error: { code: string; message: string } };

const TITULOS_PASO = ["Espacio y horario", "Tus datos", "Revisión"] as const;

export interface ReservationWizardInitial {
  roomId?: string;
  startsAt?: string;
}

/*
 * Al llegar desde un clic en el calendario (?roomId=&startsAt=), valida el
 * prellenado antes de confiarlo: un enlace viejo o manipulado a mano no debe
 * poder colar una sala inexistente o una fecha ilegible. Si algo no cuadra,
 * el wizard simplemente arranca vacío — la validación normal del paso 1 se
 * encarga del resto.
 */
function resolveInitial(
  initial: ReservationWizardInitial | undefined,
  rooms: ActiveRoom[],
): { roomId: string; startsAt: string; selectedDate: string } {
  const vacio = { roomId: "", startsAt: "", selectedDate: "" };
  if (!initial?.roomId || !initial.startsAt) return vacio;
  if (!rooms.some((r) => r.id === initial.roomId)) return vacio;

  const fecha = new Date(initial.startsAt);
  if (Number.isNaN(fecha.getTime())) return vacio;

  return {
    roomId: initial.roomId,
    startsAt: fecha.toISOString(),
    selectedDate: toBogotaDayKey(fecha),
  };
}

export function ReservationWizard({
  rooms,
  initial,
}: {
  rooms: ActiveRoom[];
  initial?: ReservationWizardInitial;
}) {
  const prellenado = resolveInitial(initial, rooms);

  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  const form = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    mode: "onTouched",
    defaultValues: {
      roomId: prellenado.roomId,
      startsAt: prellenado.startsAt,
      endsAt: "",
      requesterName: "",
      requesterRole: "",
      requesterDocId: "",
      requesterEmail: "",
      purpose: "",
      attendees: undefined,
    },
  });

  const {
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = form;

  const roomId = watch("roomId");
  const startsAt = watch("startsAt");
  const endsAt = watch("endsAt");
  const [selectedDate, setSelectedDate] = useState(prellenado.selectedDate);
  const room = rooms.find((r) => r.id === roomId) ?? null;

  const hoyBogota = toBogotaDayKey(new Date());
  const maxBogota = toBogotaDayKey(addDays(new Date(), BOOKING_CONFIG.maxAdvanceDays));

  async function avanzar() {
    if (paso === 0) {
      const ok = await trigger(["roomId", "startsAt", "endsAt"]);
      if (ok) setPaso(1);
      return;
    }
    if (paso === 1) {
      const ok = await trigger([
        "requesterName",
        "requesterRole",
        "requesterDocId",
        "requesterEmail",
        "purpose",
        "attendees",
      ]);
      if (ok) setPaso(2);
    }
  }

  function retroceder() {
    setPaso((p) => Math.max(0, p - 1));
  }

  async function enviar(data: CreateReservationInput) {
    setEnviando(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const { code } = (await res.json()) as { code: string };
        setCodigo(code);
        return;
      }

      const { error } = (await res.json()) as ErrorApi;

      if (error.code === "SLOT_UNAVAILABLE") {
        toast.error(error.message);
        setValue("startsAt", "");
        setValue("endsAt", "");
        setWarning(null);
        setPaso(0);
        return;
      }

      toast.error(error.message || "No se pudo enviar la solicitud. Intenta de nuevo.");
    } catch {
      toast.error("No se pudo enviar la solicitud. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (codigo) {
    return <PantallaExito codigo={codigo} />;
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-medium uppercase tracking-widest text-texto-secundario">
            Paso {paso + 1} de 3
          </span>
          <h2 className="font-display text-h2 font-semibold text-texto">
            {TITULOS_PASO[paso]}
          </h2>
        </div>

        {paso === 0 && (
          <>
            <StepRoom
              rooms={rooms}
              roomId={roomId}
              onRoomChange={(id) => setValue("roomId", id, { shouldValidate: true })}
              selectedDate={selectedDate}
              onDateChange={(dayKey) => {
                setSelectedDate(dayKey);
                setValue("startsAt", "");
                setValue("endsAt", "");
                setWarning(null);
              }}
              minDate={hoyBogota}
              maxDate={maxBogota}
              errorRoom={errors.roomId?.message}
            />
            <StepDateTime
              roomId={roomId}
              selectedDate={selectedDate}
              startsAt={startsAt}
              endsAt={endsAt}
              onChange={({ startsAt: s, endsAt: e, warning: w }) => {
                setValue("startsAt", s, { shouldValidate: true });
                setValue("endsAt", e, { shouldValidate: true });
                setWarning(w);
              }}
              errorStartsAt={errors.startsAt?.message ?? errors.endsAt?.message}
            />
          </>
        )}

        {paso === 1 && <StepRequester register={register} errors={errors} />}

        {paso === 2 && (
          <StepReview
            room={room}
            startsAt={startsAt}
            endsAt={endsAt}
            requesterName={watch("requesterName")}
            requesterRole={watch("requesterRole")}
            requesterDocId={watch("requesterDocId")}
            requesterEmail={watch("requesterEmail")}
            purpose={watch("purpose")}
            attendees={watch("attendees")}
            warning={warning}
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-borde pt-4">
          <Button
            type="button"
            variante="ghost"
            onClick={retroceder}
            disabled={paso === 0 || enviando}
          >
            Atrás
          </Button>

          {paso < 2 ? (
            <Button type="button" onClick={avanzar}>
              Siguiente
            </Button>
          ) : (
            <Button
              type="button"
              variante="accent"
              cargando={enviando}
              onClick={handleSubmit(enviar)}
            >
              Enviar solicitud
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function PantallaExito({ codigo }: { codigo: string }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 aria-hidden className="h-12 w-12 text-exito" />
        <h2 className="font-display text-h2 font-semibold text-texto">
          Solicitud enviada
        </h2>
        <p className="max-w-prose text-body text-texto">
          Tu reserva quedó en revisión. Guarda o fotografía este código: es la
          única forma de consultar el estado de tu solicitud más adelante.
        </p>

        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(codigo);
            toast.success("Código copiado");
          }}
          className="flex items-center gap-2 rounded border-2 border-dashed border-primary bg-primary-soft px-6 py-3 font-display text-h2 font-bold tracking-widest text-primary"
        >
          {codigo}
          <Copy aria-hidden className="h-5 w-5" />
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/reserva/${codigo}`}
            className="text-body font-medium text-primary hover:underline"
          >
            Consultar el estado de esta reserva
          </Link>
          <span className="text-texto-secundario">·</span>
          <Link href="/" className="text-body font-medium text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
