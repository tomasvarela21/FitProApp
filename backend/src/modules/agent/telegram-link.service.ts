import crypto from "crypto";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { getBotUsername } from "./agent.config";

const CODE_TTL_MS = 10 * 60 * 1000;
// Sin caracteres ambiguos (0/O, 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const generateCode = () => {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
};

export class TelegramLinkService {
  private static async getTrainer(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }
    return trainer;
  }

  static async generateLinkCode(trainerUserId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    await prisma.telegramLinkCode.deleteMany({
      where: { trainerId: trainer.id, usedAt: null },
    });

    const created = await prisma.telegramLinkCode.create({
      data: {
        trainerId: trainer.id,
        code: generateCode(),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    const botUsername = getBotUsername();

    return {
      code: created.code,
      expiresAt: created.expiresAt,
      botUsername,
      deepLink: botUsername
        ? `https://t.me/${botUsername}?start=${created.code}`
        : null,
    };
  }

  static async getLinkStatus(trainerUserId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    const link = await prisma.telegramLink.findUnique({
      where: { trainerId: trainer.id },
    });

    return {
      linked: Boolean(link),
      linkedAt: link?.createdAt ?? null,
    };
  }

  static async unlink(trainerUserId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    await prisma.telegramLink.deleteMany({
      where: { trainerId: trainer.id },
    });

    return { linked: false };
  }

  /**
   * Vincula un chat de Telegram usando un código generado desde la web.
   * Reemplaza cualquier vínculo previo del chat o del trainer.
   */
  static async linkChat(code: string, chatId: bigint) {
    const linkCode = await prisma.telegramLinkCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { trainer: true },
    });

    if (!linkCode || linkCode.usedAt) {
      throw new AppError("Código inválido", 400);
    }
    if (linkCode.expiresAt < new Date()) {
      throw new AppError("El código expiró, generá uno nuevo desde la web", 400);
    }

    await prisma.$transaction([
      prisma.telegramLinkCode.update({
        where: { id: linkCode.id },
        data: { usedAt: new Date() },
      }),
      prisma.telegramLink.deleteMany({
        where: { OR: [{ chatId }, { trainerId: linkCode.trainerId }] },
      }),
      prisma.telegramLink.create({
        data: { trainerId: linkCode.trainerId, chatId },
      }),
    ]);

    return { trainerName: `${linkCode.trainer.firstName} ${linkCode.trainer.lastName}` };
  }

  static async unlinkChat(chatId: bigint) {
    const result = await prisma.telegramLink.deleteMany({ where: { chatId } });
    return { unlinked: result.count > 0 };
  }

  /**
   * Resuelve el trainer dueño de un chat de Telegram.
   * Devuelve null si el chat no está vinculado.
   */
  static async getTrainerByChatId(chatId: bigint) {
    const link = await prisma.telegramLink.findUnique({
      where: { chatId },
      include: { trainer: true },
    });

    if (!link) return null;

    return {
      trainerUserId: link.trainer.userId,
      trainerName: `${link.trainer.firstName} ${link.trainer.lastName}`,
    };
  }
}
