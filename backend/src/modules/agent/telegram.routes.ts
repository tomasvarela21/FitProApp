import { Router } from "express";
import { webhookCallback } from "grammy";
import { agentConfig } from "./agent.config";
import { getBot } from "./telegram.bot";

export const telegramRouter = Router();

// Webhook de Telegram (solo se usa con TELEGRAM_MODE=webhook).
// Doble validación: secret en el path + header X-Telegram-Bot-Api-Secret-Token.
telegramRouter.post("/webhook/:secret", (req, res, next) => {
  const bot = getBot();
  const secret = agentConfig.TELEGRAM_WEBHOOK_SECRET;

  if (!bot || !secret || req.params.secret !== secret) {
    return res.status(401).json({ ok: false });
  }

  return webhookCallback(bot, "express", { secretToken: secret })(req, res).catch(next);
});
