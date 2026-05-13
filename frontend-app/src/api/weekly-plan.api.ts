import { apiClient } from "./client";
import type { ApiSuccess, WeeklyPlan } from "@/types";

type OverrideInput = {
  routineExerciseId: string;
  suggestedWeight?: number | null;
  suggestedReps?: string | null;
  suggestedRpe?: number | null;
  notes?: string | null;
};

type WeekInput = {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
  overrides?: OverrideInput[];
};

export const weeklyPlanApi = {
  get: (studentId: string) =>
    apiClient.get<ApiSuccess<WeeklyPlan | null>>(`/students/${studentId}/weekly-plan`),

  create: (
    studentId: string,
    data: { routineId: string; weeks: WeekInput[]; notes?: string }
  ) => apiClient.post<ApiSuccess<WeeklyPlan>>(`/students/${studentId}/weekly-plan`, data),

  updateWeek: (studentId: string, weekNumber: number, overrides: OverrideInput[]) =>
    apiClient.patch(`/students/${studentId}/weekly-plan/${weekNumber}`, { overrides }),

  copyWeek: (studentId: string, fromWeek: number, toWeek: number) =>
    apiClient.post(`/students/${studentId}/weekly-plan/copy`, { fromWeek, toWeek }),

  setActiveWeek: (studentId: string, weekNumber: number) =>
    apiClient.patch(`/students/${studentId}/active-week`, { weekNumber }),
};
