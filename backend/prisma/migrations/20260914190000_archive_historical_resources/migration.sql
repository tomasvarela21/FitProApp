-- Archive flags keep resources available to historical relations while allowing
-- them to disappear from future catalogs and assignments.
ALTER TABLE "Exercise" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Routine" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "RoutineExercise" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Exercise_archivedAt_idx" ON "Exercise"("archivedAt");
CREATE INDEX "Routine_archivedAt_idx" ON "Routine"("archivedAt");
CREATE INDEX "RoutineExercise_archivedAt_idx" ON "RoutineExercise"("archivedAt");

-- Historical parents cannot be removed directly while dependent records exist.
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RoutineExercise" DROP CONSTRAINT "RoutineExercise_exerciseId_fkey";
ALTER TABLE "RoutineExercise"
  ADD CONSTRAINT "RoutineExercise_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentRoutine" DROP CONSTRAINT "StudentRoutine_routineId_fkey";
ALTER TABLE "StudentRoutine"
  ADD CONSTRAINT "StudentRoutine_routineId_fkey"
  FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WeeklyExerciseOverride" DROP CONSTRAINT "WeeklyExerciseOverride_routineExerciseId_fkey";
ALTER TABLE "WeeklyExerciseOverride"
  ADD CONSTRAINT "WeeklyExerciseOverride_routineExerciseId_fkey"
  FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_studentRoutineId_fkey";
ALTER TABLE "WorkoutLog"
  ADD CONSTRAINT "WorkoutLog_studentRoutineId_fkey"
  FOREIGN KEY ("studentRoutineId") REFERENCES "StudentRoutine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkoutSet" DROP CONSTRAINT "WorkoutSet_routineExerciseId_fkey";
ALTER TABLE "WorkoutSet"
  ADD CONSTRAINT "WorkoutSet_routineExerciseId_fkey"
  FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
