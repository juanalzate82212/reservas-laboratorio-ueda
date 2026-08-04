"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ArcoDecorativo } from "@/components/brand/ArcoDecorativo";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

const loginSchema = z.object({
  password: z.string().min(1, "Ingresa la contraseña."),
});
type LoginInput = z.infer<typeof loginSchema>;

/*
 * Patrón "splash/login" del §6-7 del documento de marca: fondo azul pleno,
 * logo centrado en blanco (única excepción a "el logo vive en la cabecera"),
 * textura sutil de fondo (§5.2) hecha con ArcoDecorativo en blanco a baja
 * opacidad — no hay asset oficial de la textura todavía, así que se aproxima
 * con el mismo gesto de marca ya usado en el resto de la app.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        toast.error(cuerpo?.error?.message ?? "No se pudo iniciar sesión.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4">
      <ArcoDecorativo
        forma="anillo-fragmentado"
        color="blanco"
        className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 opacity-10"
      />
      <ArcoDecorativo
        forma="arco"
        color="blanco"
        className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 opacity-10"
      />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <Logo variante="blanco" />

        <div className="w-full rounded bg-fondo p-8 shadow-card">
          <div className="mb-6 flex flex-col gap-1 text-center">
            <h1 className="font-display text-h3 font-semibold text-texto">
              Acceso de administrador
            </h1>
            <p className="text-caption text-texto-secundario">
              Laboratorio de Analítica de Datos e Inteligencia Artificial
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Field label="Contraseña" error={errors.password?.message}>
              <Input
                type="password"
                autoFocus
                autoComplete="current-password"
                {...register("password")}
              />
            </Field>

            <Button type="submit" cargando={enviando} className="mt-2">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
