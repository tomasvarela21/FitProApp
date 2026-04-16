/*
  Warnings:

  - Added the required column `totalAmount` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "frequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "installmentCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Remove default after backfill
ALTER TABLE "Subscription" ALTER COLUMN "totalAmount" DROP DEFAULT;
