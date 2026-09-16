import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase6_business_date_migration";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260914240000_add_workout_business_date/migration.sql"
);

describe("migración de fechas de negocio", () => {
  it("deriva el día de Buenos Aires sin alterar instantes ni registros históricos", async () => {
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
        await tx.$executeRawUnsafe(
          `CREATE TABLE "WorkoutLog" ("id" TEXT PRIMARY KEY, "date" TIMESTAMP(3) NOT NULL)`
        );
        await tx.$executeRawUnsafe(`
          INSERT INTO "WorkoutLog" VALUES
            ('before-midnight', '2026-03-01 02:59:59.999'),
            ('after-midnight', '2026-03-01 03:00:00.000'),
            ('leap-day', '2024-02-29 15:00:00.000')
        `);
        const statements = readFileSync(migrationPath, "utf8")
          .split(";")
          .map((statement) => statement.trim())
          .filter(Boolean);
        for (const statement of statements) await tx.$executeRawUnsafe(statement);
      });

      const rows = await prisma.$queryRawUnsafe<
        Array<{ id: string; date: Date; businessDate: Date }>
      >(`
        SELECT "id", "date", "businessDate"
        FROM "${TEST_SCHEMA}"."WorkoutLog"
        ORDER BY "id"
      `);
      expect(
        rows.map((row) => ({
          id: row.id,
          instant: row.date.toISOString(),
          businessDate: row.businessDate.toISOString().slice(0, 10),
        }))
      ).toEqual([
        {
          id: "after-midnight",
          instant: "2026-03-01T03:00:00.000Z",
          businessDate: "2026-03-01",
        },
        {
          id: "before-midnight",
          instant: "2026-03-01T02:59:59.999Z",
          businessDate: "2026-02-28",
        },
        {
          id: "leap-day",
          instant: "2024-02-29T15:00:00.000Z",
          businessDate: "2024-02-29",
        },
      ]);

      const metadata = await prisma.$queryRawUnsafe<
        Array<{ nullable: string; dataType: string }>
      >(`
        SELECT is_nullable AS nullable, data_type AS "dataType"
        FROM information_schema.columns
        WHERE table_schema = '${TEST_SCHEMA}'
          AND table_name = 'WorkoutLog'
          AND column_name = 'businessDate'
      `);
      expect(metadata).toEqual([{ nullable: "NO", dataType: "date" }]);
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
