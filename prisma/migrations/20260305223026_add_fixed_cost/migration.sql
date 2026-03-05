-- CreateTable
CREATE TABLE "user_fixed_costs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "roomRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "khalaBill" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "wifiBill" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "electricity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gasBill" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "waterBill" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherBill" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalFixedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "user_fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_fixed_costs_memberId_key" ON "user_fixed_costs"("memberId");

-- AddForeignKey
ALTER TABLE "user_fixed_costs" ADD CONSTRAINT "user_fixed_costs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "house_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_fixed_costs" ADD CONSTRAINT "user_fixed_costs_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
