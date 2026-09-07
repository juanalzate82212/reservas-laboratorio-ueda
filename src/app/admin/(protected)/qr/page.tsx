"use client";

import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/*
 * NEXT_PUBLIC_APP_URL se reemplaza en build time (no es un valor que cambie
 * por petición), así que esta página no necesita `force-dynamic` ni tocar la
 * base de datos — puede quedar estática.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default function QrPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-h2 font-semibold text-texto">
            Código QR
          </h1>
          <p className="text-body text-texto-secundario">
            Imprímelo y colócalo en la entrada del laboratorio.
          </p>
        </div>
        <Button type="button" onClick={() => window.print()}>
          <Printer aria-hidden className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {!APP_URL ? (
        <p role="alert" className="text-caption text-error print:hidden">
          Falta configurar NEXT_PUBLIC_APP_URL: el QR no se puede generar sin
          la URL pública.
        </p>
      ) : (
        <Card className="mx-auto flex w-full max-w-md flex-col items-center gap-6 p-10 print:max-w-none print:border-none print:p-0 print:shadow-none">
          <Logo />

          {/*
           * El tamaño de impresión se fija por CSS, no con el prop `size`.
           * `size` marca los atributos width/height del <svg>, y ese valor
           * tiene que seguir siendo 280 en pantalla para no romper la tarjeta
           * del panel. Como QRCodeSVG dibuja con `viewBox`, una clase de
           * ancho lo reescala sin perder nitidez — es un vector, no un mapa
           * de bits, así que ampliarlo no lo degrada.
           *
           * 14cm sale de la caja imprimible real: `@page` en globals.css
           * declara `size: letter` con `margin: 1in`, así que quedan 6.5in
           * (16.5cm) de ancho útil. `print:max-w-full` es el seguro por si
           * alguien cambia esos márgenes: el QR se encoge antes que salirse
           * de la hoja.
           */}
          <QRCodeSVG
            value={APP_URL}
            size={280}
            level="M"
            marginSize={2}
            title="Código QR para reservar un laboratorio"
            className="h-auto w-[280px] print:w-[14cm] print:max-w-full"
          />

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-display text-h2 font-semibold text-texto">
              Escanea para reservar
            </p>
            {/*
              El QR lleva al portal, no a un laboratorio concreto: nombrar uno
              aquí haría creer que este cartel solo sirve para ese. Ver
              PLAN-MULTI-LAB.md.
            */}
            <p className="max-w-xs text-body text-texto-secundario">
              Elige tu laboratorio y consulta su disponibilidad
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
