-- CreateEnum
CREATE TYPE "BazarCategory" AS ENUM ('MEAT', 'FISH', 'VEGETABLES', 'FRUITS', 'DAIRY', 'GROCERY', 'SPICES', 'BEVERAGES', 'SNACKS', 'OTHER');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "bazarCategory" "BazarCategory";
