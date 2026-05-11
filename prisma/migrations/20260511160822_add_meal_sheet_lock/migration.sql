-- CreateTable
CREATE TABLE "meal_sheet_locks" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "lockedById" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_sheet_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_sheet_locks_houseId_month_key" ON "meal_sheet_locks"("houseId", "month");

-- AddForeignKey
ALTER TABLE "meal_sheet_locks" ADD CONSTRAINT "meal_sheet_locks_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_sheet_locks" ADD CONSTRAINT "meal_sheet_locks_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
