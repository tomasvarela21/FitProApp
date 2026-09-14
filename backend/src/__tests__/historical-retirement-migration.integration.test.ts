import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase5_populated_migration_test";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260914190000_archive_historical_resources/migration.sql"
);

const previousSchemaStatements = [
  `CREATE TABLE "Plan" ("id" TEXT PRIMARY KEY, "isActive" BOOLEAN NOT NULL DEFAULT true)`,
  `CREATE TABLE "Subscription" ("id" TEXT PRIMARY KEY, "planId" TEXT NOT NULL, CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE "Exercise" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "Routine" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "RoutineExercise" ("id" TEXT PRIMARY KEY, "routineId" TEXT NOT NULL, "exerciseId" TEXT NOT NULL, CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE "StudentRoutine" ("id" TEXT PRIMARY KEY, "routineId" TEXT NOT NULL, CONSTRAINT "StudentRoutine_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE "WeeklyExerciseOverride" ("id" TEXT PRIMARY KEY, "routineExerciseId" TEXT NOT NULL, CONSTRAINT "WeeklyExerciseOverride_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE "WorkoutLog" ("id" TEXT PRIMARY KEY, "studentRoutineId" TEXT NOT NULL, CONSTRAINT "WorkoutLog_studentRoutineId_fkey" FOREIGN KEY ("studentRoutineId") REFERENCES "StudentRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE "WorkoutSet" ("id" TEXT PRIMARY KEY, "routineExerciseId" TEXT NOT NULL, CONSTRAINT "WorkoutSet_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `INSERT INTO "Plan" ("id") VALUES ('plan-history')`,
  `INSERT INTO "Subscription" ("id", "planId") VALUES ('subscription-history', 'plan-history')`,
  `INSERT INTO "Exercise" ("id") VALUES ('exercise-history')`,
  `INSERT INTO "Routine" ("id") VALUES ('routine-history')`,
  `INSERT INTO "RoutineExercise" ("id", "routineId", "exerciseId") VALUES ('routine-exercise-history', 'routine-history', 'exercise-history')`,
  `INSERT INTO "StudentRoutine" ("id", "routineId") VALUES ('student-routine-history', 'routine-history')`,
  `INSERT INTO "WeeklyExerciseOverride" ("id", "routineExerciseId") VALUES ('override-history', 'routine-exercise-history')`,
  `INSERT INTO "WorkoutLog" ("id", "studentRoutineId") VALUES ('workout-history', 'student-routine-history')`,
  `INSERT INTO "WorkoutSet" ("id", "routineExerciseId") VALUES ('set-history', 'routine-exercise-history')`,
];

async function expectDeleteRejected(sql: string) {
  await expect(
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
      await tx.$executeRawUnsafe(sql);
    })
  ).rejects.toThrow();
}

describe("migración de archivado sobre datos poblados", () => {
  it("conserva registros y reemplaza cascadas históricas por restricciones", async () => {
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
        for (const statement of previousSchemaStatements) {
          await tx.$executeRawUnsafe(statement);
        }

        const migrationStatements = readFileSync(migrationPath, "utf8")
          .split(";")
          .map((statement) => statement.trim())
          .filter(Boolean);
        for (const statement of migrationStatements) {
          await tx.$executeRawUnsafe(statement);
        }
      });

      const counts = await prisma.$queryRawUnsafe<Array<{
        plans: bigint;
        subscriptions: bigint;
        logs: bigint;
        sets: bigint;
        nullArchives: bigint;
      }>>(`
        SELECT
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Plan") AS plans,
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Subscription") AS subscriptions,
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."WorkoutLog") AS logs,
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."WorkoutSet") AS sets,
          (
            (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Exercise" WHERE "archivedAt" IS NULL) +
            (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Routine" WHERE "archivedAt" IS NULL) +
            (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."RoutineExercise" WHERE "archivedAt" IS NULL)
          ) AS "nullArchives"
      `);

      expect(counts[0]).toEqual({
        plans: 1n,
        subscriptions: 1n,
        logs: 1n,
        sets: 1n,
        nullArchives: 3n,
      });

      await expectDeleteRejected(`DELETE FROM "Plan" WHERE "id" = 'plan-history'`);
      await expectDeleteRejected(`DELETE FROM "Routine" WHERE "id" = 'routine-history'`);
      await expectDeleteRejected(`DELETE FROM "Exercise" WHERE "id" = 'exercise-history'`);
      await expectDeleteRejected(
        `DELETE FROM "RoutineExercise" WHERE "id" = 'routine-exercise-history'`
      );
      await expectDeleteRejected(
        `DELETE FROM "StudentRoutine" WHERE "id" = 'student-routine-history'`
      );
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
