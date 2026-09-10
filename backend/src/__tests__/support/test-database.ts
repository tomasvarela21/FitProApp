import type { PrismaClient } from "@prisma/client";

const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function assertDisposableTestDatabase(databaseUrl: string | undefined): URL {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL es obligatoria para las pruebas de integración");
  }

  const url = new URL(databaseUrl);
  const databaseName = url.pathname.slice(1).toLowerCase();

  if (!LOCAL_DATABASE_HOSTS.has(url.hostname)) {
    throw new Error("La base de integración debe ejecutarse en localhost");
  }

  if (!databaseName.includes("test")) {
    throw new Error("El nombre de la base de integración debe contener 'test'");
  }

  return url;
}

export async function resetTestDatabase(prisma: PrismaClient) {
  assertDisposableTestDatabase(process.env.DATABASE_URL);

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const tableNames = tables
    .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    .join(", ");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
}
