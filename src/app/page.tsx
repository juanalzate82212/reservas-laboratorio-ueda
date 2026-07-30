/*
 * Marcador de posición. La landing pública real (dos calendarios + CTA) se
 * construye en la Fase 3 del plan.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <p className="text-caption font-medium uppercase tracking-widest text-texto-secundario">
        Universidad Católica Luis Amigó
      </p>
      <h1 className="font-display text-h1 font-semibold text-primary">
        Reservas Laboratorio UEDA
      </h1>
      <p className="text-body-l text-texto">
        Andamiaje en curso. La landing con los calendarios de disponibilidad
        llega en la Fase 3.
      </p>
    </main>
  );
}
