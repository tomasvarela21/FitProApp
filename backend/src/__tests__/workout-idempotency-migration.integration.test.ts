import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260914230000_idempotent_workouts_single_active_routine/migration.sql"
);

const baseStatements = [
  `CREATE TABLE "Student" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "Routine" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "StudentRoutine" ("id" TEXT PRIMARY KEY, "studentId" TEXT NOT NULL, "routineId" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true)`,
  `CREATE TABLE "WorkoutLog" ("id" TEXT PRIMARY KEY, "studentRoutineId" TEXT NOT NULL)`,
  `INSERT INTO "Student" VALUES ('student-history')`,
  `INSERT INTO "Routine" VALUES ('routine-a'), ('routine-b')`,
];

function migrationStatements() {
  return readFileSync(migrationPath, "utf8")
    .split(/(?<=END \$\$;)|(?<=;)\s*(?=(?:DO|ALTER|UPDATE|CREATE))/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function createPreviousSchema(schema: string, duplicateActive: boolean) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    for (const statement of baseStatements) await tx.$executeRawUnsafe(statement);
    await tx.$executeRawUnsafe(
      `INSERT INTO "StudentRoutine" VALUES ('assignment-a', 'student-history', 'routine-a', true)`
    );
    if (duplicateActive) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "StudentRoutine" VALUES ('assignment-b', 'student-history', 'routine-b', true)`
      );
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO "WorkoutLog" VALUES ('workout-history', 'assignment-a')`
    );
  });
}

async function applyMigration(schema: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    for (const statement of migrationStatements()) await tx.$executeRawUnsafe(statement);
  });
}

describe("migración de idempotencia y rutina activa única", () => {
  it("recupera el alumno de sesiones históricas y agrega las restricciones", async () => {
    const schema = "phase6_workout_idempotency_migration";
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

    try {
      await createPreviousSchema(schema, false);
      await applyMigration(schema);

      const logs = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT "id", "studentId", "idempotencyKey", "idempotencyHash"
        FROM "${schema}"."WorkoutLog"
      `);
      expect(logs).toEqual([
        {
          id: "workout-history",
          studentId: "student-history",
          idempotencyKey: null,
          idempotencyHash: null,
        },
      ]);

      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}"."StudentRoutine"
            ("id", "studentId", "routineId", "isActive")
          VALUES ('assignment-b', 'student-history', 'routine-b', true)
        `)
      ).rejects.toThrow();

      await prisma.$executeRawUnsafe(`
        UPDATE "${schema}"."WorkoutLog"
        SET "idempotencyKey" = 'same-key', "idempotencyHash" = 'same-hash'
        WHERE "id" = 'workout-history'
      `);
      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${schema}"."WorkoutLog"
            ("id", "studentId", "studentRoutineId", "idempotencyKey", "idempotencyHash")
          VALUES ('workout-duplicate', 'student-history', 'assignment-a', 'same-key', 'same-hash')
        `)
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  });

  it("aborta ante asignaciones activas duplicadas sin modificar el esquema ni los datos", async () => {
    const schema = "phase6_duplicate_active_routine_migration";
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

    try {
      await createPreviousSchema(schema, true);
      await expect(applyMigration(schema)).rejects.toThrow(/duplicate active assignments/);

      const columns = await prisma.$queryRawUnsafe<Array<{ columnName: string }>>(`
        SELECT column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = '${schema}'
          AND table_name = 'WorkoutLog'
        ORDER BY ordinal_position
      `);
      expect(columns.map((column) => column.columnName)).toEqual(["id", "studentRoutineId"]);
      const counts = await prisma.$queryRawUnsafe<Array<{ assignments: bigint; logs: bigint }>>(`
        SELECT
          (SELECT COUNT(*) FROM "${schema}"."StudentRoutine") AS assignments,
          (SELECT COUNT(*) FROM "${schema}"."WorkoutLog") AS logs
      `);
      expect(counts).toEqual([{ assignments: 2n, logs: 1n }]);
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
