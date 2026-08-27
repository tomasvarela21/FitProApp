import { apiClient } from "./client";
import type { ApiSuccess, Routine, StudentRoutine, WorkoutLog } from "@/types";

export const routinesApi = {
  list: () => apiClient.get<ApiSuccess<Routine[]>>("/routines"),
  getOne: (id: string) => apiClient.get<ApiSuccess<Routine>>(`/routines/${id}`),
  create: (data: { name: string; description?: string }) =>
    apiClient.post<ApiSuccess<Routine>>("/routines", data),
  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch<ApiSuccess<Routine>>(`/routines/${id}`, data),
  delete: (id: string) => apiClient.delete(`/routines/${id}`),
  addExercise: (
    routineId: string,
    data: {
      exerciseId: string;
      dayOfWeek: string;
      order: number;
      sets: number;
      reps: string;
      suggestedWeight?: number;
      suggestedRpe?: number;
      restSeconds?: number;
      notes?: string;
    }
  ) => apiClient.post(`/routines/${routineId}/exercises`, data),
  updateExercise: (routineId: string, routineExerciseId: string, data: object) =>
    apiClient.patch(`/routines/${routineId}/exercises/${routineExerciseId}`, data),
  removeExercise: (routineId: string, routineExerciseId: string) =>
    apiClient.delete(`/routines/${routineId}/exercises/${routineExerciseId}`),
  toggleTemplate: (id: string) =>
    apiClient.patch<ApiSuccess<Routine>>(`/routines/${id}/toggle-template`, {}),
  clone: (id: string) =>
    apiClient.post<ApiSuccess<Routine>>(`/routines/${id}/clone`, {}),
  assignToStudent: (studentId: string, data: { routineId: string; notes?: string }) =>
    apiClient.post(`/students/${studentId}/assign-routine`, data),
  getStudentRoutine: (studentId: string) =>
    apiClient.get<ApiSuccess<StudentRoutine | null>>(`/students/${studentId}/active-routine`),
  getStudentWorkoutHistory: (studentId: string) =>
    apiClient.get<ApiSuccess<WorkoutLog[]>>(`/students/${studentId}/workout-history`),
};
