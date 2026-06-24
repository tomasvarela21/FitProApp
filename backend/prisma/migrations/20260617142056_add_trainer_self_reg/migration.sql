-- CreateEnum
CREATE TYPE "TrainerSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "subscriptionStatus" "TrainerSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrainerVerification" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainerVerification_tokenHash_key" ON "TrainerVerification"("tokenHash");

-- CreateIndex
CREATE INDEX "TrainerVerification_trainerId_idx" ON "TrainerVerification"("trainerId");

-- AddForeignKey
ALTER TABLE "TrainerVerification" ADD CONSTRAINT "TrainerVerification_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
