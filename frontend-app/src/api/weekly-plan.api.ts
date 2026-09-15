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

type SavedWeek = {
  weekNumber: number;
  version: number;
  overrides: WeeklyPlan["weeks"][number]["overrides"];
};

export const weeklyPlanApi = {
  get: (studentId: string) =>
    apiClient.get<ApiSuccess<WeeklyPlan | null>>(`/students/${studentId}/weekly-plan`),

  create: (
    studentId: string,
    data: { routineId: string; weeks: WeekInput[]; notes?: string }
  ) => apiClient.post<ApiSuccess<WeeklyPlan>>(`/students/${studentId}/weekly-plan`, data),

  updateWeek: (
    studentId: string,
    weekNumber: number,
    version: number,
    overrides: OverrideInput[]
  ) => apiClient.patch<ApiSuccess<SavedWeek>>(
    `/students/${studentId}/weekly-plan/${weekNumber}`,
    { version, overrides }
  ),

  copyWeek: (studentId: string, fromWeek: number, toWeek: number, version: number) =>
    apiClient.post<ApiSuccess<SavedWeek>>(
      `/students/${studentId}/weekly-plan/copy`,
      { fromWeek, toWeek, version }
    ),

  setActiveWeek: (studentId: string, weekNumber: number) =>
    apiClient.patch(`/students/${studentId}/active-week`, { weekNumber }),
};
