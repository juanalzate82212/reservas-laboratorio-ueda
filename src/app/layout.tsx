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

const TITULO = "Reservas Laboratorio de Analítica de Datos e Inteligencia Artificial";
const DESCRIPCION =
  "Consulta la disponibilidad de las salas del Laboratorio de Analítica de Datos e Inteligencia Artificial y solicita tu reserva.";

export const metadata: Metadata = {
  /*
   * Sin metadataBase, Next resuelve la URL de opengraph-image.png contra
   * http://localhost:3000 y avisa en el build. Un og:image apuntando a
   * localhost no lo puede descargar ningún servicio: WhatsApp, Teams o
   * LinkedIn mostrarían el enlace pelado. Se usa la misma variable que
   * codifica el QR, así que si esa está bien, esto también.
   */
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: TITULO,
  description: DESCRIPCION,
  /*
   * La imagen no se declara aquí: Next la toma de src/app/opengraph-image.png
   * por convención de nombre de fichero, junto con su tamaño, su tipo y el
   * alt de opengraph-image.alt.txt. Ver scripts/generar-imagenes-marca.mjs.
   */
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    siteName: "Laboratorio de Analítica de Datos e Inteligencia Artificial",
    locale: "es_CO",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION },
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
