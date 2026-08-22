import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/*
 * Vitest NO sustituye la verificación por criterios de aceptación que describe
 * CLAUDE.md (prisma studio, curl contra los Route Handlers, check-datetime),
 * que sigue siendo el método principal de este proyecto. La cubre por debajo,
 * en la parte del código que es función pura de sus argumentos y se puede
 * probar con objetos literales — hoy, solo `lib/availability.ts`.
 *
 * ⚠️ Es `.mts` y no `.ts`. El resto del proyecto es CommonJS (no hay
 * `"type": "module"` en package.json, y next.config / postcss / tailwind
 * dependen de ello), así que Vite cargaba este fichero como CJS y avisaba de
 * que `import.meta.url` es sintaxis ESM — algo que dejará de tolerar cuando
 * `configLoader: 'native'` pase a ser el valor por defecto. La extensión
 * `.mts` lo declara ESM sin tocar el resto del repositorio. A cambio hubo que
 * ampliar el `include` de tsconfig.json con el patrón de los ficheros .mts,
 * para que `npm run typecheck` no dejara de mirar este.
 */
export default defineConfig({
  test: {
    // Entorno Node, no jsdom: lo que llega en la fase 1 es dominio y casos de
    // uso sobre repositorios en memoria, sin un solo componente de React. El
    // día que se prueben componentes, ese subconjunto declara su propio
    // entorno con `// @vitest-environment jsdom` en la cabecera del fichero,
    // en vez de pagar jsdom en toda la suite.
    environment: "node",

    // ⚠️ NO poner `passWithNoTests: true`. Sería el atajo evidente para que el
    // paso de CI no falle mientras la suite está casi vacía, pero convierte
    // "no encontré ningún test" en verde: un `include` o un `exclude` mal
    // escritos dejarían de ejecutar la suite entera sin que nadie se entere.
    // Por eso la fase 0 entra con un test de verdad y no con cero.

    // El `include` por defecto de Vitest ya sirve; lo que hace falta es ampliar
    // los `exclude`, porque `.next/` contiene código generado y no está en la
    // lista por defecto.
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.git/**",
      "**/coverage/**",
    ],
  },

  resolve: {
    alias: {
      // El mismo `@/*` que declara `paths` en tsconfig.json. Se escribe a mano
      // en vez de instalar `vite-tsconfig-paths`: es un único mapeo, y una
      // dependencia menos. Si algún día se añade otro alias al tsconfig, hay
      // que reflejarlo aquí — igual que pasa con los tokens de globals.css y
      // tailwind.config.ts.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
