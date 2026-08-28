import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { requireActiveTrial } from "../../shared/middlewares/require-active-trial";
import { ChatController } from "./chat.controller";

export const chatRouter = Router();

const trainerAuth = [requireAuth, requireRole("TRAINER"), requireActiveTrial];
const studentAuth = [requireAuth, requireRole("STUDENT")];

// ── Trainer routes ─────────────────────────────────────────────────────────
chatRouter.get("/conversations", trainerAuth, ChatController.getConversations);
chatRouter.post("/conversations", trainerAuth, ChatController.getOrCreateConversation);

// ── Student routes ─────────────────────────────────────────────────────────
chatRouter.get("/my-conversation", studentAuth, ChatController.getStudentConversation);

// ── Shared (trainer + student) ─────────────────────────────────────────────
chatRouter.get("/conversations/:conversationId/messages", requireAuth, ChatController.getMessages);
chatRouter.post("/conversations/:conversationId/messages", requireAuth, ChatController.sendMessage);
chatRouter.post("/conversations/:conversationId/read", requireAuth, ChatController.markRead);
