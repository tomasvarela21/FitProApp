-- AlterTable
ALTER TABLE "StudentRoutine" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "weekNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WeeklyExerciseOverride" (
    "id" TEXT NOT NULL,
    "studentRoutineId" TEXT NOT NULL,
    "routineExerciseId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "suggestedWeight" DOUBLE PRECISION,
    "suggestedReps" TEXT,
    "suggestedRpe" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyExerciseOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyExerciseOverride_studentRoutineId_idx" ON "WeeklyExerciseOverride"("studentRoutineId");

-- CreateIndex
CREATE INDEX "WeeklyExerciseOverride_weekNumber_idx" ON "WeeklyExerciseOverride"("weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyExerciseOverride_studentRoutineId_routineExerciseId_w_key" ON "WeeklyExerciseOverride"("studentRoutineId", "routineExerciseId", "weekNumber");

-- AddForeignKey
ALTER TABLE "WeeklyExerciseOverride" ADD CONSTRAINT "WeeklyExerciseOverride_studentRoutineId_fkey" FOREIGN KEY ("studentRoutineId") REFERENCES "StudentRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyExerciseOverride" ADD CONSTRAINT "WeeklyExerciseOverride_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
