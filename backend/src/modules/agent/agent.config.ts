import { z } from "zod";

const agentEnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_MODE: z.enum(["polling", "webhook"]).default("polling"),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  PUBLIC_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AGENT_MODEL: z.string().default("gemini-2.5-flash"),
});

export const agentConfig = agentEnvSchema.parse(process.env);

export const isAgentEnabled = () =>
  Boolean(agentConfig.TELEGRAM_BOT_TOKEN && agentConfig.GEMINI_API_KEY);

// El bot setea su username al arrancar (getMe); lo usa el endpoint de vinculación
// para armar el deep link sin crear una dependencia circular con telegram.bot.
let botUsername: string | null = null;

export const setBotUsername = (username: string) => {
  botUsername = username;
};

export const getBotUsername = () => botUsername;
