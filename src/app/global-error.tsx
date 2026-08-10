"use client";

/*
 * Último recurso: se muestra cuando falla el propio layout raíz, el único
 * fallo que error.tsx no puede capturar. Al reemplazar ese layout, este
 * archivo tiene que declarar su propio <html> y <body>.
 *
 * ⚠️ Estilos EN LÍNEA y con los hex de marca escritos a mano, rompiendo a
 * propósito la regla de "ningún hex suelto en componentes" de CLAUDE.md. El
 * motivo: quien aplica las variables de fuente de next/font y quien importa
 * globals.css es exactamente el layout que acaba de fallar. Depender de esa
 * cadena para dibujar el fallo de esa misma cadena es frágil — si lo que se
 * rompió fue el CSS, esta pantalla saldría sin estilo ninguno. Escrita así se
 * renderiza siempre, aunque no quede nada más en pie.
 *
 * Por eso mismo NO importar aquí globals.css, ni Header/Footer, ni ningún
 * componente del proyecto: cada import es una forma nueva de que esta
 * pantalla falle también.
 *
 * Los valores salen del §12.1 del documento de marca:
 *   #007B99 primary · #2E2E2E texto · #848585 secundario
 *   #FFFFFF fondo   · #E1E1E1 borde · #F5F5F5 superficie
 */

const FUENTE =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, backgroundColor: "#F5F5F5", fontFamily: FUENTE }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "32rem",
              width: "100%",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E1E1E1",
              borderRadius: "8px",
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "1.563rem",
                lineHeight: 1.2,
                fontWeight: 600,
                color: "#2E2E2E",
              }}
            >
              No pudimos cargar la aplicación
            </h1>

            <p
              style={{
                margin: "0 0 24px",
                fontSize: "1rem",
                lineHeight: 1.5,
                color: "#848585",
              }}
            >
              Ocurrió un problema inesperado. Vuelve a intentarlo en unos momentos.
            </p>

            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "44px",
                padding: "0 24px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#007B99",
                color: "#FFFFFF",
                fontSize: "1rem",
                fontWeight: 500,
                fontFamily: FUENTE,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>

            {error.digest && (
              <p
                style={{
                  margin: "24px 0 0",
                  fontSize: "0.813rem",
                  lineHeight: 1.5,
                  color: "#848585",
                }}
              >
                Código del error: {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
