-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "sentDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertLog_installmentId_idx" ON "AlertLog"("installmentId");

-- CreateIndex
CREATE INDEX "AlertLog_sentDate_idx" ON "AlertLog"("sentDate");

-- CreateIndex
CREATE UNIQUE INDEX "AlertLog_installmentId_alertType_sentDate_key" ON "AlertLog"("installmentId", "alertType", "sentDate");
