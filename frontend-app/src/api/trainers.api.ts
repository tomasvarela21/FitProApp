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

export const trainersApi = {
  getDashboardSummary: () =>
    apiClient.get<ApiSuccess<DashboardSummary>>("/trainers/dashboard-summary"),

  getProfile: () =>
    apiClient.get<ApiSuccess<TrainerProfile>>("/trainers/profile"),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<ApiSuccess<TrainerProfile>>("/trainers/profile", payload),
};
