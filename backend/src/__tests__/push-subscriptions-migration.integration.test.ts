import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase7_push_subscription_migration";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260916123000_secure_web_push_subscriptions/migration.sql"
);

describe("migración de destinos Web Push", () => {
  it("aborta ante duplicados sin borrar datos y crea unicidad cuando son válidos", async () => {
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);

    const migration = readFileSync(migrationPath, "utf8");
    const createIndexMarker = 'CREATE UNIQUE INDEX "PushSubscription_endpoint_key"';
    const preflight = migration.slice(0, migration.indexOf(createIndexMarker)).trim();
    const createIndex = migration.slice(migration.indexOf(createIndexMarker)).trim();

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "${TEST_SCHEMA}"."PushSubscription" (
          "id" TEXT PRIMARY KEY,
          "endpoint" TEXT
        )
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "${TEST_SCHEMA}"."PushSubscription" ("id", "endpoint") VALUES
          ('first', 'https://fcm.googleapis.com/fcm/send/duplicate'),
          ('second', 'https://fcm.googleapis.com/fcm/send/duplicate')
      `);

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
          await tx.$executeRawUnsafe(preflight);
        })
      ).rejects.toThrow(/duplicate endpoints/i);

      const preserved = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${TEST_SCHEMA}"."PushSubscription"`
      );
      expect(Number(preserved[0]?.count)).toBe(2);

      await prisma.$executeRawUnsafe(
        `DELETE FROM "${TEST_SCHEMA}"."PushSubscription" WHERE "id" = 'second'`
      );
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
        await tx.$executeRawUnsafe(preflight);
        await tx.$executeRawUnsafe(createIndex);
      });

      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${TEST_SCHEMA}"."PushSubscription" ("id", "endpoint")
          VALUES ('third', 'https://fcm.googleapis.com/fcm/send/duplicate')
        `)
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
