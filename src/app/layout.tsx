import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

/*
 * Reemplazos web de las tipografías institucionales (§3.2 del documento de
 * marca): Azo Sans → Montserrat para display, Helvetica Neue LT Std → Inter
 * para cuerpo. Las oficiales son de licencia comercial y no se incrustan.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reservas Laboratorio de Analítica de Datos e Inteligencia Artificial",
  description:
    "Consulta la disponibilidad de las salas del Laboratorio de Analítica de Datos e Inteligencia Artificial y solicita tu reserva.",
};

export const viewport: Viewport = {
  themeColor: "#007B99",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} ${inter.variable}`}>
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ className: "font-body" }}
        />
      </body>
    </html>
  );
}
