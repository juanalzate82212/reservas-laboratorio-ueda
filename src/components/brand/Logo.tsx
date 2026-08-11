import Image from "next/image";

import { cn } from "@/lib/utils";

import logoUclam from "./logo-uclam.png";

/*
 * Logo oficial. Se pidió en SVG y llegó en PNG; se usa tal cual, sin
 * reescalar ni recolorear. El archivo no trae transparencia
 * (confirmado inspeccionando los chunks del PNG: sin tRNS), es decir que
 * ya lleva su propio fondo blanco horneado en la imagen. Sobre una
 * superficie azul (variante="blanco": cabecera del admin, splash de
 * login) eso ya alcanza para verse bien — solo se le añade un poco de
 * padding y esquinas redondeadas para que el fondo blanco se lea como una
 * tarjeta deliberada, no como un recorte accidental.
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
