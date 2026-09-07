/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      /*
       * `/reservar` dejó de existir: reservar es siempre reservar EN un
       * laboratorio, así que la pantalla vive en /laboratorio/[slug]/reservar.
       * La URL antigua estuvo publicada —la portada enlazaba ahí y el
       * calendario mandaba ahí al tocar una franja—, así que puede estar en
       * marcadores y en el historial de alguien.
       *
       * Va aquí y no como una página con `redirect()` porque eso devolvía un
       * 200 con `<meta http-equiv="refresh">` en vez de un redirect de verdad:
       * `redirect()` en un Server Component salta DESPUÉS de que la shell del
       * layout ya se envió, y para entonces Next ya no puede cambiar el estado
       * de la respuesta. Desde la configuración la redirección ocurre en el
       * enrutado, antes de renderizar nada.
       *
       * `permanent: false` (307) a propósito: un 308 se queda cacheado en el
       * navegador y complicaría reutilizar esta ruta más adelante.
       */
      { source: "/reservar", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
