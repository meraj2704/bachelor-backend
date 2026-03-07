/*
  Warnings:

  - You are about to drop the column `breakfast` on the `meal_logs` table. All the data in the column will be lost.
  - You are about to alter the column `lunch` on the `meal_logs` table. The data in that column could be lost. The data in that column will be cast from `Decimal(3,1)` to `Decimal(2,1)`.
  - You are about to alter the column `dinner` on the `meal_logs` table. The data in that column could be lost. The data in that column will be cast from `Decimal(3,1)` to `Decimal(2,1)`.

*/
-- AlterTable
ALTER TABLE "meal_logs" DROP COLUMN "breakfast",
ADD COLUMN     "guestDinner" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guestLunch" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "lunch" SET DEFAULT 1.0,
ALTER COLUMN "lunch" SET DATA TYPE DECIMAL(2,1),
ALTER COLUMN "dinner" SET DEFAULT 1.0,
ALTER COLUMN "dinner" SET DATA TYPE DECIMAL(2,1),
ALTER COLUMN "totalDay" SET DEFAULT 2.0,
ALTER COLUMN "totalDay" SET DATA TYPE DECIMAL(4,1);
