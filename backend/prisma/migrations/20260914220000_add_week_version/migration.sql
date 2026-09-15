ALTER TABLE "WeeklyPlanWeek"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "WeeklyPlanWeek"
ADD CONSTRAINT "WeeklyPlanWeek_version_check" CHECK ("version" > 0);
