/*
 * Marcador de posición. La bandeja de solicitudes real (lista, filtros por
 * estado y sala) se construye en la Fase 6 del plan.
 */
export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-h1 font-semibold text-texto">
        Bandeja de solicitudes
      </h1>
      <p className="text-body text-texto-secundario">
        Se construye en la Fase 6. Por ahora, esta pantalla confirma que la
        sesión de administrador funciona.
      </p>
    </div>
  );
}
