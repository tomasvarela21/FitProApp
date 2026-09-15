import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase5_snapshot_migration_test";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260914200000_add_historical_snapshots/migration.sql"
);

const previousSchemaStatements = [
  `CREATE TYPE "PlanDuration" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL')`,
  `CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`,
  `CREATE TABLE "Plan" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "duration" "PlanDuration" NOT NULL)`,
  `CREATE TABLE "Subscription" ("id" TEXT PRIMARY KEY, "planId" TEXT NOT NULL, CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT)`,
  `CREATE TABLE "MuscleGroup" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "Exercise" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "muscleGroupId" TEXT NOT NULL)`,
  `CREATE TABLE "Routine" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL)`,
  `CREATE TABLE "RoutineExercise" ("id" TEXT PRIMARY KEY, "routineId" TEXT NOT NULL, "exerciseId" TEXT NOT NULL, "dayOfWeek" "DayOfWeek" NOT NULL, "order" INTEGER NOT NULL, "sets" INTEGER NOT NULL, "reps" TEXT NOT NULL, "suggestedWeight" DOUBLE PRECISION, "suggestedRpe" DOUBLE PRECISION, "restSeconds" INTEGER NOT NULL, "notes" TEXT)`,
  `CREATE TABLE "StudentRoutine" ("id" TEXT PRIMARY KEY, "routineId" TEXT NOT NULL)`,
  `CREATE TABLE "WorkoutLog" ("id" TEXT PRIMARY KEY, "studentRoutineId" TEXT NOT NULL)`,
  `CREATE TABLE "WorkoutSet" ("id" TEXT PRIMARY KEY, "routineExerciseId" TEXT NOT NULL)`,
  `INSERT INTO "Plan" VALUES ('plan-history', 'Plan histórico', 'QUARTERLY')`,
  `INSERT INTO "Subscription" VALUES ('subscription-history', 'plan-history')`,
  `INSERT INTO "MuscleGroup" VALUES ('muscle-history', 'Espalda')`,
  `INSERT INTO "Exercise" VALUES ('exercise-history', 'Remo histórico', 'muscle-history')`,
  `INSERT INTO "Routine" VALUES ('routine-history', 'Rutina histórica')`,
  `INSERT INTO "RoutineExercise" VALUES ('routine-exercise-history', 'routine-history', 'exercise-history', 'MONDAY', 3, 4, '8-10', 45, 8, 120, 'Controlar técnica')`,
  `INSERT INTO "StudentRoutine" VALUES ('student-routine-history', 'routine-history')`,
  `INSERT INTO "WorkoutLog" VALUES ('workout-history', 'student-routine-history')`,
  `INSERT INTO "WorkoutSet" VALUES ('set-history', 'routine-exercise-history')`,
];

describe("migración de snapshots históricos sobre datos poblados", () => {
  it("copia valores verificables y conserva la identidad del ejercicio", async () => {
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

      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT
          subscription."planName",
          subscription."planDuration"::text AS "planDuration",
          log."routineId",
          log."routineName",
          workout_set."exerciseId",
          workout_set."exerciseName",
          workout_set."exerciseOrder",
          workout_set."exerciseMuscleGroupName",
          workout_set."routineDayOfWeek"::text AS "routineDayOfWeek",
          workout_set."prescribedSets",
          workout_set."prescribedReps",
          workout_set."prescribedWeight",
          workout_set."prescribedRpe",
          workout_set."prescribedRestSeconds",
          workout_set."prescribedNotes"
        FROM "${TEST_SCHEMA}"."Subscription" AS subscription
        CROSS JOIN "${TEST_SCHEMA}"."WorkoutLog" AS log
        CROSS JOIN "${TEST_SCHEMA}"."WorkoutSet" AS workout_set
      `);

      expect(rows[0]).toEqual({
        planName: "Plan histórico",
        planDuration: "QUARTERLY",
        routineId: "routine-history",
        routineName: "Rutina histórica",
        exerciseId: "exercise-history",
        exerciseName: "Remo histórico",
        exerciseOrder: 3,
        exerciseMuscleGroupName: "Espalda",
        routineDayOfWeek: "MONDAY",
        prescribedSets: 4,
        prescribedReps: "8-10",
        prescribedWeight: 45,
        prescribedRpe: 8,
        prescribedRestSeconds: 120,
        prescribedNotes: "Controlar técnica",
      });

      const foreignKey = await prisma.$queryRawUnsafe<Array<{ deleteRule: string }>>(`
        SELECT CASE constraint_type.confdeltype WHEN 'r' THEN 'RESTRICT' ELSE constraint_type.confdeltype::text END AS "deleteRule"
        FROM pg_constraint AS constraint_type
        JOIN pg_namespace AS namespace ON namespace.oid = constraint_type.connamespace
        WHERE namespace.nspname = '${TEST_SCHEMA}'
          AND constraint_type.conname = 'WorkoutSet_exerciseId_fkey'
      `);
      expect(foreignKey).toEqual([{ deleteRule: "RESTRICT" }]);
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
