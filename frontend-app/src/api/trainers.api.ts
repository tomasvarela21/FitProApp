import { apiClient } from "./client";
import type { ApiSuccess, DashboardSummary } from "@/types";

type TrainerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  createdAt: string;
};

type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type TelegramLinkCode = {
  code: string;
  expiresAt: string;
  botUsername: string | null;
  deepLink: string | null;
};

export type TelegramLinkStatus = {
  linked: boolean;
  linkedAt: string | null;
};

export const trainersApi = {
  getDashboardSummary: () =>
    apiClient.get<ApiSuccess<DashboardSummary>>("/trainers/dashboard-summary"),

  getProfile: () =>
    apiClient.get<ApiSuccess<TrainerProfile>>("/trainers/profile"),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<ApiSuccess<TrainerProfile>>("/trainers/profile", payload),

  generateTelegramLinkCode: () =>
    apiClient.post<ApiSuccess<TelegramLinkCode>>("/trainers/telegram-link-code"),

  getTelegramLinkStatus: () =>
    apiClient.get<ApiSuccess<TelegramLinkStatus>>("/trainers/telegram-link"),

  unlinkTelegram: () =>
    apiClient.delete<ApiSuccess<TelegramLinkStatus>>("/trainers/telegram-link"),
};
