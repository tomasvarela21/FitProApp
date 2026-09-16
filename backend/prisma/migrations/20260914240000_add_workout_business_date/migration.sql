ALTER TABLE "WorkoutLog" ADD COLUMN "businessDate" DATE;

UPDATE "WorkoutLog"
SET "businessDate" = (("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

ALTER TABLE "WorkoutLog" ALTER COLUMN "businessDate" SET NOT NULL;

CREATE INDEX "WorkoutLog_businessDate_idx" ON "WorkoutLog"("businessDate");
