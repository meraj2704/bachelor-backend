-- CreateEnum
CREATE TYPE "PayoutCategory" AS ENUM ('GAS_BILL', 'ELECTRICITY', 'WIFI_BILL', 'HOME_RENT', 'MAID_BILL', 'MEMBER_REFUND', 'OTHER');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category" "PayoutCategory",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "month" TEXT;
