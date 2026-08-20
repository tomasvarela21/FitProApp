import "dotenv/config";
import { app } from "./app";
import { startPaymentAlertsJob } from "./infrastructure/jobs/payment-alerts.job";
import { startTelegramBot } from "./modules/agent/telegram.bot";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startPaymentAlertsJob();
  startTelegramBot().catch((err) =>
    console.error("[telegram] Error iniciando el bot:", err)
  );
});
