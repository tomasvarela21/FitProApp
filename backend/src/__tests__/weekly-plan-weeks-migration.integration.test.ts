import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase6_week_migration_test";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260914210000_persist_weekly_plan_weeks/migration.sql"
);

const previousSchemaStatements = [
  `CREATE TABLE "StudentRoutine" ("id" TEXT PRIMARY KEY, "weekNumber" INTEGER NOT NULL DEFAULT 1, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3))`,
  `CREATE TABLE "WeeklyExerciseOverride" ("id" TEXT PRIMARY KEY, "studentRoutineId" TEXT NOT NULL, "weekNumber" INTEGER NOT NULL)`,
  `INSERT INTO "StudentRoutine" VALUES ('assignment-dated', 2, '2026-09-21', '2026-09-27')`,
  `INSERT INTO "StudentRoutine" VALUES ('assignment-empty', 1, NULL, NULL)`,
  `INSERT INTO "WeeklyExerciseOverride" VALUES ('override-one', 'assignment-dated', 1)`,
  `INSERT INTO "WeeklyExerciseOverride" VALUES ('override-three', 'assignment-dated', 3)`,
];

describe("migración de semanas persistentes", () => {
  it("conserva números recuperables y asigna fechas solo a la semana activa conocida", async () => {
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
        for (const statement of previousSchemaStatements) {
          await tx.$executeRawUnsafe(statement);
        }
        const statements = readFileSync(migrationPath, "utf8")
          .split(";")
          .map((statement) => statement.trim())
          .filter(Boolean);
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
      });

      const weeks = await prisma.$queryRawUnsafe<Array<{
        studentRoutineId: string;
        weekNumber: number;
        startDate: Date | null;
        endDate: Date | null;
      }>>(`
        SELECT "studentRoutineId", "weekNumber", "startDate", "endDate"
        FROM "${TEST_SCHEMA}"."WeeklyPlanWeek"
        ORDER BY "studentRoutineId", "weekNumber"
      `);

      expect(weeks).toEqual([
        { studentRoutineId: "assignment-dated", weekNumber: 1, startDate: null, endDate: null },
        {
          studentRoutineId: "assignment-dated",
          weekNumber: 2,
          startDate: new Date("2026-09-21T00:00:00.000Z"),
          endDate: new Date("2026-09-27T00:00:00.000Z"),
        },
        { studentRoutineId: "assignment-dated", weekNumber: 3, startDate: null, endDate: null },
        { studentRoutineId: "assignment-empty", weekNumber: 1, startDate: null, endDate: null },
      ]);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
          await tx.$executeRawUnsafe(
            `INSERT INTO "WeeklyPlanWeek" ("id", "studentRoutineId", "weekNumber", "startDate", "updatedAt") VALUES ('invalid-week', 'assignment-empty', 53, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          );
        })
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
