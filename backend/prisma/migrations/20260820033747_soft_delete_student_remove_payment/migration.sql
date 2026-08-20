/*
  Warnings:

  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_trainerId_fkey";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "public"."Payment";
