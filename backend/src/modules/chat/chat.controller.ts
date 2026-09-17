import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { ChatService } from "./chat.service";

const sendMessageSchema = z.object({ body: z.string().min(1).max(2000) });
const markReadSchema = z.object({ readBefore: z.string().datetime() });
const createConvSchema = z.object({ studentId: z.string().min(1) });

export class ChatController {
  // ── Trainer ──────────────────────────────────────────────────────────────

  static getConversations = asyncHandler(async (req: Request, res: Response) => {
    const result = await ChatService.getTrainerConversations(req.user!.userId);
    return res.json(successResponse("Conversaciones obtenidas", result));
  });

  static getOrCreateConversation = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = createConvSchema.parse(req.body);
    const result = await ChatService.getOrCreateConversation(req.user!.userId, studentId);
    return res.status(201).json(successResponse("Conversación lista", result));
  });

  // ── Alumno ────────────────────────────────────────────────────────────────

  static getStudentConversation = asyncHandler(async (req: Request, res: Response) => {
    const result = await ChatService.getStudentConversation(req.user!.userId);
    return res.json(successResponse("Conversación obtenida", result));
  });

  // ── Compartidos ───────────────────────────────────────────────────────────

  static getMessages = asyncHandler(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const role = req.user!.role as "TRAINER" | "STUDENT";
    const sinceRaw = typeof req.query.since === "string" ? req.query.since : undefined;
    const since = sinceRaw && !isNaN(new Date(sinceRaw).getTime()) ? sinceRaw : undefined;
    const limitNum = parseInt(req.query.limit as string, 10);
    const limit = !isNaN(limitNum) ? Math.min(limitNum, 100) : 50;

    const result = await ChatService.getMessages(req.user!.userId, role, conversationId, since, limit);
    return res.json(successResponse("Mensajes obtenidos", result));
  });

  static sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const role = req.user!.role as "TRAINER" | "STUDENT";
    const { body } = sendMessageSchema.parse(req.body);

    const result = await ChatService.sendMessage(req.user!.userId, role, conversationId, body);
    return res.status(201).json(successResponse("Mensaje enviado", result));
  });

  static markRead = asyncHandler(async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const role = req.user!.role as "TRAINER" | "STUDENT";
    const { readBefore } = markReadSchema.parse(req.body);

    const result = await ChatService.markRead(req.user!.userId, role, conversationId, readBefore);
    return res.json(successResponse("Mensajes marcados como leídos", result));
  });
}
