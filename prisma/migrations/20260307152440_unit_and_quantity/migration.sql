-- CreateEnum
CREATE TYPE "ExpenseUnit" AS ENUM ('KG', 'LITRE', 'PIECE', 'PACKET', 'GRAM', 'DOZEN');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "quantity" DECIMAL(10,2),
ADD COLUMN     "unit" "ExpenseUnit" DEFAULT 'KG';
