import Image from "next/image";

import { Logo } from "./Logo";
import logoUeda from "./logo-ueda.svg";
import { cn } from "@/lib/utils";

/*
 * La frase institucional va en un lugar de descanso —el pie—, no repetida por
 * toda la interfaz (§8 del documento de marca).
 *
 * El bloque de contacto es CONTEXTUAL: en una página de laboratorio muestra ese
 * laboratorio y su buzón; en el portal, en el panel y en las pantallas que no
 * pertenecen a ninguno (consultar una reserva por código antes de escribirlo),
 * muestra solo lo institucional. Pasar el laboratorio es responsabilidad de
 * cada página, que es quien sabe en cuál está.
 */
export interface FooterProps {
  /** Laboratorio en cuyo contexto está el usuario. Sin él, pie institucional. */
  laboratorio?: { name: string; contactEmail?: string | null } | null;
  className?: string;
}

export function Footer({ laboratorio, className }: FooterProps) {
  const anio = new Date().getFullYear();

  return (
    <footer className={cn("mt-auto border-t border-borde bg-superficie", className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="max-w-md text-caption text-texto-secundario">
            Formación humana y profesional al servicio del desarrollo y la
            transformación social.
          </p>
        </div>

        <div className="flex flex-col gap-1 text-caption text-texto-secundario sm:text-right">
          {laboratorio && <span>{laboratorio.name}</span>}
          {laboratorio?.contactEmail && (
            <a
              href={`mailto:${laboratorio.contactEmail}`}
              className="rounded text-primary-texto hover:underline"
            >
              {laboratorio.contactEmail}
            </a>
          )}
          <a
            href="https://www.funlam.edu.co"
            className="rounded text-primary-texto hover:underline"
          >
            funlam.edu.co
          </a>
        </div>
      </div>

      {/*
        ⚠️ Este crédito NO es contextual y no debe unificarse con la línea de
        arriba. La Unidad de Estrategia del Dato y Analítica es quien construyó
        la herramienta, no el laboratorio que se está reservando: dice algo
        distinto al resto del producto a propósito, y se mantiene igual en
        todos los laboratorios. Ver CLAUDE.md.

        El isotipo va a 40 px, la misma ALTURA que el logo de la universidad
        de arriba, y aun así queda claramente subordinado: aquel es un lockup
        horizontal de 427×118, o sea ~145 px de ancho a esa altura, frente a
        los 40×40 de este. §4.3 del documento de marca pide "igualdad de tamaño
        y tratamiento" para logos que CONVIVEN en una misma pieza; estos van en
        bandas separadas, así que la jerarquía la marca el ancho.

        No bajarlo de 40. Es un isotipo detallado —barras, cerebro con pistas
        de circuito y anillo partido— y por debajo de esa altura el cerebro se
        convierte en una mancha: comprobado a 32, 40 y 48 px en el navegador
        sobre el build de producción.

        ⚠️ `alt=""` a propósito: el texto que va justo al lado ya nombra la
        unidad. Con un alt descriptivo, un lector de pantalla anunciaría
        "Unidad de Estrategia del Dato y Analítica" dos veces seguidas.

        Sin `priority`: el pie está siempre bajo el pliegue, así que el fichero
        (117 KB, ~41 KB con gzip) se descarga solo si el usuario baja hasta él.
      */}
      <div className="border-t border-borde px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row">
          <Image
            src={logoUeda}
            alt=""
            height={40}
            style={{ height: 40, width: 40 }}
          />
          <p className="text-center text-caption text-texto-secundario">
            © {anio} — Aplicación desarrollada por la Unidad de Estrategia del
            Dato y Analítica.
          </p>
        </div>
      </div>
    </footer>
  );
}
