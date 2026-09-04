import { MessageSenderRole } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTrainer(userId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) throw new AppError("Trainer no encontrado", 404);
  return trainer;
}

async function getStudent(userId: string) {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new AppError("Alumno no encontrado", 404);
  return student;
}

async function assertConversationAccess(
  conversationId: string,
  userId: string,
  role: "TRAINER" | "STUDENT"
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      trainer: { select: { userId: true } },
      student: { select: { userId: true } },
    },
  });
  if (!conv) throw new AppError("Conversación no encontrada", 404);

  const ok =
    (role === "TRAINER" && conv.trainer.userId === userId) ||
    (role === "STUDENT" && conv.student.userId === userId);
  if (!ok) throw new AppError("Sin acceso a esta conversación", 403);
  return conv;
}

function toMessageDto(msg: {
  id: string;
  senderRole: MessageSenderRole;
  senderId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: msg.id,
    senderRole: msg.senderRole,
    senderId: msg.senderId,
    body: msg.body,
    readAt: msg.readAt?.toISOString() ?? null,
    createdAt: msg.createdAt.toISOString(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ChatService {
  // ── Trainer: listar todas las conversaciones ──────────────────────────────
  static async getTrainerConversations(userId: string) {
    const trainer = await getTrainer(userId);

    const convs = await prisma.conversation.findMany({
      where: { trainerId: trainer.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, senderRole: true, createdAt: true },
        },
        _count: {
          select: {
            messages: { where: { senderRole: "STUDENT", readAt: null } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const totalUnread = convs.reduce((acc, c) => acc + c._count.messages, 0);

    return {
      conversations: convs.map((c) => ({
        id: c.id,
        student: c.student,
        lastMessage: c.messages[0]
          ? {
              body: c.messages[0].body,
              senderRole: c.messages[0].senderRole,
              createdAt: c.messages[0].createdAt.toISOString(),
            }
          : null,
        unreadCount: c._count.messages,
        updatedAt: c.updatedAt.toISOString(),
      })),
      totalUnread,
    };
  }

  // ── Trainer: abrir / crear conversación con un alumno ─────────────────────
  static async getOrCreateConversation(trainerUserId: string, studentId: string) {
    const trainer = await getTrainer(trainerUserId);

    const student = await prisma.student.findFirst({
      where: { id: studentId, trainerId: trainer.id, deletedAt: null },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const conv = await prisma.conversation.upsert({
      where: { trainerId_studentId: { trainerId: trainer.id, studentId } },
      create: { trainerId: trainer.id, studentId },
      update: {},
    });

    return { conversationId: conv.id };
  }

  // ── Alumno: obtener su única conversación (crea si no existe) ─────────────
  static async getStudentConversation(userId: string) {
    const student = await getStudent(userId);

    const conv = await prisma.conversation.upsert({
      where: { trainerId_studentId: { trainerId: student.trainerId, studentId: student.id } },
      create: { trainerId: student.trainerId, studentId: student.id },
      update: {},
      include: {
        trainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const unreadCount = await prisma.message.count({
      where: { conversationId: conv.id, senderRole: "TRAINER", readAt: null },
    });

    return {
      conversationId: conv.id,
      trainer: conv.trainer,
      messages: messages.map(toMessageDto),
      unreadCount,
    };
  }

  // ── Mensajes de una conversación (polling con since) ─────────────────────
  static async getMessages(
    userId: string,
    role: "TRAINER" | "STUDENT",
    conversationId: string,
    since?: string,
    limit = 50
  ) {
    await assertConversationAccess(conversationId, userId, role);

    if (!since) {
      const initial = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return {
        messages: initial.reverse().map(toMessageDto),
        hasMore: false,
      };
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gt: new Date(since) },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return {
      messages: messages.map(toMessageDto),
      hasMore: messages.length === limit,
    };
  }

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  static async sendMessage(
    userId: string,
    role: "TRAINER" | "STUDENT",
    conversationId: string,
    body: string
  ) {
    const conv = await assertConversationAccess(conversationId, userId, role);

    let senderId: string;
    if (role === "TRAINER") {
      const trainer = await getTrainer(userId);
      senderId = trainer.id;
    } else {
      const student = await getStudent(userId);
      senderId = student.id;
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderRole: role as MessageSenderRole,
          senderId,
          body,
        },
      }),
      prisma.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return toMessageDto(message);
  }

  // ── Marcar mensajes como leídos ───────────────────────────────────────────
  static async markRead(
    userId: string,
    role: "TRAINER" | "STUDENT",
    conversationId: string,
    readBefore: string
  ) {
    await assertConversationAccess(conversationId, userId, role);

    // El trainer marca como leídos los mensajes del STUDENT, y viceversa
    const oppositeRole: MessageSenderRole = role === "TRAINER" ? "STUDENT" : "TRAINER";

    const { count } = await prisma.message.updateMany({
      where: {
        conversationId,
        senderRole: oppositeRole,
        readAt: null,
        createdAt: { lte: new Date(readBefore) },
      },
      data: { readAt: new Date() },
    });

    return { marked: count };
  }
}
