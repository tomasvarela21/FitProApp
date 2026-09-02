-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Routine_isTemplate_idx" ON "Routine"("isTemplate");
