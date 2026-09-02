import { apiClient } from "./client";
import type {
  ApiSuccess,
  ConversationListResponse,
  MessagesResponse,
  ChatMessage,
  StudentConversationResponse,
} from "@/types";

export const chatApi = {
  // Trainer
  getConversations: () =>
    apiClient.get<ApiSuccess<ConversationListResponse>>("/chat/conversations"),

  getOrCreateConversation: (studentId: string) =>
    apiClient.post<ApiSuccess<{ conversationId: string }>>("/chat/conversations", { studentId }),

  // Student
  getMyConversation: () =>
    apiClient.get<ApiSuccess<StudentConversationResponse>>("/chat/my-conversation"),

  // Shared
  getMessages: (conversationId: string, params?: { since?: string; limit?: number }) =>
    apiClient.get<ApiSuccess<MessagesResponse>>(`/chat/conversations/${conversationId}/messages`, {
      params,
    }),

  sendMessage: (conversationId: string, body: string) =>
    apiClient.post<ApiSuccess<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, { body }),

  markRead: (conversationId: string, readBefore: string) =>
    apiClient.post<ApiSuccess<{ marked: number }>>(`/chat/conversations/${conversationId}/read`, {
      readBefore,
    }),
};
