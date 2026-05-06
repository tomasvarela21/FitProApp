/*
  Warnings:

  - Changed the type of `dayOfWeek` on the `RoutineExercise` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "RoutineExercise" DROP COLUMN "dayOfWeek",
ADD COLUMN     "dayOfWeek" "DayOfWeek" NOT NULL;

-- CreateIndex
CREATE INDEX "RoutineExercise_dayOfWeek_idx" ON "RoutineExercise"("dayOfWeek");
