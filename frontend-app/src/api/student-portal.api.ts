import { apiClient } from "./client";
import type { ApiSuccess, StudentProfile, StudentSubscription } from "@/types";

type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export const studentPortalApi = {
  getProfile: () =>
    apiClient.get<ApiSuccess<StudentProfile>>("/student/profile"),

  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<ApiSuccess<StudentProfile>>("/student/profile", payload),

  getSubscription: () =>
    apiClient.get<ApiSuccess<StudentSubscription | null>>(
      "/student/subscription"
    ),
};
