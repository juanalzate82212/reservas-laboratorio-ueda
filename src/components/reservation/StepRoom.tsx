"use client";

import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { ActiveRoom } from "@/lib/rooms";
import { cn } from "@/lib/utils";

export interface StepRoomProps {
  rooms: ActiveRoom[];
  roomId: string;
  onRoomChange: (roomId: string) => void;
  selectedDate: string;
  onDateChange: (dayKey: string) => void;
  minDate: string;
  maxDate: string;
  errorRoom?: string;
}

export function StepRoom({
  rooms,
  roomId,
  onRoomChange,
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
  errorRoom,
}: StepRoomProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-body font-medium text-texto">Elige la sala</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => {
            const seleccionada = room.id === roomId;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onRoomChange(room.id)}
                aria-pressed={seleccionada}
                className="text-left"
              >
                <Card
                  className={cn(
                    "cursor-pointer border-2 p-4 transition-colors",
                    seleccionada
                      ? "border-primary"
                      : "border-borde hover:border-azul-200",
                  )}
                >
                  <p className="font-display text-h3 font-medium text-texto">
                    {room.name}
                  </p>
                  <p className="text-caption text-texto-secundario">
                    Aforo {room.capacity} ·{" "}
                    {room.hasComputers ? "con equipos" : "sin equipos"}
                  </p>
                </Card>
              </button>
            );
          })}
        </div>
        {errorRoom && (
          <p role="alert" className="text-caption text-error">
            {errorRoom}
          </p>
        )}
      </div>

      <Field
        label="Día"
        ayuda="Con un mínimo de 1 hora y un máximo de 60 días de anticipación."
      >
        <Input
          type="date"
          min={minDate}
          max={maxDate}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </Field>
    </div>
  );
}
