/*
  Warnings:

  - You are about to drop the column `purpose` on the `Reservation` table. All the data in the column will be lost.
  - Added the required column `academicProgram` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activityType` to the `Reservation` table without a default value. This is not possible if the table is not empty.
  - Made the column `attendees` on table `Reservation` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AcademicProgram" AS ENUM ('INGENIERIA_SISTEMAS', 'INGENIERIA_CIVIL', 'ARQUITECTURA', 'TECNOLOGIA_DESARROLLO_SOFTWARE', 'ESPECIALIZACION_BIG_DATA_BI', 'INGENIERIA_SISTEMAS_APARTADO');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CLASE_PRACTICA', 'TALLER', 'EVALUACION', 'PROYECTO_AULA', 'SEMILLERO_INVESTIGACION', 'OTRO');

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "purpose",
ADD COLUMN     "academicProgram" "AcademicProgram" NOT NULL,
ADD COLUMN     "activityType" "ActivityType" NOT NULL,
ADD COLUMN     "activityTypeOther" TEXT,
ADD COLUMN     "responsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "attendees" SET NOT NULL;
