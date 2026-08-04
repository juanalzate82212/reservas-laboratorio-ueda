"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { fromBogota } from "@/lib/datetime";

export interface TimeBlockFormValues {
  roomId: string | null;
  startsAt: string;
  endsAt: string;
  kind: "BLOCKED" | "WARNING";
  reason: string;
}

export interface TimeBlockFormProps {
  rooms: Array<{ id: string; name: string }>;
  enviando: boolean;
  onSubmit: (values: TimeBlockFormValues) => void;
}

const CAMPOS_VACIOS = {
  salaId: "",
  tipo: "BLOCKED" as "BLOCKED" | "WARNING",
  fechaInicio: "",
  horaInicio: "",
  fechaFin: "",
  horaFin: "",
  motivo: "",
};

/*
 * A diferencia del wizard público, una franja la crea el admin y puede
 * abarcar varios días (ej. "semana de receso") — por eso pide fecha de
 * inicio y fecha de fin por separado, en vez de un solo día + duración.
 */
export function TimeBlockForm({ rooms, enviando, onSubmit }: TimeBlockFormProps) {
  const [campos, setCampos] = useState(CAMPOS_VACIOS);

  function actualizar<K extends keyof typeof CAMPOS_VACIOS>(campo: K, valor: (typeof CAMPOS_VACIOS)[K]) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  function manejarEnvio(event: FormEvent) {
    event.preventDefault();

    const startsAt = fromBogota(campos.fechaInicio, campos.horaInicio).toISOString();
    const endsAt = fromBogota(campos.fechaFin, campos.horaFin).toISOString();

    onSubmit({
      roomId: campos.salaId || null,
      startsAt,
      endsAt,
      kind: campos.tipo,
      reason: campos.motivo,
    });
  }

  return (
    <form onSubmit={manejarEnvio} className="grid gap-5 sm:grid-cols-2">
      <Field label="Sala">
        <Select value={campos.salaId} onChange={(e) => actualizar("salaId", e.target.value)}>
          <option value="">Todas las salas</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tipo">
        <Select
          value={campos.tipo}
          onChange={(e) => actualizar("tipo", e.target.value as "BLOCKED" | "WARNING")}
        >
          <option value="BLOCKED">Bloqueada (no reservable)</option>
          <option value="WARNING">Aviso (sigue siendo reservable)</option>
        </Select>
      </Field>

      <Field label="Fecha de inicio">
        <Input
          type="date"
          required
          value={campos.fechaInicio}
          onChange={(e) => actualizar("fechaInicio", e.target.value)}
        />
      </Field>

      <Field label="Hora de inicio">
        <Input
          type="time"
          required
          value={campos.horaInicio}
          onChange={(e) => actualizar("horaInicio", e.target.value)}
        />
      </Field>

      <Field label="Fecha de fin">
        <Input
          type="date"
          required
          value={campos.fechaFin}
          onChange={(e) => actualizar("fechaFin", e.target.value)}
        />
      </Field>

      <Field label="Hora de fin">
        <Input
          type="time"
          required
          value={campos.horaFin}
          onChange={(e) => actualizar("horaFin", e.target.value)}
        />
      </Field>

      <Field label="Motivo" ayuda="Lo verá quien consulte el calendario." className="sm:col-span-2">
        <Textarea
          required
          placeholder="Mantenimiento preventivo de los equipos de cómputo."
          value={campos.motivo}
          onChange={(e) => actualizar("motivo", e.target.value)}
        />
      </Field>

      <div className="sm:col-span-2">
        <Button type="submit" cargando={enviando}>
          Crear franja
        </Button>
      </div>
    </form>
  );
}
