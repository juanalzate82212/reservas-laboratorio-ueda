import Image from "next/image";

import { cn } from "@/lib/utils";

import logoUclam from "./logo-uclam.png";

/*
 * Logo oficial. Se pidió en SVG y llegó en PNG; se usa tal cual, sin
 * reescalar ni recolorear.
 *
 * El fichero SÍ trae canal alfa (RGBA de verdad: 68 % de los píxeles a
 * alfa 0 y más de ocho mil en valores intermedios, o sea bordes
 * suavizados). Antes no: la primera versión llevaba el fondo blanco
 * horneado y se notaba como un rectángulo blanco sobre la superficie gris
 * del pie. Por eso ya no hay que compensar nada sobre fondos claros.
 *
 * ⚠️ Pero la tarjeta blanca de variante="blanco" SE QUEDA, y ahora es una
 * decisión y no un apaño. La tinta del logo es azul y naranja oscuros;
 * sobre el azul de marca (#007B99 — cabecera del panel, splash de login)
 * quedaría ilegible. El documento de identidad pide para eso la versión
 * del logo en blanco (§4.2), que no tenemos, y admite como alternativa
 * meterlo en una pestaña o tarjeta blanca (§4.3). Eso es esta tarjeta.
 *
 * Es decir: quitar la transparencia ya no arregla nada, y quitar la
 * tarjeta rompería las dos pantallas azules.
 */
export interface LogoProps {
  variante?: "positivo" | "blanco";
  /** Marca reducida para cabeceras compactas y móvil (§4.2: bajo ~140px). */
  compacto?: boolean;
  className?: string;
}

export function Logo({
  variante = "positivo",
  compacto = false,
  className,
}: LogoProps) {
  const sobreFondoAzul = variante === "blanco";
  const alto = compacto ? 28 : 40;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded",
        sobreFondoAzul && "bg-white px-2 py-1 shadow-card",
        className,
      )}
    >
      <Image
        src={logoUclam}
        alt="Universidad Católica Luis Amigó"
        height={alto}
        style={{ height: alto, width: "auto" }}
        priority
      />
    </span>
  );
}
