import { apiClient } from "./client";
import type { ApiSuccess, Gym } from "@/types";

export const gymsApi = {
  list: () => apiClient.get<ApiSuccess<Gym[]>>("/gyms"),

  create: (data: { name: string; address?: string }) =>
    apiClient.post<ApiSuccess<Gym>>("/gyms", data),

  update: (id: string, data: { name?: string; address?: string | null }) =>
    apiClient.patch<ApiSuccess<Gym>>(`/gyms/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiSuccess<null>>(`/gyms/${id}`),
};
