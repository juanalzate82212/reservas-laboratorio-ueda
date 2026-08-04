import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

/*
 * La frase institucional va en un lugar de descanso —el pie—, no repetida por
 * toda la interfaz (§8 del documento de marca).
 */
export function Footer({ className }: { className?: string }) {
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
          <span>Laboratorio de Analítica de Datos e Inteligencia Artificial</span>
          <a
            href="mailto:lab.analitica@amigo.edu.co"
            className="rounded text-primary hover:underline"
          >
            lab.analitica@amigo.edu.co
          </a>
          <a
            href="https://www.ucatolicaluisamigo.edu.co"
            className="rounded text-primary hover:underline"
          >
            ucatolicaluisamigo.edu.co
          </a>
        </div>
      </div>

      <div className="border-t border-borde px-4 py-4 text-center text-caption text-texto-secundario sm:px-6">
        © {anio} — Aplicación desarrollada por la Unidad de Estrategia del Dato y Analítica.
      </div>
    </footer>
  );
}
