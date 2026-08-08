"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  isReservationCodeShape,
  normalizeReservationCode,
} from "@/lib/reservation-code";

export const MENSAJE_CODIGO_INVALIDO =
  "Un código son 5 caracteres después de UEDA-, como UEDA-7F3K2. Revisa lo que escribiste.";

/*
 * Se valida la FORMA aquí antes de navegar: un código de largo equivocado o
 * con caracteres que el alfabeto no usa no puede existir, y decirlo al
 * instante es mejor que ir al servidor a por un "no encontramos". Que exista
 * de verdad ya lo resuelve /reserva/[codigo].
 *
 * El <form> es un GET de verdad hacia /reserva, no solo un onSubmit: entre que
 * la página pinta y que React hidrata hay una ventana —corta en una oficina,
 * no tanto en un móvil con la red del campus— en la que el handler todavía no
 * está enlazado. Sin action, pulsar "Consultar estado" en esa ventana hacía un
 * envío nativo que recargaba la misma página sin ir a ninguna parte: un botón
 * que no hace nada. Con el action, ese mismo envío llega a /reserva?codigo=…,
 * que el servidor resuelve y redirige. Lo de aquí queda como mejora: evita el
 * viaje al servidor cuando sí hay JavaScript.
 */
export function ConsultaCodigoForm({
  valorInicial = "",
  errorInicial,
}: {
  valorInicial?: string;
  errorInicial?: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorInicial);
  const [error, setError] = useState<string | null>(errorInicial ?? null);
  const [navegando, iniciarNavegacion] = useTransition();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    const codigo = normalizeReservationCode(valor);
    if (!isReservationCodeShape(codigo)) {
      evento.preventDefault();
      setError(MENSAJE_CODIGO_INVALIDO);
      return;
    }

    evento.preventDefault();
    setError(null);
    iniciarNavegacion(() => router.push(`/reserva/${codigo}`));
  }

  return (
    <form
      action="/reserva"
      method="get"
      onSubmit={enviar}
      className="flex flex-col gap-4"
      noValidate
    >
      <Field
        label="Código de la reserva"
        ayuda="Es el que apareció al enviar tu solicitud. Da igual si lo escribes con o sin «UEDA-»."
        error={error ?? undefined}
      >
        <Input
          // name: sin él, el envío nativo previo a la hidratación no llevaría
          // el código en la query y el servidor no tendría qué resolver.
          name="codigo"
          value={valor}
          onChange={(evento) => {
            setValor(evento.target.value);
            if (error) setError(null);
          }}
          placeholder="UEDA-7F3K2"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="uppercase"
        />
      </Field>

      <div>
        <Button type="submit" cargando={navegando}>
          Consultar estado
        </Button>
      </div>
    </form>
  );
}
