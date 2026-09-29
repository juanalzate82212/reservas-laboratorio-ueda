-- Multi-laboratorio, fase 2: se abre al público el Laboratorio de Redes e
-- Infraestructura.
--
-- Va en su propia migración y no en la de la fase 1 a propósito. La fase 1
-- creó la fila INACTIVA porque `getActiveRoom()` era `rooms[0]` sobre
-- `orderBy: { slug: "asc" }`: mientras existió ese acoplamiento, activar el
-- laboratorio desde los datos podía cambiar qué laboratorio mostraba la
-- portada pública, sin desplegar código y sin un solo error.
--
-- Esa función ya no existe: la portada es el portal y cada laboratorio tiene
-- su ruta /laboratorio/[slug]. Activarlo ya es seguro.
--
-- ⚠️ ORDEN DE DESPLIEGUE: esta migración debe aplicarse DESPUÉS de desplegar
-- el código de la fase 2, no antes. Aplicada contra el código anterior, el
-- laboratorio aparecería en GET /api/rooms sin que exista todavía la página
-- que lo muestra.
UPDATE "Room"
SET "isActive" = true
WHERE "slug" = 'redes-infraestructura';
