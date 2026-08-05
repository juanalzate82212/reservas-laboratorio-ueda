-- Supabase expone automáticamente todas las tablas del schema `public` vía
-- su API REST (PostgREST), protegida solo por Row-Level Security — sin
-- relación con si el código de la app usa esa API o no (esta app no la usa;
-- accede solo vía Prisma con una conexión directa a Postgres). Sin RLS,
-- cualquiera con la URL del proyecto y la llave `anon` (pública por diseño
-- en Supabase) podía leer/escribir estas tablas directo, incluyendo datos
-- personales de Reservation (nombre, documento, correo) que la API propia
-- de la app nunca expone.
--
-- Se habilita RLS sin ninguna política (deny-all para los roles de
-- PostgREST: anon/authenticated). Esto no afecta a la app: Prisma se
-- conecta como el rol `postgres`, que tiene `rolbypassrls = true` y por lo
-- tanto ignora RLS por completo, esté habilitado o no.

ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
