import { Bot, InlineKeyboard, Context } from "grammy";
import { agentConfig, isAgentEnabled, setBotUsername } from "./agent.config";
import { TelegramLinkService } from "./telegram-link.service";
import { runAgentTurn } from "./agent.service";
import { conversationStore } from "./conversation-store";
import { pendingActions, executePendingAction } from "./pending-actions";
import { splitMessage } from "./telegram-format";
import { AppError } from "../../shared/errors/app-error";

let bot: Bot | null = null;

// Cola por chat: evita que dos mensajes rápidos corran turnos en paralelo
// sobre el mismo historial.
const chatQueues = new Map<string, Promise<void>>();

const enqueue = (chatId: string, task: () => Promise<void>) => {
  const prev = chatQueues.get(chatId) ?? Promise.resolve();
  const next = prev.then(task).catch((err) => {
    console.error(`[telegram] Error en turno del chat ${chatId}:`, err);
  });
  chatQueues.set(chatId, next);
  return next;
};

const NOT_LINKED_MESSAGE =
  "Este chat no está vinculado a ninguna cuenta de FitProApp.\n\n" +
  "Para vincularlo:\n" +
  "1. Entrá a tu perfil en la web de FitProApp\n" +
  "2. Generá un código de vinculación de Telegram\n" +
  "3. Mandame: /vincular TUCODIGO";

const HELP_MESSAGE =
  "Soy el asistente de FitProApp 🤖\n\n" +
  "Podés preguntarme cosas como:\n" +
  "- ¿Cómo viene el mes?\n" +
  "- ¿Quién tiene cuotas vencidas?\n" +
  "- Registrale el pago de la cuota a Juan\n" +
  "- Asignale la rutina de fuerza a María\n" +
  "- Creá un alumno nuevo\n\n" +
  "Comandos:\n" +
  "/vincular CODIGO - vincular tu cuenta\n" +
  "/desvincular - desvincular este chat\n" +
  "/nueva - empezar una conversación de cero";

const replyLong = async (ctx: Context, text: string) => {
  for (const chunk of splitMessage(text)) {
    await ctx.reply(chunk);
  }
};

const tryLink = async (ctx: Context, code: string) => {
  try {
    const { trainerName } = await TelegramLinkService.linkChat(
      code,
      BigInt(ctx.chat!.id)
    );
    await ctx.reply(
      `✅ Listo, ${trainerName}. Tu cuenta quedó vinculada.\n\n${HELP_MESSAGE}`
    );
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "No pude vincular el chat";
    await ctx.reply(`⚠️ ${message}`);
  }
};

const sendPendingConfirmation = async (ctx: Context, chatId: string) => {
  const action = pendingActions.get(chatId);
  if (!action) return;

  const keyboard = new InlineKeyboard()
    .text("✅ Confirmar", "confirm")
    .text("❌ Cancelar", "cancel");

  const sent = await ctx.reply(`⚠️ Acción pendiente:\n\n${action.resumen}`, {
    reply_markup: keyboard,
  });
  pendingActions.setMessageId(chatId, sent.message_id);
};

const geminiErrorMessage = (error: any): string => {
  const status = error?.status ?? error?.code;
  const message = String(error?.message ?? "");
  if (status === 429 || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
    return "⏳ Se alcanzó el límite gratuito de consultas por ahora. Probá de nuevo en unos minutos.";
  }
  return "⚠️ Hubo un problema procesando tu mensaje. Probá de nuevo en un rato.";
};

export const startTelegramBot = async () => {
  if (!isAgentEnabled()) {
    console.warn(
      "[telegram] Bot deshabilitado: falta TELEGRAM_BOT_TOKEN o GEMINI_API_KEY"
    );
    return;
  }

  bot = new Bot(agentConfig.TELEGRAM_BOT_TOKEN!);

  const me = await bot.api.getMe();
  setBotUsername(me.username);

  // ── Comandos ──────────────────────────────────────────────────────────────

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim();
    if (payload) {
      await tryLink(ctx, payload);
      return;
    }
    const linked = await TelegramLinkService.getTrainerByChatId(BigInt(ctx.chat.id));
    await ctx.reply(linked ? HELP_MESSAGE : NOT_LINKED_MESSAGE);
  });

  bot.command("vincular", async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) {
      await ctx.reply("Usá: /vincular TUCODIGO (lo generás desde tu perfil en la web)");
      return;
    }
    await tryLink(ctx, code);
  });

  bot.command("desvincular", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const { unlinked } = await TelegramLinkService.unlinkChat(BigInt(ctx.chat.id));
    conversationStore.reset(chatId);
    pendingActions.delete(chatId);
    await ctx.reply(
      unlinked ? "Chat desvinculado. ¡Hasta pronto!" : "Este chat no estaba vinculado."
    );
  });

  bot.command("nueva", async (ctx) => {
    conversationStore.reset(String(ctx.chat.id));
    await ctx.reply("Listo, empezamos de cero. ¿En qué te ayudo?");
  });

  bot.command("ayuda", (ctx) => ctx.reply(HELP_MESSAGE));

  // ── Confirmaciones (botones inline) ───────────────────────────────────────

  bot.callbackQuery("confirm", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const action = pendingActions.get(chatId);

    if (!action) {
      await ctx.answerCallbackQuery({ text: "Esta acción expiró" });
      await ctx.editMessageText("⌛ Esta acción expiró, pedímela de nuevo.");
      return;
    }

    const linked = await TelegramLinkService.getTrainerByChatId(BigInt(ctx.chat!.id));
    if (!linked) {
      await ctx.answerCallbackQuery({ text: "Chat no vinculado" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Ejecutando..." });
    pendingActions.delete(chatId);

    try {
      const result = await executePendingAction(linked.trainerUserId, action);
      await ctx.editMessageText(`✅ ${result}\n\n${action.resumen}`);
      conversationStore.append(chatId, {
        role: "user",
        text: `[El entrenador confirmó la acción "${action.type}". Resultado: ${result}]`,
      });
      conversationStore.append(chatId, { role: "model", text: "Acción confirmada y ejecutada." });
    } catch (error: any) {
      const message =
        error instanceof AppError ? error.message : "Error ejecutando la acción";
      await ctx.editMessageText(`⚠️ No se pudo ejecutar: ${message}\n\n${action.resumen}`);
      conversationStore.append(chatId, {
        role: "user",
        text: `[El entrenador confirmó la acción "${action.type}" pero falló: ${message}]`,
      });
      conversationStore.append(chatId, { role: "model", text: "La acción falló." });
    }
  });

  bot.callbackQuery("cancel", async (ctx) => {
    const chatId = String(ctx.chat!.id);
    const action = pendingActions.get(chatId);
    pendingActions.delete(chatId);
    await ctx.answerCallbackQuery({ text: "Cancelada" });
    await ctx.editMessageText(
      action ? `❌ Acción cancelada:\n\n${action.resumen}` : "❌ Acción cancelada."
    );
    conversationStore.append(chatId, {
      role: "user",
      text: "[El entrenador canceló la acción pendiente]",
    });
    conversationStore.append(chatId, { role: "model", text: "Acción cancelada." });
  });

  // ── Mensajes de texto ─────────────────────────────────────────────────────

  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text;

    const linked = await TelegramLinkService.getTrainerByChatId(BigInt(ctx.chat.id));
    if (!linked) {
      await ctx.reply(NOT_LINKED_MESSAGE);
      return;
    }

    // Un mensaje nuevo invalida cualquier acción pendiente sin resolver
    const stale = pendingActions.get(chatId);
    if (stale) {
      pendingActions.delete(chatId);
      if (stale.messageId) {
        await ctx.api
          .editMessageText(ctx.chat.id, stale.messageId, `⌛ Reemplazada:\n\n${stale.resumen}`)
          .catch(() => {});
      }
    }

    await enqueue(chatId, async () => {
      const typing = setInterval(() => {
        ctx.replyWithChatAction("typing").catch(() => {});
      }, 5000);
      ctx.replyWithChatAction("typing").catch(() => {});

      try {
        const answer = await runAgentTurn(
          linked.trainerUserId,
          chatId,
          linked.trainerName,
          text
        );
        await replyLong(ctx, answer);
        await sendPendingConfirmation(ctx, chatId);
      } catch (error: any) {
        console.error("[telegram] Error en runAgentTurn:", error);
        await ctx.reply(geminiErrorMessage(error));
      } finally {
        clearInterval(typing);
      }
    });
  });

  bot.catch((err) => {
    console.error("[telegram] Error no manejado del bot:", err);
  });

  // ── Arranque: polling (dev) o webhook (producción) ────────────────────────

  if (agentConfig.TELEGRAM_MODE === "webhook") {
    if (!agentConfig.PUBLIC_URL || !agentConfig.TELEGRAM_WEBHOOK_SECRET) {
      console.error(
        "[telegram] Modo webhook requiere PUBLIC_URL y TELEGRAM_WEBHOOK_SECRET; bot no iniciado"
      );
      return;
    }
    await bot.init();
    const url = `${agentConfig.PUBLIC_URL.replace(/\/$/, "")}/api/telegram/webhook/${agentConfig.TELEGRAM_WEBHOOK_SECRET}`;
    await bot.api.setWebhook(url, {
      secret_token: agentConfig.TELEGRAM_WEBHOOK_SECRET,
    });
    console.log(`[telegram] Bot @${me.username} en modo webhook`);
  } else {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
    bot.start().catch((err) => console.error("[telegram] Error en polling:", err));
    console.log(`[telegram] Bot @${me.username} en modo polling`);
  }
};

export const getBot = () => bot;
