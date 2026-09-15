CREATE TABLE "WeeklyPlanWeek" (
  "id" TEXT NOT NULL,
  "studentRoutineId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WeeklyPlanWeek_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyPlanWeek_weekNumber_check" CHECK ("weekNumber" BETWEEN 1 AND 52),
  CONSTRAINT "WeeklyPlanWeek_dates_pair_check" CHECK (("startDate" IS NULL) = ("endDate" IS NULL)),
  CONSTRAINT "WeeklyPlanWeek_date_order_check" CHECK ("startDate" IS NULL OR "startDate" <= "endDate")
);

WITH persisted_week_numbers AS (
  SELECT "id" AS "studentRoutineId", "weekNumber"
  FROM "StudentRoutine"
  UNION
  SELECT "studentRoutineId", "weekNumber"
  FROM "WeeklyExerciseOverride"
)
INSERT INTO "WeeklyPlanWeek" (
  "id",
  "studentRoutineId",
  "weekNumber",
  "startDate",
  "endDate",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-week-' || md5(week."studentRoutineId" || ':' || week."weekNumber"::text),
  week."studentRoutineId",
  week."weekNumber",
  CASE WHEN week."weekNumber" = assignment."weekNumber" THEN assignment."startDate" END,
  CASE WHEN week."weekNumber" = assignment."weekNumber" THEN assignment."endDate" END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM persisted_week_numbers AS week
JOIN "StudentRoutine" AS assignment ON assignment."id" = week."studentRoutineId";

CREATE UNIQUE INDEX "WeeklyPlanWeek_studentRoutineId_weekNumber_key"
ON "WeeklyPlanWeek"("studentRoutineId", "weekNumber");

CREATE INDEX "WeeklyPlanWeek_studentRoutineId_idx"
ON "WeeklyPlanWeek"("studentRoutineId");

CREATE INDEX "WeeklyPlanWeek_startDate_endDate_idx"
ON "WeeklyPlanWeek"("startDate", "endDate");

ALTER TABLE "WeeklyPlanWeek"
ADD CONSTRAINT "WeeklyPlanWeek_studentRoutineId_fkey"
FOREIGN KEY ("studentRoutineId") REFERENCES "StudentRoutine"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
