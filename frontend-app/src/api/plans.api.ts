import { apiClient } from "./client";
import type { ApiSuccess, Plan } from "@/types";

type CreatePlanPayload = {
  name: string;
  description?: string;
  price: number;
  duration: Plan["duration"];
};

type UpdatePlanPayload = Partial<CreatePlanPayload> & {
  isActive?: boolean;
};

export const plansApi = {
  list: () =>
    apiClient.get<ApiSuccess<Plan[]>>("/plans"),

  create: (payload: CreatePlanPayload) =>
    apiClient.post<ApiSuccess<Plan>>("/plans", payload),

  update: (id: string, payload: UpdatePlanPayload) =>
    apiClient.patch<ApiSuccess<Plan>>(`/plans/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<ApiSuccess<{ deleted: boolean }>>(`/plans/${id}`),
};
