DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentRoutine"
    WHERE "isActive" = true
    GROUP BY "studentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one active routine per student: duplicate active assignments exist'
      USING HINT = 'Resolve each duplicate group explicitly before applying this migration; no records were changed.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WorkoutLog" AS workout_log
    LEFT JOIN "StudentRoutine" AS student_routine
      ON student_routine."id" = workout_log."studentRoutineId"
    WHERE student_routine."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill WorkoutLog.studentId from StudentRoutine'
      USING HINT = 'Repair orphan workout logs before applying this migration; no historical value will be invented.';
  END IF;
END $$;

ALTER TABLE "WorkoutLog"
  ADD COLUMN "studentId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "idempotencyHash" TEXT;

UPDATE "WorkoutLog" AS workout_log
SET "studentId" = student_routine."studentId"
FROM "StudentRoutine" AS student_routine
WHERE workout_log."studentRoutineId" = student_routine."id";

ALTER TABLE "WorkoutLog" ALTER COLUMN "studentId" SET NOT NULL;

ALTER TABLE "WorkoutLog"
  ADD CONSTRAINT "WorkoutLog_idempotency_pair_check"
  CHECK (
    ("idempotencyKey" IS NULL AND "idempotencyHash" IS NULL)
    OR ("idempotencyKey" IS NOT NULL AND "idempotencyHash" IS NOT NULL)
  );

ALTER TABLE "WorkoutLog"
  ADD CONSTRAINT "WorkoutLog_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "WorkoutLog_studentId_idx" ON "WorkoutLog"("studentId");

CREATE UNIQUE INDEX "WorkoutLog_student_idempotency_key"
ON "WorkoutLog"("studentId", "idempotencyKey")
WHERE "idempotencyKey" IS NOT NULL;

CREATE UNIQUE INDEX "StudentRoutine_one_active_per_student_key"
ON "StudentRoutine"("studentId")
WHERE "isActive" = true;
