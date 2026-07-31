"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { CreateReservationInput } from "@/lib/validation/reservation";

export interface StepRequesterProps {
  register: UseFormRegister<CreateReservationInput>;
  errors: FieldErrors<CreateReservationInput>;
}

export function StepRequester({ register, errors }: StepRequesterProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        label="Nombre completo"
        error={errors.requesterName?.message}
        className="sm:col-span-2"
      >
        <Input placeholder="Ana María Restrepo" {...register("requesterName")} />
      </Field>

      <Field label="Cargo" error={errors.requesterRole?.message}>
        <Input placeholder="Docente, estudiante, coordinador…" {...register("requesterRole")} />
      </Field>

      <Field
        label="Número de documento"
        ayuda="Solo dígitos, sin puntos."
        error={errors.requesterDocId?.message}
      >
        <Input
          inputMode="numeric"
          placeholder="1017234567"
          {...register("requesterDocId")}
        />
      </Field>

      <Field
        label="Correo institucional"
        ayuda="Debe terminar en @amigo.edu.co"
        error={errors.requesterEmail?.message}
        className="sm:col-span-2"
      >
        <Input
          type="email"
          placeholder="nombre.apellido@amigo.edu.co"
          {...register("requesterEmail")}
        />
      </Field>

      <Field
        label="Número de asistentes"
        opcional
        error={errors.attendees?.message}
      >
        <Input type="number" inputMode="numeric" min={1} {...register("attendees")} />
      </Field>

      <Field
        label="Motivo"
        opcional
        error={errors.purpose?.message}
        className="sm:col-span-2"
      >
        <Textarea
          placeholder="Cuéntanos brevemente para qué usarás el espacio."
          {...register("purpose")}
        />
      </Field>
    </div>
  );
}
