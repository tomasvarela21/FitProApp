-- Preserve the commercial terms accepted when a subscription was created.
ALTER TABLE "Subscription"
ADD COLUMN "planName" TEXT,
ADD COLUMN "planDuration" "PlanDuration";

UPDATE "Subscription" AS subscription
SET
  "planName" = plan."name",
  "planDuration" = plan."duration"
FROM "Plan" AS plan
WHERE subscription."planId" = plan."id";

ALTER TABLE "Subscription"
ALTER COLUMN "planName" SET NOT NULL,
ALTER COLUMN "planDuration" SET NOT NULL;

-- Preserve the routine and prescription as they existed when each session was logged.
ALTER TABLE "WorkoutLog"
ADD COLUMN "routineId" TEXT,
ADD COLUMN "routineName" TEXT;

UPDATE "WorkoutLog" AS log
SET
  "routineId" = routine."id",
  "routineName" = routine."name"
FROM "StudentRoutine" AS assignment
JOIN "Routine" AS routine ON routine."id" = assignment."routineId"
WHERE log."studentRoutineId" = assignment."id";

ALTER TABLE "WorkoutLog"
ALTER COLUMN "routineId" SET NOT NULL,
ALTER COLUMN "routineName" SET NOT NULL;

ALTER TABLE "WorkoutSet"
ADD COLUMN "exerciseId" TEXT,
ADD COLUMN "exerciseName" TEXT,
ADD COLUMN "exerciseOrder" INTEGER,
ADD COLUMN "exerciseMuscleGroupName" TEXT,
ADD COLUMN "routineDayOfWeek" "DayOfWeek",
ADD COLUMN "prescribedSets" INTEGER,
ADD COLUMN "prescribedReps" TEXT,
ADD COLUMN "prescribedWeight" DOUBLE PRECISION,
ADD COLUMN "prescribedRpe" DOUBLE PRECISION,
ADD COLUMN "prescribedRestSeconds" INTEGER,
ADD COLUMN "prescribedNotes" TEXT;

UPDATE "WorkoutSet" AS workout_set
SET
  "exerciseId" = exercise."id",
  "exerciseName" = exercise."name",
  "exerciseOrder" = routine_exercise."order",
  "exerciseMuscleGroupName" = muscle_group."name",
  "routineDayOfWeek" = routine_exercise."dayOfWeek",
  "prescribedSets" = routine_exercise."sets",
  "prescribedReps" = routine_exercise."reps",
  "prescribedWeight" = routine_exercise."suggestedWeight",
  "prescribedRpe" = routine_exercise."suggestedRpe",
  "prescribedRestSeconds" = routine_exercise."restSeconds",
  "prescribedNotes" = routine_exercise."notes"
FROM "RoutineExercise" AS routine_exercise
JOIN "Exercise" AS exercise ON exercise."id" = routine_exercise."exerciseId"
LEFT JOIN "MuscleGroup" AS muscle_group ON muscle_group."id" = exercise."muscleGroupId"
WHERE workout_set."routineExerciseId" = routine_exercise."id";

ALTER TABLE "WorkoutSet"
ALTER COLUMN "exerciseId" SET NOT NULL,
ALTER COLUMN "exerciseName" SET NOT NULL,
ALTER COLUMN "exerciseOrder" SET NOT NULL,
ALTER COLUMN "routineDayOfWeek" SET NOT NULL,
ALTER COLUMN "prescribedSets" SET NOT NULL,
ALTER COLUMN "prescribedReps" SET NOT NULL,
ALTER COLUMN "prescribedRestSeconds" SET NOT NULL;

CREATE INDEX "WorkoutSet_exerciseId_idx" ON "WorkoutSet"("exerciseId");

ALTER TABLE "WorkoutSet"
ADD CONSTRAINT "WorkoutSet_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
