import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase8_query_indexes_migration";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260916180000_add_query_indexes/migration.sql"
);

function migrationStatements() {
  return readFileSync(migrationPath, "utf8")
    .split(/;\s*/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

describe("migración de índices de consultas", () => {
  it("conserva registros y crea todos los índices compuestos", async () => {
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
        await tx.$executeRawUnsafe(`
          CREATE TABLE "Student" (
            "id" TEXT PRIMARY KEY,
            "trainerId" TEXT NOT NULL,
            "gymId" TEXT,
            "status" TEXT NOT NULL,
            "deletedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL
          )
        `);
        await tx.$executeRawUnsafe(`
          CREATE TABLE "Subscription" (
            "id" TEXT PRIMARY KEY,
            "trainerId" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "endDate" TIMESTAMP(3) NOT NULL
          )
        `);
        await tx.$executeRawUnsafe(`
          CREATE TABLE "Installment" (
            "id" TEXT PRIMARY KEY,
            "subscriptionId" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "dueDate" TIMESTAMP(3) NOT NULL,
            "number" INTEGER NOT NULL
          )
        `);
        await tx.$executeRawUnsafe(`
          INSERT INTO "Student" VALUES
            ('student', 'trainer', 'gym', 'ACTIVE', NULL, '2026-01-01')
        `);
        await tx.$executeRawUnsafe(`
          INSERT INTO "Subscription" VALUES
            ('subscription', 'trainer', 'ACTIVE', '2026-12-31')
        `);
        await tx.$executeRawUnsafe(`
          INSERT INTO "Installment" VALUES
            ('installment', 'subscription', 'PENDING', '2026-10-01', 1)
        `);
        for (const statement of migrationStatements()) {
          await tx.$executeRawUnsafe(statement);
        }
      });

      const counts = await prisma.$queryRawUnsafe<Array<{ students: bigint; subscriptions: bigint; installments: bigint }>>(`
        SELECT
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Student") AS students,
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Subscription") AS subscriptions,
          (SELECT COUNT(*) FROM "${TEST_SCHEMA}"."Installment") AS installments
      `);
      expect(counts).toEqual([{ students: 1n, subscriptions: 1n, installments: 1n }]);

      const indexes = await prisma.$queryRawUnsafe<Array<{ indexName: string }>>(`
        SELECT indexname AS "indexName"
        FROM pg_indexes
        WHERE schemaname = '${TEST_SCHEMA}'
          AND indexname LIKE '%_idx'
        ORDER BY indexname
      `);
      expect(indexes.map((index) => index.indexName)).toEqual([
        "Installment_subscriptionId_status_dueDate_idx",
        "Installment_subscriptionId_status_number_idx",
        "Student_trainerId_deletedAt_status_createdAt_idx",
        "Student_trainerId_gymId_idx",
        "Subscription_trainerId_status_endDate_idx",
      ]);
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
