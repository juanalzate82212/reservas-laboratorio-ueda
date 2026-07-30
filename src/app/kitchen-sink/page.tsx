"use client";

/*
 * PÁGINA TEMPORAL — se elimina en la Fase 10 (paso 6 del plan).
 * Sirve para verificar de un vistazo que todos los componentes respetan los
 * tokens de marca en todos sus estados.
 */

import { AlertTriangle, CalendarCheck, Ban, Clock } from "lucide-react";
import { toast } from "sonner";

import { ArcoDecorativo } from "@/components/brand/ArcoDecorativo";
import { Footer } from "@/components/brand/Footer";
import { Header } from "@/components/brand/Header";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const COLORES = [
  { nombre: "primary", clase: "bg-primary", texto: "text-white", hex: "#007B99" },
  { nombre: "primary-hover", clase: "bg-primary-hover", texto: "text-white", hex: "#00647D" },
  { nombre: "primary-active", clase: "bg-primary-active", texto: "text-white", hex: "#004E61" },
  { nombre: "azul-200", clase: "bg-azul-200", texto: "text-texto", hex: "#99CBD6" },
  { nombre: "primary-soft", clase: "bg-primary-soft", texto: "text-texto", hex: "#E6F2F5" },
  { nombre: "accent", clase: "bg-accent", texto: "text-texto", hex: "#F39200" },
  { nombre: "accent-hover", clase: "bg-accent-hover", texto: "text-white", hex: "#C77700" },
  { nombre: "accent-soft", clase: "bg-accent-soft", texto: "text-texto", hex: "#FDE6C7" },
  { nombre: "gris", clase: "bg-gris", texto: "text-white", hex: "#848585" },
  { nombre: "superficie", clase: "bg-superficie", texto: "text-texto", hex: "#F5F5F5" },
  { nombre: "exito", clase: "bg-exito", texto: "text-white", hex: "#2E7D5B" },
  { nombre: "error", clase: "bg-error", texto: "text-white", hex: "#C0392B" },
];

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-borde pb-2">
        <h2 className="font-display text-h2 font-semibold text-texto">{titulo}</h2>
        {nota && <p className="text-caption text-texto-secundario">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

export default function KitchenSink() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h1 font-semibold text-texto">
            Kitchen sink
          </h1>
          <p className="text-body-l text-texto-secundario">
            Página temporal de verificación visual. Se elimina en la Fase 10.
          </p>
        </div>

        <Seccion
          titulo="Color"
          nota="Azul estructura · blanco respira · naranja señala una sola cosa · gris acompaña."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLORES.map((c) => (
              <div
                key={c.nombre}
                className={`flex flex-col gap-1 rounded border border-borde p-3 ${c.clase} ${c.texto}`}
              >
                <span className="text-caption font-medium">{c.nombre}</span>
                <span className="text-caption opacity-80">{c.hex}</span>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion
          titulo="Tipografía"
          nota="Montserrat (display) + Inter (cuerpo). Escala 1.25."
        >
          <div className="flex flex-col gap-3">
            <p className="font-display text-display font-bold">Display 40px</p>
            <p className="font-display text-h1 font-semibold">H1 32px</p>
            <p className="font-display text-h2 font-semibold">H2 25px</p>
            <p className="font-display text-h3 font-medium">H3 20px</p>
            <p className="text-body-l">Body L 18px — texto destacado.</p>
            <p className="text-body">
              Body 16px — base de lectura, interlineado 1.5.
            </p>
            <p className="text-caption text-texto-secundario">
              Caption 13px — metadatos y ayudas.
            </p>
          </div>
        </Seccion>

        <Seccion
          titulo="Botones"
          nota="Sobre naranja el texto va oscuro, nunca blanco. El naranja señala una sola acción por pantalla."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variante="primary">Solicitar reserva</Button>
              <Button variante="secondary">Ver disponibilidad</Button>
              <Button variante="accent">Reservar espacio</Button>
              <Button variante="ghost">Cancelar</Button>
              <Button variante="danger">Rechazar solicitud</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button tamano="sm">Pequeño</Button>
              <Button tamano="md">Mediano</Button>
              <Button tamano="lg">Grande</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Deshabilitado</Button>
              <Button cargando>Enviando solicitud</Button>
              <Button variante="secondary" cargando>
                Cargando
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variante="secondary"
                onClick={() => toast.success("Reserva confirmada")}
              >
                Toast de éxito
              </Button>
              <Button
                variante="secondary"
                onClick={() =>
                  toast.error("Esa franja acaba de ser reservada, elige otra")
                }
              >
                Toast de error
              </Button>
            </div>
          </div>
        </Seccion>

        <Seccion
          titulo="Formularios"
          nota="Field enlaza label, ayuda y error con el control automáticamente."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Nombre completo"
              ayuda="Como aparece en tu documento de identidad."
            >
              <Input placeholder="Ana María Restrepo" />
            </Field>

            <Field
              label="Correo institucional"
              error="Usa tu correo institucional (@amigo.edu.co) para solicitar una reserva."
            >
              <Input defaultValue="ana@gmail.com" type="email" />
            </Field>

            <Field label="Sala">
              <Select defaultValue="">
                <option value="" disabled>
                  Elige una sala
                </option>
                <option value="sala-principal">Sala Principal (20 personas)</option>
                <option value="sala-reuniones">
                  Sala de Reuniones (7 personas)
                </option>
              </Select>
            </Field>

            <Field label="Número de documento" ayuda="Solo dígitos, sin puntos.">
              <Input inputMode="numeric" defaultValue="1017234567" />
            </Field>

            <Field label="Motivo" opcional className="sm:col-span-2">
              <Textarea placeholder="Cuéntanos brevemente para qué usarás el espacio." />
            </Field>

            <Field label="Campo deshabilitado">
              <Input disabled defaultValue="No editable" />
            </Field>
          </div>
        </Seccion>

        <Seccion
          titulo="Estados del calendario"
          nota="Cada estado lleva refuerzo no cromático además del color."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge tono="info" icono={<CalendarCheck aria-hidden className="h-3.5 w-3.5" />}>
              Reservado
            </Badge>
            <Badge tono="revision" icono={<Clock aria-hidden className="h-3.5 w-3.5" />}>
              En revisión
            </Badge>
            <Badge
              tono="advertencia"
              icono={<AlertTriangle aria-hidden className="h-3.5 w-3.5" />}
            >
              Sin préstamo de equipos
            </Badge>
            <Badge tono="bloqueado" icono={<Ban aria-hidden className="h-3.5 w-3.5" />}>
              No disponible
            </Badge>
            <Badge tono="neutral">Cerrado</Badge>
            <Badge tono="exito">Confirmada</Badge>
            <Badge tono="error">Rechazada</Badge>
          </div>
        </Seccion>

        <Seccion titulo="Tarjetas y estados vacíos">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                titulo="Sala Principal"
                descripcion="Aforo 20 · con equipos de cómputo"
                accion={<Badge tono="info">Activa</Badge>}
              />
              <CardBody className="flex flex-col gap-3">
                <p className="text-body text-texto">
                  Lunes a viernes, 8:00–12:00 y 13:00–17:00.
                </p>
                <div>
                  <Button tamano="sm">Ver disponibilidad</Button>
                </div>
              </CardBody>
            </Card>

            <EmptyState
              titulo="No hay solicitudes pendientes"
              descripcion="Cuando alguien solicite una reserva, aparecerá aquí para que la revises."
              accion={<Button variante="secondary">Ver todas las reservas</Button>}
            />
          </div>
        </Seccion>

        <Seccion
          titulo="Gesto de marca"
          nota="Un solo arco protagonista por pantalla. Aquí conviven solo para verlos."
        >
          <div className="flex flex-wrap items-center gap-8 rounded border border-borde bg-superficie p-8">
            <ArcoDecorativo className="h-20 w-20" />
            <ArcoDecorativo color="azul" className="h-20 w-20" />
            <ArcoDecorativo forma="anillo-fragmentado" className="h-20 w-20" />
            <ArcoDecorativo
              forma="anillo-fragmentado"
              color="azul"
              className="h-20 w-20 animate-spin [animation-duration:2s]"
            />
          </div>
        </Seccion>

        <Seccion titulo="Logo" nota="Placeholder tipográfico hasta recibir el SVG oficial (riesgo R3).">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-6 rounded border border-borde p-6">
              <Logo />
              <Logo compacto />
            </div>
            <div className="flex flex-wrap items-center gap-6 rounded bg-primary p-6">
              <Logo variante="blanco" />
              <Logo variante="blanco" compacto />
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Cabecera en banda azul">
          <Header variante="azul">
            <Button variante="accent" tamano="sm">
              Reservar espacio
            </Button>
          </Header>
        </Seccion>
      </main>

      <Footer />
    </div>
  );
}
