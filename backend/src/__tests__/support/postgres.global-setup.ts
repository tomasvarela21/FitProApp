import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { assertDisposableTestDatabase } from "./test-database";

const backendRoot = resolve(__dirname, "../../..");

function postgresBinary(name: string): string {
  const executable = process.platform === "win32" ? `${name}.exe` : name;
  const configured = process.env.PG_BIN;
  if (configured) return join(configured, executable);

  if (process.platform === "win32") {
    const root = join(process.env.ProgramFiles ?? "C:\\Program Files", "PostgreSQL");
    if (existsSync(root)) {
      const versions = readdirSync(root).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const version of versions) {
        const candidate = join(root, version, "bin", executable);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  return executable;
}

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No se pudo reservar un puerto local");
  const port = address.port;
  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => error ? reject(error) : resolvePromise());
  });
  return port;
}

export default async function setup() {
  const externalDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (externalDatabaseUrl) {
    assertDisposableTestDatabase(externalDatabaseUrl);
    process.env.DATABASE_URL = externalDatabaseUrl;
    process.env.DIRECT_URL = externalDatabaseUrl;
    const prismaCli = resolve(backendRoot, "node_modules/prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: backendRoot,
      env: process.env,
      stdio: "pipe",
    });
    return;
  }

  const clusterRoot = mkdtempSync(join(tmpdir(), "fitpro-test-postgres-"));
  const dataDirectory = join(clusterRoot, "data");
  const logFile = join(clusterRoot, "postgres.log");
  const port = await availablePort();
  const databaseName = `fitpro_test_${process.pid}`;
  const pgCtl = postgresBinary("pg_ctl");

  try {
    execFileSync(postgresBinary("initdb"), [
      "-D", dataDirectory,
      "-A", "trust",
      "-U", "postgres",
      "--no-locale",
      "--encoding=UTF8",
    ], { stdio: "pipe" });

    execFileSync(pgCtl, [
      "-D", dataDirectory,
      "-l", logFile,
      "-o", `-h 127.0.0.1 -p ${port}`,
      "-w", "start",
    ], { stdio: "ignore" });

    execFileSync(postgresBinary("createdb"), [
      "-h", "127.0.0.1",
      "-p", String(port),
      "-U", "postgres",
      databaseName,
    ], { stdio: "pipe" });

    const databaseUrl = `postgresql://postgres@127.0.0.1:${port}/${databaseName}`;
    assertDisposableTestDatabase(databaseUrl);
    process.env.TEST_DATABASE_URL = databaseUrl;
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = databaseUrl;

    const prismaCli = resolve(backendRoot, "node_modules/prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: backendRoot,
      env: process.env,
      stdio: "pipe",
    });
  } catch (error) {
    try {
      execFileSync(pgCtl, ["-D", dataDirectory, "-m", "immediate", "stop"], { stdio: "ignore" });
    } catch {}
    rmSync(clusterRoot, { recursive: true, force: true });
    throw error;
  }

  return () => {
    try {
      execFileSync(pgCtl, ["-D", dataDirectory, "-m", "fast", "-w", "stop"], { stdio: "ignore" });
    } finally {
      if (dirname(dataDirectory) === clusterRoot && clusterRoot.startsWith(tmpdir())) {
        rmSync(clusterRoot, { recursive: true, force: true });
      }
    }
  };
}
