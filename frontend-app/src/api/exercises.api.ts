import { apiClient } from "./client";
import type { ApiSuccess, Exercise, MuscleGroup, Equipment } from "@/types";

export const exercisesApi = {
  list: (params?: { muscleGroupId?: string; difficulty?: string; search?: string }) =>
    apiClient.get<ApiSuccess<Exercise[]>>("/exercises", { params }),
  getOne: (id: string) => apiClient.get<ApiSuccess<Exercise>>(`/exercises/${id}`),
  create: (data: Partial<Exercise>) => apiClient.post<ApiSuccess<Exercise>>("/exercises", data),
  update: (id: string, data: Partial<Exercise>) =>
    apiClient.patch<ApiSuccess<Exercise>>(`/exercises/${id}`, data),
  delete: (id: string) => apiClient.delete(`/exercises/${id}`),
  getMuscleGroups: () => apiClient.get<ApiSuccess<MuscleGroup[]>>("/exercises/muscle-groups"),
  getEquipment: () => apiClient.get<ApiSuccess<Equipment[]>>("/exercises/equipment"),
};
