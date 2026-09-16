import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { assertDisposableTestDatabase } from "./support/test-database";

const TEST_SCHEMA = "phase7_notification_outbox_migration";
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260916150000_add_notification_outbox/migration.sql"
);

function migrationStatements() {
  return readFileSync(migrationPath, "utf8")
    .split(/;\s*(?=(?:CREATE|$))/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => `${statement};`);
}

describe("migración de outbox de notificaciones", () => {
  it("es aditiva sobre datos existentes y aplica idempotencia e integridad", async () => {
    assertDisposableTestDatabase(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${TEST_SCHEMA}"`);
        await tx.$executeRawUnsafe(`CREATE TABLE "ExistingRecord" ("id" TEXT PRIMARY KEY)`);
        await tx.$executeRawUnsafe(`INSERT INTO "ExistingRecord" ("id") VALUES ('preserved')`);
        for (const statement of migrationStatements()) {
          await tx.$executeRawUnsafe(statement);
        }
      });

      const preserved = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT "id" FROM "${TEST_SCHEMA}"."ExistingRecord"`
      );
      expect(preserved).toEqual([{ id: "preserved" }]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${TEST_SCHEMA}"."NotificationOutbox"
          ("id", "idempotencyKey", "channel", "payloadEncrypted")
        VALUES ('first', 'same-event', 'EMAIL', 'encrypted')
      `);
      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${TEST_SCHEMA}"."NotificationOutbox"
            ("id", "idempotencyKey", "channel", "payloadEncrypted")
          VALUES ('duplicate', 'same-event', 'PUSH', 'encrypted')
        `)
      ).rejects.toThrow();
      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO "${TEST_SCHEMA}"."NotificationOutbox"
            ("id", "idempotencyKey", "channel", "payloadEncrypted", "attempts")
          VALUES ('invalid-attempts', 'invalid-event', 'PUSH', 'encrypted', -1)
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
