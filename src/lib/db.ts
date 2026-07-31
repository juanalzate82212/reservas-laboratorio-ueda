import { PrismaClient } from "@prisma/client";

/*
 * Singleton de PrismaClient.
 *
 * En serverless cada invocación puede reutilizar el módulo, y en desarrollo el
 * hot reload de Next reevalúa los módulos en cada cambio. Sin este patrón se
 * crea un cliente nuevo cada vez y se agota el pool de conexiones de Supabase
 * —que en la capa gratuita es pequeño— con el error "too many connections".
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
