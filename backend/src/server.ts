import "dotenv/config";
import { validateEnv } from "./config/env";

validateEnv();

import { app } from "./app";
import {
  startPaymentAlertsJob,
  stopPaymentAlertsJob,
} from "./infrastructure/jobs/payment-alerts.job";
import { startOutboxWorker, stopOutboxWorker } from "./infrastructure/outbox/outbox.worker";
import { prisma } from "./infrastructure/db/prisma";

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startPaymentAlertsJob();
  startOutboxWorker();
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} recibido — cerrando servidor...`);

  const forceTimer = setTimeout(() => {
    console.error("[Server] Shutdown forzado por timeout");
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  const closeServer = new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    await Promise.all([closeServer, stopPaymentAlertsJob(), stopOutboxWorker()]);
    await prisma.$disconnect();
    clearTimeout(forceTimer);
    console.log("[Server] Conexiones cerradas. Proceso terminado.");
    process.exit(0);
  } catch (error) {
    console.error("[Server] Error durante el shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
