import type { Config } from "tailwindcss";

/*
 * Mapeo de los tokens de marca (identidad-visual-ucla-ui-ux.md §12) a utilidades
 * de Tailwind. Esta es la fuente de verdad para los componentes: ningún hex
 * suelto fuera de este archivo y del bloque :root de globals.css.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Escalas de marca
        azul: {
          50: "#E6F2F5",
          200: "#99CBD6",
          500: "#007B99",
          700: "#00647D",
          900: "#004E61",
          DEFAULT: "#007B99",
        },
        naranja: {
          100: "#FDE6C7",
          500: "#F39200",
          700: "#C77700",
          // Naranja como TEXTO sobre fondo claro. Ver globals.css.
          texto: "#9A5C00",
          DEFAULT: "#F39200",
        },
        gris: "#848585",

        // Semánticos: azul estructura, naranja señala
        primary: {
          DEFAULT: "#007B99",
          hover: "#00647D",
          active: "#004E61",
          soft: "#E6F2F5",
          /*
           * Azul de marca como TEXTO sobre fondo claro. #007B99 no llega a
           * WCAG AA en texto pequeño sobre ninguna superficie clara nuestra
           * (4.28–4.89 frente al 4.5 exigido); este sí (5.89–6.73). Ver el
           * comentario largo en globals.css.
           *
           * Azul de FONDO, icono o borde → `primary`. Azul de TEXTO → este.
           */
          texto: "#00647D",
        },
        accent: {
          DEFAULT: "#F39200",
          /*
           * Aclara en vez de oscurecer, al revés que `primary`: sobre naranja
           * el texto va oscuro, así que oscurecer el fondo hunde el contraste.
           * Con el #C77700 anterior el botón caía a 3.92 en hover. Ver
           * globals.css.
           */
          hover: "#E08600",
          soft: "#FDE6C7",
          // Naranja como TEXTO o icono legible sobre fondo claro.
          texto: "#9A5C00",
        },

        // Neutrales
        texto: {
          DEFAULT: "#2E2E2E",
          // El gris de marca #848585 se queda en `gris` (arriba) para
          // gráficos; como texto no pasa AA. Ver globals.css.
          secundario: "#6F7070",
        },
        borde: "#E1E1E1",
        superficie: "#F5F5F5",
        fondo: "#FFFFFF",
        negro: "#111111",

        // Estados del sistema (fuera de marca — nunca sobre el logo)
        exito: "#2E7D5B",
        error: "#C0392B",
        advertencia: "#F39200",
        info: "#007B99",
      },

      fontFamily: {
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      // Escala 1.25 del §3.3 del documento de marca
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.15" }],
        h1: ["2rem", { lineHeight: "1.2" }],
        h2: ["1.563rem", { lineHeight: "1.2" }],
        h3: ["1.25rem", { lineHeight: "1.25" }],
        "body-l": ["1.125rem", { lineHeight: "1.5" }],
        body: ["1rem", { lineHeight: "1.5" }],
        caption: ["0.813rem", { lineHeight: "1.5" }],
      },

      borderRadius: {
        DEFAULT: "8px",
        pill: "999px",
      },

      boxShadow: {
        card: "0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
