import "dotenv/config";
import { validateEnv } from "./config/env";

validateEnv();

import { app } from "./app";
import { startPaymentAlertsJob } from "./infrastructure/jobs/payment-alerts.job";
import { prisma } from "./infrastructure/db/prisma";

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startPaymentAlertsJob();
});

async function shutdown(signal: string) {
  console.log(`[Server] ${signal} recibido — cerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[Server] Conexiones cerradas. Proceso terminado.");
    process.exit(0);
  });

  // Forzar cierre si tarda más de 10s
  setTimeout(() => {
    console.error("[Server] Shutdown forzado por timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
