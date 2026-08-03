"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";

export function AdminLogoutButton() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("No se pudo cerrar la sesión. Intenta de nuevo.");
      setSaliendo(false);
    }
  }

  return (
    <Button
      type="button"
      variante="ghost"
      tamano="sm"
      cargando={saliendo}
      onClick={salir}
      className="text-white hover:bg-white/10 hover:text-white"
    >
      Salir
    </Button>
  );
}
