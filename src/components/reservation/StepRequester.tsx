"use client";

import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ACADEMIC_PROGRAMS,
  ACTIVITY_TYPES,
  REQUESTER_ROLES,
} from "@/config/reservationOptions";
import type { CreateReservationInput } from "@/lib/validation/reservation";

export interface StepRequesterProps {
  register: UseFormRegister<CreateReservationInput>;
  control: Control<CreateReservationInput>;
  errors: FieldErrors<CreateReservationInput>;
  /** Aforo de la sala: es el tope de asistentes, y sale de la BD. */
  maxAttendees: number;
}

export function StepRequester({
  register,
  control,
  errors,
  maxAttendees,
}: StepRequesterProps) {
  const activityType = useWatch({ control, name: "activityType" });

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
        <Select defaultValue="" {...register("requesterRole")}>
          <option value="" disabled>
            Selecciona tu cargo
          </option>
          {REQUESTER_ROLES.map((cargo) => (
            <option key={cargo.value} value={cargo.value}>
              {cargo.label}
            </option>
          ))}
        </Select>
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
        label="Programa académico"
        error={errors.academicProgram?.message}
        className="sm:col-span-2"
      >
        <Select defaultValue="" {...register("academicProgram")}>
          <option value="" disabled>
            Selecciona tu programa
          </option>
          {ACADEMIC_PROGRAMS.map((programa) => (
            <option key={programa.value} value={programa.value}>
              {programa.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Tipo de actividad"
        error={errors.activityType?.message}
        className={activityType === "OTRO" ? undefined : "sm:col-span-2"}
      >
        <Select defaultValue="" {...register("activityType")}>
          <option value="" disabled>
            Selecciona el tipo de actividad
          </option>
          {ACTIVITY_TYPES.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </Select>
      </Field>

      {activityType === "OTRO" && (
        <Field
          label="¿Cuál actividad?"
          error={errors.activityTypeOther?.message}
        >
          <Input placeholder="Describe brevemente la actividad" {...register("activityTypeOther")} />
        </Field>
      )}

      <Field
        label="Número de asistentes"
        ayuda={`Cantidad estimada. La sala admite hasta ${maxAttendees}.`}
        error={errors.attendees?.message}
      >
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={maxAttendees}
          placeholder={`Ej: ${Math.max(1, Math.floor(maxAttendees / 2))}`}
          {...register("attendees")}
        />
      </Field>

      <div className="sm:col-span-2">
        <Checkbox
          label="Al registrar este formulario, me hago responsable del uso adecuado del laboratorio y de los equipos, los cuales recibo en buen estado y me comprometo a entregar en las mismas condiciones. Reportaré de inmediato al administrador cualquier daño, falla o novedad que se presente durante el uso del espacio."
          error={errors.responsibilityAccepted?.message}
          {...register("responsibilityAccepted")}
        />
      </div>
    </div>
  );
}
